import { getApiUrl, hasSupabase } from './supabase';
import { useAuthStore } from '../store/authStore';

interface RegisterData {
  name?: string;
  email: string;
  password: string;
  role: 'user' | 'issuer' | 'verifier';
  organization_name?: string;
}

interface LoginData {
  email: string;
  password: string;
}

export const authService = {
  async register(data: RegisterData) {
    if (!hasSupabase) throw new Error('Supabase configured');
    const response = await fetch(getApiUrl('/auth/register'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Registration failed');
    }

    if (result.token && result.user) {
      useAuthStore.getState().login(result.user, result.token, result.user.did);
    }

    return result;
  },

  async login(data: LoginData) {
    if (!hasSupabase) throw new Error('Supabase configured');
    const response = await fetch(getApiUrl('/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Login failed');
    }

    if (result.token && result.user) {
      useAuthStore.getState().login(result.user, result.token, result.user?.did);
    }

    return result;
  },

  async getProfile(token: string) {
    if (!hasSupabase) throw new Error('Supabase configured');
    const response = await fetch(getApiUrl('/auth/me'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to get profile');
    }

    return result;
  },

  async logout(token: string) {
    if (!hasSupabase) throw new Error('Supabase configured');
    try {
      await fetch(getApiUrl('/auth/logout'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    useAuthStore.getState().logout();
  },
};
