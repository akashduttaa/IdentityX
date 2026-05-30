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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
        userId = payload.userId as string;
      } catch (e) {
        // Continue without auth
      }
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    const proofId = url.searchParams.get('id');

    // GET /proofs/mine - Get user's proof history
    if (req.method === 'GET' && path === 'mine') {
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: proofs, error } = await supabase
        .from('proofs')
        .select(`
          *,
          credential:credentials(credential_type, status)
        `)
        .eq('holder_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        proofs
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /proofs/:id - Get specific proof
    if (req.method === 'GET' && proofId) {
      const { data: proof, error } = await supabase
        .from('proofs')
        .select(`
          *,
          credential:credentials(credential_type, claims, status)
        `)
        .eq('id', proofId)
        .single();

      if (error || !proof) {
        return new Response(JSON.stringify({ error: 'Proof not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check access
      if (proof.holder_id !== userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        proof
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /proofs/generate - Generate/store proof
    if (req.method === 'POST' && path === 'generate') {
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const body = await req.json();
      const { credential_id, claim_type, zk_proof, public_signals, verifier_address } = body;

      if (!claim_type || !zk_proof) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get user's DID
      const { data: userDid } = await supabase
        .from('dids')
        .select('did_string')
        .eq('user_id', userId)
        .single();

      if (!userDid) {
        return new Response(JSON.stringify({ error: 'DID not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Generate proof hash
      const proofData = JSON.stringify({ zk_proof, public_signals, created_at: new Date().toISOString() });
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes(proofData));

      // Verify the proof (simplified verification)
      const verified = await verifyZKProof(zk_proof, public_signals, claim_type);

      // Calculate AI anomaly score
      const aiAnomalyScore = await calculateAnomalyScore(userId, claim_type, verifier_address);

      // Create proof record
      const { data: proof, error } = await supabase
        .from('proofs')
        .insert({
          holder_id: userId,
          holder_did: userDid.did_string,
          verifier_address,
          credential_id,
          claim_type,
          zk_proof,
          public_signals,
          proof_hash: proofHash,
          verified,
          verification_result: verified ? 'valid' : 'invalid',
          verified_at: new Date().toISOString(),
          ai_anomaly_score: aiAnomalyScore
        })
        .select()
        .single();

      if (error) throw error;

      // Log verification
      await supabase.from('verification_logs').insert({
        proof_id: proof.id,
        verifier_address: verifier_address || 'anonymous',
        holder_did: userDid.did_string,
        claim_type,
        result: verified ? 'valid' : 'invalid',
        anomaly_score: aiAnomalyScore
      });

      // Check for anomalies
      if (aiAnomalyScore > 70) {
        await supabase.from('anomaly_logs').insert({
          user_id: userId,
          type: 'rapid_verification',
          severity: aiAnomalyScore > 90 ? 'critical' : 'high',
          details: { claim_type, verifier_address, score: aiAnomalyScore }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        proof,
        verified,
        ai_anomaly_score: aiAnomalyScore
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /proofs/verify - Verify submitted proof
    if (req.method === 'POST' && path === 'verify') {
      const body = await req.json();
      const { zk_proof, public_signals, claim_type } = body;

      if (!zk_proof || !public_signals || !claim_type) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const verified = await verifyZKProof(zk_proof, public_signals, claim_type);

      // Create verification receipt
      const receipt = {
        verified,
        verification_result: verified ? 'valid' : 'invalid',
        claim_type,
        timestamp: new Date().toISOString(),
        verification_id: crypto.randomUUID()
      };

      return new Response(JSON.stringify({
        success: true,
        ...receipt
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /proofs/claim-types - Get available claim types for ZKP
    if (req.method === 'GET' && path === 'claim-types') {
      return new Response(JSON.stringify({
        success: true,
        claim_types: [
          { value: 'age_18', label: 'Age ≥ 18', description: 'Prove you are 18 or older without revealing birth date' },
          { value: 'age_21', label: 'Age ≥ 21', description: 'Prove you are 21 or older' },
          { value: 'kyc_complete', label: 'KYC Complete', description: 'Prove KYC verification passed' },
          { value: 'degree_verified', label: 'Degree Verified', description: 'Prove university degree authenticity' },
          { value: 'employment_verified', label: 'Employment Verified', description: 'Prove employment status' },
          { value: 'residency_verified', label: 'Residency Verified', description: 'Prove residency country' }
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
    console.error('Proofs error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function verifyZKProof(proof: any, publicSignals: any[], claimType: string): Promise<boolean> {
  // Simplified ZKP verification
  // In production, use snarkjs.groth16.verify

  if (!proof || !publicSignals || !Array.isArray(publicSignals)) {
    return false;
  }

  // Check proof structure
  if (!proof.pi_a || !proof.pi_b || !proof.pi_c) {
    return false;
  }

  // Validate public signals
  const validSignals = publicSignals.length >= 1;

  return validSignals;
}

async function calculateAnomalyScore(userId: string, claimType: string, verifierAddress?: string): Promise<number> {
  // Check recent verification activity
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from('proofs')
    .select('*', { count: 'exact', head: true })
    .eq('holder_id', userId)
    .gte('created_at', oneHourAgo);

  let score = 0;

  // Rapid verification check
  if (count && count > 10) {
    score += 50;
  } else if (count && count > 5) {
    score += 20;
  }

  // Suspicious timing
  const hour = new Date().getHours();
  if (hour >= 2 && hour <= 5) {
    score += 15;
  }

  // Random factor for demo
  score += Math.floor(Math.random() * 20);

  return Math.min(score, 100);
}
