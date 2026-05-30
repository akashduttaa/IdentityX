import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { ethers } from 'npm:ethers@6.9';
import { SignJWT, jwtVerify } from 'npm:jose@5.2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface User {
  id: string;
  email: string;
  password?: string;
  role: string;
  name?: string;
  organization_name?: string;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const jwtSecret = Deno.env.get('JWT_SECRET') || 'identitychain_jwt_secret_key_2024';

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    if (req.method === 'POST' && path === 'register') {
      const body: User = await req.json();
      const { email, password, role, name, organization_name } = body;

      if (!email || !password || !role) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Create auth user with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
          data: { role }
        }
      });

      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const userId = authData.user!.id;

      // Generate Ethereum wallet
      const wallet = ethers.Wallet.createRandom();
      const walletAddress = wallet.address;
      const publicKey = wallet.signingKey.publicKey;
      const encryptedPrivateKey = await encryptPrivateKey(wallet.privateKey, password);

      // Generate DID
      const didString = `did:ethr:${walletAddress}`;

      // Create user profile
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          role,
          name,
          organization_name,
          wallet_address: walletAddress,
          encrypted_private_key: encryptedPrivateKey
        });

      if (userError) {
        console.error('User insert error:', userError);
      }

      // Create DID record
      const didDocument = generateDIDDocument(didString, publicKey);
      const { data: didData, error: didError } = await supabase
        .from('dids')
        .insert({
          user_id: userId,
          did_string: didString,
          did_document: didDocument,
          public_key: publicKey,
          wallet_address: walletAddress
        })
        .select()
        .single();

      // If issuer, create issuer record
      if (role === 'issuer') {
        await supabase
          .from('issuers')
          .insert({
            user_id: userId,
            issuer_did: didString,
            issuer_name: organization_name || name || 'Unknown Issuer',
            issuer_type: 'other',
            public_key: publicKey
          });
      }

      // Generate JWT token
      const token = await new SignJWT({ userId, email, role, walletAddress })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(new TextEncoder().encode(jwtSecret));

      return new Response(JSON.stringify({
        success: true,
        user: {
          id: userId,
          email,
          role,
          name,
          walletAddress,
          did: didData
        },
        token,
        message: 'Registration successful'
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'POST' && path === 'login') {
      const { email, password } = await req.json();

      // Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !authData.user) {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const userId = authData.user.id;

      // Get user profile
      const { data: user } = await supabase
        .from('users')
        .select('*, did:dids(*)')
        .eq('id', userId)
        .single();

      if (user) {
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', userId);
      }

      const token = await new SignJWT({
        userId,
        email: user?.email,
        role: user?.role,
        walletAddress: user?.wallet_address
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(new TextEncoder().encode(jwtSecret));

      return new Response(JSON.stringify({
        success: true,
        user,
        token,
        session: authData.session
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'GET' && path === 'me') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.substring(7);

      try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
        const userId = payload.userId as string;

        const { data: user } = await supabase
          .from('users')
          .select('*, did:dids(*)')
          .eq('id', userId)
          .single();

        return new Response(JSON.stringify({
          success: true,
          user
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (req.method === 'POST' && path === 'logout') {
      const authHeader = req.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
          await supabase.auth.admin.signOut(payload.userId as string);
        } catch (e) {
          // Ignore errors
        }
      }

      return new Response(JSON.stringify({ success: true, message: 'Logged out' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Auth error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function encryptPrivateKey(privateKey: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(privateKey)
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

function generateDIDDocument(did: string, publicKey: string) {
  return {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/secp256k1-2019/v1'
    ],
    id: did,
    verificationMethod: [{
      id: `${did}#keys-1`,
      type: 'EcdsaSecp256k1VerificationKey2019',
      controller: did,
      publicKeyBase58: publicKey
    }],
    authentication: [`${did}#keys-1`],
    assertionMethod: [`${did}#keys-1`]
  };
}
