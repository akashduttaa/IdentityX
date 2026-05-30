# IdentityChain

IdentityChain is a self-sovereign identity (SSI) reference implementation that demonstrates
Decentralized Identifiers (DIDs), Verifiable Credentials, and Zero-Knowledge Proofs (ZKPs)
integrated with a Supabase backend and smart contracts on Polygon (Mumbai).

## Highlights

- Decentralized Identifiers (DIDs) stored via `DIDRegistry` smart contract
- Verifiable credentials issuance and revocation via `CredentialRegistry`
- Groth16-compatible ZKP verification via `ZKPVerifier` (contract + snarkjs)
- Frontend: React + Vite + TailwindCSS (interactive UI, charts, 3D visuals)
- Backend: Supabase Edge Functions (Deno) + PostgreSQL with Row Level Security (RLS)

## Repo structure (important parts)

- `src/` – React frontend
- `src/lib/supabase.ts` – Supabase client and env checks
- `src/hooks/useBlockchain.ts` – contract addresses, wallet helpers
- `abis/` – compiled contract ABIs used by the frontend
- `blockchain/` – Hardhat config, contracts and deployment scripts
- `supabase/functions/` – Edge Functions (server-side logic)
- `supabase/migrations/` – DB schema migrations

## Prerequisites

- Node.js 18+ and npm
- A Supabase project (for backend and Edge Functions)
- (Optional) `supabase` CLI for deploying functions and migrations
- An Ethereum wallet (MetaMask) configured for Polygon Mumbai
- To deploy contracts: a Polygon RPC URL and a deployer private key with test MATIC

## Environment variables

Create a `.env` file in the project root with at least the following entries used by the frontend:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_DID_REGISTRY_ADDRESS=0x... (optional for local dev)
VITE_CREDENTIAL_REGISTRY_ADDRESS=0x...
VITE_ZKP_VERIFIER_ADDRESS=0x...
```

For contract deployment (in `blockchain/`) set:

```bash
export POLYGON_MUMBAI_RPC_URL="https://..."
export DEPLOYER_PRIVATE_KEY="0xyourprivatekey"
```

Note: Windows PowerShell users can set env vars with `$env:POLYGON_MUMBAI_RPC_URL="..."`.

## Getting started (development)

1. Install frontend dependencies

```bash
npm install
```

2. Start the dev server

```bash
npm run dev
```

3. Useful scripts

- `npm run dev` — Start Vite dev server
- `npm run build` — Build production assets
- `npm run preview` — Preview production build locally
- `npm run lint` — Run ESLint
- `npm run typecheck` — Run TypeScript type checks

## Deploying smart contracts (Hardhat)

The `blockchain/` folder contains `hardhat.config.ts` and deployment scripts.

If you don't already have a package.json in `blockchain/`, run the following once:

```bash
cd blockchain
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox ethers
```

Then compile and deploy to Mumbai:

```bash
npx hardhat compile
npx hardhat run scripts/deploy.ts --network mumbai
```

Set `POLYGON_MUMBAI_RPC_URL` and `DEPLOYER_PRIVATE_KEY` in your environment before running the deploy command.

After deployment, copy the deployed contract addresses into your root `.env` as:

```
VITE_DID_REGISTRY_ADDRESS=0x...
VITE_CREDENTIAL_REGISTRY_ADDRESS=0x...
VITE_ZKP_VERIFIER_ADDRESS=0x...
```

## Supabase Edge Functions & database

- The Edge Functions are located under `supabase/functions/`. They are written for Deno and the Supabase Functions runtime.
- Use the `supabase` CLI to deploy functions and run migrations. Example:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy auth --project <project-ref>
supabase db push  # or use your preferred migration workflow
```

Check `supabase/migrations/` for the current schema SQL.

## Notes on running locally

- If Supabase env vars are not set, the frontend will still run and show a helpful message (see `src/lib/supabase.ts`).
- `useBlockchain()` will fall back to mock behavior if no contract addresses or wallet are available — useful for development and demos.

## Contributing

- Please open issues or pull requests for features and fixes.
- Run linting and type checks before submitting: `npm run lint && npm run typecheck`.

## License

MIT

---
If you'd like, I can also add example `.env.example` and a short CONTRIBUTING.md. Want me to add those files now?
