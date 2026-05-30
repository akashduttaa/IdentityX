import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { ethers } from 'npm:ethers@6.9';
import { jwtVerify } from 'npm:jose@5.2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const jwtSecret = Deno.env.get('JWT_SECRET') || 'identitychain_jwt_secret_key_2024';

interface Credential {
  holder_did: string;
  credential_type: string;
  claims: Record<string, any>;
  expires_at?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    let userRole: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
        userId = payload.userId as string;
        userRole = payload.role as string;
      } catch (e) {
        // Continue without auth
      }
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    const credentialId = url.searchParams.get('id');

    // GET /credentials/mine - Get user's credentials
    if (req.method === 'GET' && path === 'mine') {
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: credentials, error } = await supabase
        .from('credentials')
        .select(`
          *,
          issuer:issuers(issuer_name, issuer_did, issuer_type),
          holder:users!credentials_holder_id_fkey(name, email)
        `)
        .eq('holder_id', userId)
        .order('issued_at', { ascending: false });

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify({
        success: true,
        credentials
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /credentials/issued - Get credentials issued by issuer
    if (req.method === 'GET' && path === 'issued') {
      if (!userId || userRole !== 'issuer') {
        return new Response(JSON.stringify({ error: 'Unauthorized - Issuer only' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: issuer } = await supabase
        .from('issuers')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!issuer) {
        return new Response(JSON.stringify({ error: 'Issuer not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: credentials, error } = await supabase
        .from('credentials')
        .select(`
          *,
          holder:users!credentials_holder_id_fkey(name, email, wallet_address)
        `)
        .eq('issuer_id', issuer.id)
        .order('issued_at', { ascending: false });

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify({
        success: true,
        credentials
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /credentials/:id - Get specific credential
    if (req.method === 'GET' && credentialId) {
      const { data: credential, error } = await supabase
        .from('credentials')
        .select(`
          *,
          issuer:issuers(issuer_name, issuer_did, issuer_type),
          holder:users!credentials_holder_id_fkey(name, email)
        `)
        .eq('id', credentialId)
        .single();

      if (error || !credential) {
        return new Response(JSON.stringify({ error: 'Credential not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check access
      if (credential.holder_id !== userId) {
        const { data: issuer } = await supabase
          .from('issuers')
          .select('user_id')
          .eq('id', credential.issuer_id)
          .single();

        if (!issuer || issuer.user_id !== userId) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        credential
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /credentials/issue - Issue new credential
    if (req.method === 'POST' && path === 'issue') {
      if (!userId || userRole !== 'issuer') {
        return new Response(JSON.stringify({ error: 'Unauthorized - Issuer only' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const body: Credential = await req.json();
      const { holder_did, credential_type, claims, expires_at } = body;

      if (!holder_did || !credential_type || !claims) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get issuer info
      const { data: issuer } = await supabase
        .from('issuers')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!issuer) {
        return new Response(JSON.stringify({ error: 'Issuer profile not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get holder info
      const { data: holderDid } = await supabase
        .from('dids')
        .select('user_id')
        .eq('did_string', holder_did)
        .single();

      if (!holderDid) {
        return new Response(JSON.stringify({ error: 'Holder DID not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Generate credential hash
      const credentialData = JSON.stringify({
        issuer_did: issuer.issuer_did,
        holder_did,
        credential_type,
        claims,
        issued_at: new Date().toISOString()
      });
      const credentialHash = ethers.keccak256(ethers.toUtf8Bytes(credentialData));

      // Create signature (simplified - in production, use secure key management)
      const issuerSignature = `sig_${issuer.issuer_did}_${Date.now()}`;

      // Create credential
      const { data: credential, error } = await supabase
        .from('credentials')
        .insert({
          issuer_id: issuer.id,
          issuer_did: issuer.issuer_did,
          holder_id: holderDid.user_id,
          holder_did,
          credential_type,
          claims,
          schema_hash: ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(claims))),
          issuer_signature: issuerSignature,
          credential_hash: credentialHash,
          expires_at: expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          ai_trust_score: await calculateAITrustScore(credential_type, claims)
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify({
        success: true,
        credential,
        message: 'Credential issued successfully'
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /credentials/revoke - Revoke credential
    if (req.method === 'POST' && path === 'revoke') {
      if (!userId || userRole !== 'issuer') {
        return new Response(JSON.stringify({ error: 'Unauthorized - Issuer only' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { credential_id, reason } = await req.json();

      if (!credential_id) {
        return new Response(JSON.stringify({ error: 'Missing credential_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get issuer
      const { data: issuer } = await supabase
        .from('issuers')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!issuer) {
        return new Response(JSON.stringify({ error: 'Issuer not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Update credential
      const { data: credential, error } = await supabase
        .from('credentials')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revocation_reason: reason
        })
        .eq('id', credential_id)
        .eq('issuer_id', issuer.id)
        .select()
        .single();

      if (error || !credential) {
        return new Response(JSON.stringify({ error: 'Failed to revoke credential' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        credential,
        message: 'Credential revoked successfully'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /credentials/types - Get available credential types
    if (req.method === 'GET' && path === 'types') {
      return new Response(JSON.stringify({
        success: true,
        types: [
          { value: 'AgeVerification', label: 'Age Verification', description: 'Verify age without revealing DOB' },
          { value: 'KYC', label: 'Know Your Customer', description: 'Identity verification for financial services' },
          { value: 'UniversityDegree', label: 'University Degree', description: 'Academic credential verification' },
          { value: 'Employment', label: 'Employment Verification', description: 'Employment status and history' },
          { value: 'AddressProof', label: 'Address Proof', description: 'Residential address verification' },
          { value: 'CustomClaim', label: 'Custom Claim', description: 'Custom verifiable claim' }
        ]
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
    console.error('Credentials error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function calculateAITrustScore(credentialType: string, claims: Record<string, any>): Promise<number> {
  // Simulated AI trust score calculation
  let score = 50;

  if (credentialType === 'KYC' && claims.verified === true) score += 20;
  if (credentialType === 'UniversityDegree' && claims.degree) score += 15;
  if (claims.expiry && new Date(claims.expiry) > new Date()) score += 10;
  if (claims.verification_level) score += Math.min(claims.verification_level * 5, 20);

  return Math.min(score, 100);
}
