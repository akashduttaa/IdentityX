import { getApiUrl } from './supabase';

export const statsService = {
  async getPlatformStats() {
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
