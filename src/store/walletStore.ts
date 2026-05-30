import { create } from 'zustand';

interface Credential {
  id: string;
  credential_id: string;
  credential_type: string;
  issuer_did: string;
  holder_did: string;
  issuer?: {
    issuer_name: string;
    issuer_did: string;
    issuer_type: string;
  };
  status: 'active' | 'expired' | 'revoked';
  issued_at: string;
  expires_at?: string;
  claims: Record<string, any>;
  ai_trust_score: number;
  credential_hash: string;
  issuer_signature: string;
}

interface Proof {
  id: string;
  proof_id: string;
  claim_type: string;
  zk_proof: any;
  public_signals: any[];
  verified: boolean;
  verification_result: string;
  ai_anomaly_score: number;
  created_at: string;
  verified_at?: string;
}

interface WalletState {
  did: any | null;
  credentials: Credential[];
  proofs: Proof[];
  isLoading: boolean;
  setDid: (did: any | null) => void;
  setCredentials: (credentials: Credential[]) => void;
  addCredential: (credential: Credential) => void;
  updateCredential: (id: string, updates: Partial<Credential>) => void;
  setProofs: (proofs: Proof[]) => void;
  addProof: (proof: Proof) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  did: null,
  credentials: [],
  proofs: [],
  isLoading: false,
  setDid: (did) => set({ did }),
  setCredentials: (credentials) => set({ credentials }),
  addCredential: (credential) =>
    set((state) => ({
      credentials: [credential, ...state.credentials],
    })),
  updateCredential: (id, updates) =>
    set((state) => ({
      credentials: state.credentials.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),
  setProofs: (proofs) => set({ proofs }),
  addProof: (proof) =>
    set((state) => ({
      proofs: [proof, ...state.proofs],
    })),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () =>
    set({
      did: null,
      credentials: [],
      proofs: [],
      isLoading: false,
    }),
}));
