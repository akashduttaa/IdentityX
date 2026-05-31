import { getApiUrl, hasSupabase } from './supabase';
import { useAuthStore } from '../store/authStore';
import { useWalletStore } from '../store/walletStore';

interface IssueCredentialData {
  holder_did: string;
  credential_type: string;
  claims: Record<string, any>;
  expires_at?: string;
}

export const credentialService = {
  async getMyCredentials(token: string) {
    if (!hasSupabase) throw new Error('Supabase configured');
    const response = await fetch(getApiUrl('/credentials/mine'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to get credentials');
    }

    useWalletStore.getState().setCredentials(result.credentials);
    return result.credentials;
  },

  async getIssuedCredentials(token: string) {
    if (!hasSupabase) throw new Error('Supabase configured');
    const response = await fetch(getApiUrl('/credentials/issued'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to get issued credentials');
    }

    return result.credentials;
  },

  async getCredential(token: string, credentialId: string) {
    if (!hasSupabase) throw new Error('Supabase configured');
    const response = await fetch(getApiUrl(`/credentials?id=${credentialId}`), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to get credential');
    }

    return result.credential;
  },

  async issueCredential(token: string, data: IssueCredentialData) {
    if (!hasSupabase) throw new Error('Supabase configured');
    const response = await fetch(getApiUrl('/credentials/issue'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to issue credential');
    }

    return result.credential;
  },

  async revokeCredential(token: string, credentialId: string, reason?: string) {
    if (!hasSupabase) throw new Error('Supabase configured');
    const response = await fetch(getApiUrl('/credentials/revoke'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credential_id: credentialId,
        reason,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to revoke credential');
    }

    return result.credential;
  },

  async getCredentialTypes(token?: string) {
    if (!hasSupabase) throw new Error('Supabase configured');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(getApiUrl('/credentials/types'), {
      method: 'GET',
      headers,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to get credential types');
    }

    return result.types;
  },
};
