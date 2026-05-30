import { getApiUrl, hasSupabase } from './supabase';

export const statsService = {
  async getPlatformStats() {
    if (!hasSupabase) return { stats: { total_dids: 0, total_credentials: 0, total_verifications: 0 } } as any;
    const response = await fetch(getApiUrl('/stats/stats'), {
      method: 'GET',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to get stats');
    }

    return result.stats;
  },

  async getDashboardStats(userId: string) {
    if (!hasSupabase) return { dashboard: {} } as any;
    const response = await fetch(getApiUrl(`/stats/dashboard?user_id=${userId}`), {
      method: 'GET',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to get dashboard stats');
    }

    return result.dashboard;
  },
};
