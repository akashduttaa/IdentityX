import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Warn instead of throwing so the app can render and show a helpful message.
  // Users should set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in a .env file.
  // See README.md for example entries.
  // eslint-disable-next-line no-console
  console.warn('Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase: any = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const hasSupabase = Boolean(supabaseUrl && supabaseAnonKey);

export const getApiUrl = (path: string) => {
  if (!supabaseUrl) return `/functions/v1${path}`;
  return `${supabaseUrl}/functions/v1${path}`;
};
