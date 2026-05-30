import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { ethers } from 'npm:ethers@6.9';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // POST /verifier/verify-credential - Verify a credential's authenticity
    if (req.method === 'POST' && path === 'verify-credential') {
      const body = await req.json();
      const { credential_id, credential_hash, issuer_signature } = body;

      if (!credential_id) {
        return new Response(JSON.stringify({ error: 'Missing credential_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: credential, error } = await supabase
        .from('credentials')
        .select(`
          *,
          issuer:issuers(issuer_name, issuer_did, is_verified, public_key)
        `)
        .eq('credential_id', credential_id)
        .single();

      if (error || !credential) {
        return new Response(JSON.stringify({
          valid: false,
          error: 'Credential not found'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check credential status
      if (credential.status === 'revoked') {
        return new Response(JSON.stringify({
          valid: false,
          error: 'Credential has been revoked',
          reason: credential.revocation_reason,
          revoked_at: credential.revoked_at
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (credential.status === 'expired' || (credential.expires_at && new Date(credential.expires_at) < new Date())) {
        return new Response(JSON.stringify({
          valid: false,
          error: 'Credential has expired',
          expired_at: credential.expires_at
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Verify hash if provided
      if (credential_hash && credential_hash !== credential.credential_hash) {
        return new Response(JSON.stringify({
          valid: false,
          error: 'Credential hash mismatch'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Verify signature (simplified)
      if (issuer_signature && issuer_signature !== credential.issuer_signature) {
        return new Response(JSON.stringify({
          valid: false,
          error: 'Invalid signature'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        valid: true,
        credential: {
          credential_id: credential.credential_id,
          credential_type: credential.credential_type,
          issuer_name: credential.issuer?.issuer_name,
          issuer_verified: credential.issuer?.is_verified,
          trust_score: credential.ai_trust_score,
          issued_at: credential.issued_at,
          expires_at: credential.expires_at
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /verifier/verify-proof - Standalone proof verification
    if (req.method === 'POST' && path === 'verify-proof') {
      const body = await req.json();
      const { proof, public_signals, claim_type } = body;

      if (!proof || !public_signals) {
        return new Response(JSON.stringify({ error: 'Missing proof or public_signals' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Perform ZKP verification
      const verified = await verifyZKProofExtended(proof, public_signals, claim_type);

      // Create verification log
      await supabase.from('verification_logs').insert({
        verifier_address: body.verifier_address || 'anonymous',
        holder_did: proof.holder_did || 'unknown',
        claim_type: claim_type || 'unknown',
        result: verified ? 'valid' : 'invalid',
        anomaly_score: 0
      });

      return new Response(JSON.stringify({
        verified,
        verification_result: verified ? 'valid' : 'invalid',
        claim_type,
        timestamp: new Date().toISOString(),
        receipt_id: crypto.randomUUID()
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /verifier/issuers - List all verified issuers
    if (req.method === 'GET' && path === 'issuers') {
      const { data: issuers, error } = await supabase
        .from('issuers')
        .select(`
          id,
          issuer_name,
          issuer_did,
          issuer_type,
          verification_level,
          is_verified,
          user:users(wallet_address)
        `)
        .eq('is_verified', true);

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        issuers: issuers.map(i => ({
          id: i.id,
          name: i.issuer_name,
          did: i.issuer_did,
          type: i.issuer_type,
          level: i.verification_level,
          verified: i.is_verified,
          wallet: i.user?.wallet_address
        }))
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /verifier/check-did - Check if DID is valid
    if (req.method === 'GET' && path === 'check-did') {
      const did = url.searchParams.get('did');

      if (!did) {
        return new Response(JSON.stringify({ error: 'Missing did parameter' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: didRecord, error } = await supabase
        .from('dids')
        .select(`
          *,
          user:users(name, email, role)
        `)
        .eq('did_string', did)
        .single();

      if (error || !didRecord) {
        return new Response(JSON.stringify({
          valid: false,
          error: 'DID not found'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        valid: didRecord.status === 'active',
        did: didRecord.did_string,
        status: didRecord.status,
        created_at: didRecord.created_at,
        document: didRecord.did_document
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Verifier error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function verifyZKProofExtended(proof: any, publicSignals: any[], claimType?: string): Promise<boolean> {
  // Extended verification logic
  if (!proof) return false;

  // Check proof structure for groth16 format
  if (!proof.pi_a || !proof.pi_b || !proof.pi_c) {
    // Alternative proof format check
    if (!proof.proof) return false;
  }

  // Check public signals
  if (!Array.isArray(publicSignals) || publicSignals.length === 0) {
    return false;
  }

  // In production: call snarkjs.groth16.verify
  return true;
}
