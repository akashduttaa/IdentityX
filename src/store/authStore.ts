import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name?: string;
  role: 'user' | 'issuer' | 'verifier' | 'admin';
  wallet_address?: string;
  organization_name?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  did: any | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setDid: (did: any | null) => void;
  login: (user: User, token: string, did?: any) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      did: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setDid: (did) => set({ did }),
      login: (user, token, did) =>
        set({
          user,
          token,
          did,
          isAuthenticated: true,
          isLoading: false,
        }),
      logout: () =>
        set({
          user: null,
          token: null,
          did: null,
          isAuthenticated: false,
          isLoading: false,
        }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'identitychain-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
