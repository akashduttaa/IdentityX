import { getApiUrl, hasSupabase } from './supabase';
import { useWalletStore } from '../store/walletStore';

interface GenerateProofData {
  credential_id?: string;
  claim_type: string;
  zk_proof: any;
  public_signals: any[];
  verifier_address?: string;
}

interface VerifyProofData {
  zk_proof: any;
  public_signals: any[];
  claim_type: string;
}

export const proofService = {
  async getMyProofs(token: string) {
    if (!hasSupabase) throw new Error('Supabase configured');
    const response = await fetch(getApiUrl('/proofs/mine'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to get proofs');
    }

    useWalletStore.getState().setProofs(result.proofs);
    return result.proofs;
  },

  async getProof(token: string, proofId: string) {
    if (!hasSupabase) throw new Error('Supabase configured');
    const response = await fetch(getApiUrl(`/proofs?id=${proofId}`), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to get proof');
    }

    return result.proof;
  },

  async generateProof(token: string, data: GenerateProofData) {
    if (!hasSupabase) throw new Error('Supabase configured');
    const response = await fetch(getApiUrl('/proofs/generate'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to generate proof');
    }

    useWalletStore.getState().addProof(result.proof);
    return result;
  },

  async verifyProof(data: VerifyProofData) {
    if (!hasSupabase) throw new Error('Supabase configured');
    const response = await fetch(getApiUrl('/proofs/verify'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Verification failed');
    }

    return result;
  },

  async getClaimTypes() {
    if (!hasSupabase) throw new Error('Supabase configured');
    const response = await fetch(getApiUrl('/proofs/claim-types'), {
      method: 'GET',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to get claim types');
    }

    return result.claim_types;
  },
};
