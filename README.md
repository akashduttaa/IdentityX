# IdentityChain

Self-Sovereign Identity platform with Zero-Knowledge Proofs on Polygon.

## Features

- **Decentralized Identifiers (DIDs)** - Create and manage DIDs anchored on Polygon blockchain
- **Verifiable Credentials** - Issue, hold, and verify credentials from trusted issuers
- **Zero-Knowledge Proofs** - Prove claims without revealing sensitive data
- **AI Trust Scoring** - Machine learning detects anomalies and scores trustworthiness
- **IPFS Storage** - Decentralized storage for credential data

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, Three.js, Framer Motion
- **Backend**: Supabase Edge Functions (Deno), Express-like API
- **Database**: Supabase (PostgreSQL with RLS)
- **Blockchain**: Solidity, Hardhat, Polygon Mumbai testnet
- **Cryptography**: snarkjs, ethers.js, jose

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_DID_REGISTRY_ADDRESS=deployed_contract_address
VITE_CREDENTIAL_REGISTRY_ADDRESS=deployed_contract_address
VITE_ZKP_VERIFIER_ADDRESS=deployed_contract_address
```

### 3. Run Development Server

```bash
npm run dev
```

### 4. Deploy Smart Contracts

```bash
cd blockchain
npm install
npx hardhat compile
npx hardhat run scripts/deploy.ts --network mumbai
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user, create DID
- `POST /auth/login` - Login with email/password
- `GET /auth/me` - Get current user profile
- `POST /auth/logout` - Logout

### Credentials
- `GET /credentials/mine` - Get user's credentials
- `GET /credentials/issued` - Get issued credentials (issuer)
- `POST /credentials/issue` - Issue new credential
- `POST /credentials/revoke` - Revoke credential

### Proofs
- `GET /proofs/mine` - Get user's proofs
- `POST /proofs/generate` - Generate and store proof
- `POST /proofs/verify` - Verify submitted proof

### Stats
- `GET /stats/stats` - Platform-wide statistics
- `GET /stats/dashboard` - User dashboard stats

### Verifier
- `POST /verifier/verify-credential` - Verify credential authenticity
- `POST /verifier/verify-proof` - Verify ZK proof
- `GET /verifier/issuers` - List verified issuers

## Smart Contracts

### DIDRegistry
- Register and manage DIDs
- Update public keys
- Resolve DIDs

### CredentialRegistry
- Register verified issuers
- Issue credentials
- Revoke credentials
- Verify credentials

### ZKPVerifier
- Verify Groth16 ZK proofs
- Store verification records

## Architecture

```
[React Frontend]
       |
       v
[Supabase Edge Functions]
       |
    +--+--+
    |     |
    v     v
[PostgreSQL] [Polygon RPC]
    |           |
    v           v
[RLS Policies] [Smart Contracts]
```

## Security

- Row Level Security (RLS) on all tables
- JWT-based authentication
- AES encryption for private keys
- Zero-knowledge proofs for privacy
- AI-powered anomaly detection

## Demo

1. Register as a user or issuer
2. Your DID is automatically generated
3. Issuers can issue credentials
4. Users can generate ZK proofs
5. Verifiers can verify proofs

## Team

Built by **Team DevOrbit** for Hackathon 2024

## License

MIT
