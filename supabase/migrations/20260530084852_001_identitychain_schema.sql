/*
  # IdentityChain Database Schema
  
  1. New Tables
    - `users` - Extended user profiles with role and wallet info
    - `dids` - Decentralized Identifiers anchored on blockchain
    - `issuers` - Trusted credential issuers (universities, banks, etc.)
    - `credentials` - Verifiable Credentials with ZKP support
    - `proofs` - Zero-Knowledge Proof verification records
    - `verification_logs` - Audit trail of all verifications
    - `anomaly_logs` - AI-detected security anomalies
  
  2. Security
    - RLS enabled on all tables
    - Users can only access their own data
    - Issuers can access credentials they issued
    - Verifiers can only verify, not read sensitive data
  
  3. Relationships
    - users -> dids (one-to-one)
    - issuers -> credentials (one-to-many)
    - users -> credentials (one-to-many as holder)
    - credentials -> proofs (one-to-many)
*/

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'issuer', 'verifier', 'admin')),
  organization_name text,
  wallet_address text,
  encrypted_private_key text,
  is_active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- DIDs table (Decentralized Identifiers)
CREATE TABLE IF NOT EXISTS dids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  did_string text UNIQUE NOT NULL,
  did_document jsonb NOT NULL DEFAULT '{}',
  public_key text NOT NULL,
  wallet_address text NOT NULL,
  blockchain_tx_hash text,
  block_number bigint,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deactivated')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE dids ENABLE ROW LEVEL SECURITY;

-- DIDs policies
CREATE POLICY "Users can read own DID"
  ON dids FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own DID"
  ON dids FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own DID"
  ON dids FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Issuers table (Trusted credential issuers)
CREATE TABLE IF NOT EXISTS issuers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issuer_did text UNIQUE NOT NULL,
  issuer_name text NOT NULL,
  issuer_type text NOT NULL CHECK (issuer_type IN ('university', 'bank', 'government', 'employer', 'other')),
  verification_level integer DEFAULT 1 CHECK (verification_level BETWEEN 1 AND 5),
  public_key text NOT NULL,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE issuers ENABLE ROW LEVEL SECURITY;

-- Issuers policies
CREATE POLICY "Issuers can read own data"
  ON issuers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can read verified issuers"
  ON issuers FOR SELECT
  TO authenticated
  USING (is_verified = true);

CREATE POLICY "Issuers can insert own data"
  ON issuers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Credentials table (Verifiable Credentials)
CREATE TABLE IF NOT EXISTS credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  issuer_id uuid NOT NULL REFERENCES issuers(id) ON DELETE RESTRICT,
  issuer_did text NOT NULL,
  holder_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  holder_did text NOT NULL,
  credential_type text NOT NULL CHECK (credential_type IN (
    'AgeVerification', 
    'KYC', 
    'UniversityDegree', 
    'Employment', 
    'AddressProof', 
    'CustomClaim'
  )),
  claims jsonb NOT NULL DEFAULT '{}',
  encrypted_claims text,
  schema_hash text,
  issuer_signature text NOT NULL,
  credential_hash text NOT NULL,
  ipfs_hash text,
  blockchain_tx_hash text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  issued_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  ai_trust_score integer DEFAULT 50 CHECK (ai_trust_score BETWEEN 0 AND 100),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

-- Credentials policies
CREATE POLICY "Holders can read own credentials"
  ON credentials FOR SELECT
  TO authenticated
  USING (holder_id = auth.uid());

CREATE POLICY "Issuers can read credentials they issued"
  ON credentials FOR SELECT
  TO authenticated
  USING (issuer_id IN (SELECT id FROM issuers WHERE user_id = auth.uid()));

CREATE POLICY "Issuers can insert credentials"
  ON credentials FOR INSERT
  TO authenticated
  WITH CHECK (issuer_id IN (SELECT id FROM issuers WHERE user_id = auth.uid()));

CREATE POLICY "Issuers can update credentials they issued"
  ON credentials FOR UPDATE
  TO authenticated
  USING (issuer_id IN (SELECT id FROM issuers WHERE user_id = auth.uid()))
  WITH CHECK (issuer_id IN (SELECT id FROM issuers WHERE user_id = auth.uid()));

-- Proofs table (ZK Proof records)
CREATE TABLE IF NOT EXISTS proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  holder_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  holder_did text NOT NULL,
  verifier_address text,
  credential_id uuid REFERENCES credentials(id) ON DELETE SET NULL,
  claim_type text NOT NULL,
  zk_proof jsonb NOT NULL DEFAULT '{}',
  public_signals jsonb NOT NULL DEFAULT '[]',
  proof_hash text NOT NULL,
  blockchain_tx_hash text,
  verified boolean DEFAULT false,
  verification_result text CHECK (verification_result IN ('valid', 'invalid', 'expired', 'error')),
  verified_at timestamptz,
  ai_anomaly_score integer DEFAULT 0 CHECK (ai_anomaly_score BETWEEN 0 AND 100),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE proofs ENABLE ROW LEVEL SECURITY;

-- Proofs policies
CREATE POLICY "Users can read own proofs"
  ON proofs FOR SELECT
  TO authenticated
  USING (holder_id = auth.uid());

CREATE POLICY "Users can insert own proofs"
  ON proofs FOR INSERT
  TO authenticated
  WITH CHECK (holder_id = auth.uid());

CREATE POLICY "Users can update own proofs"
  ON proofs FOR UPDATE
  TO authenticated
  USING (holder_id = auth.uid())
  WITH CHECK (holder_id = auth.uid());

-- Verification Logs table
CREATE TABLE IF NOT EXISTS verification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id uuid REFERENCES proofs(id) ON DELETE SET NULL,
  verifier_address text NOT NULL,
  holder_did text NOT NULL,
  claim_type text NOT NULL,
  result text NOT NULL,
  ip_address text,
  user_agent text,
  anomaly_score integer DEFAULT 0,
  timestamp timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;

-- Verification logs policies
CREATE POLICY "Users can read logs involving them"
  ON verification_logs FOR SELECT
  TO authenticated
  USING (
    holder_did IN (SELECT did_string FROM dids WHERE user_id = auth.uid())
    OR verifier_address IN (SELECT wallet_address FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Anyone authenticated can insert logs"
  ON verification_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Anomaly Logs table
CREATE TABLE IF NOT EXISTS anomaly_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN (
    'credential_abuse',
    'rapid_verification',
    'unusual_ip',
    'bot_pattern',
    'suspicious_timing'
  )),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details jsonb DEFAULT '{}',
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id),
  timestamp timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE anomaly_logs ENABLE ROW LEVEL SECURITY;

-- Anomaly logs policies
CREATE POLICY "Users can read own anomaly logs"
  ON anomaly_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all anomaly logs"
  ON anomaly_logs FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "System can insert anomaly logs"
  ON anomaly_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update anomaly logs"
  ON anomaly_logs FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_dids_user_id ON dids(user_id);
CREATE INDEX IF NOT EXISTS idx_dids_did_string ON dids(did_string);
CREATE INDEX IF NOT EXISTS idx_credentials_holder_id ON credentials(holder_id);
CREATE INDEX IF NOT EXISTS idx_credentials_issuer_id ON credentials(issuer_id);
CREATE INDEX IF NOT EXISTS idx_credentials_status ON credentials(status);
CREATE INDEX IF NOT EXISTS idx_proofs_holder_id ON proofs(holder_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_timestamp ON verification_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_logs_timestamp ON anomaly_logs(timestamp DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dids_updated_at
  BEFORE UPDATE ON dids
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
