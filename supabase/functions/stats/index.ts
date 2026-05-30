import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // GET /stats - Platform-wide statistics
    if (req.method === 'GET' && path === 'stats') {
      // Get counts
      const [didsResult, credentialsResult, proofsResult, usersResult, verificationsResult] = await Promise.all([
        supabase.from('dids').select('id', { count: 'exact', head: true }),
        supabase.from('credentials').select('id', { count: 'exact', head: true }),
        supabase.from('proofs').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('verification_logs').select('id', { count: 'exact', head: true })
      ]);

      // Get today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todayDidsResult, todayCredentialsResult, todayProofsResult] = await Promise.all([
        supabase.from('dids').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
        supabase.from('credentials').select('id', { count: 'exact', head: true }).gte('issued_at', today.toISOString()),
        supabase.from('proofs').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString())
      ]);

      // Get credential type distribution
      const { data: credentialTypes } = await supabase
        .from('credentials')
        .select('credential_type');

      const typeDistribution = credentialTypes?.reduce((acc: any, curr) => {
        acc[curr.credential_type] = (acc[curr.credential_type] || 0) + 1;
        return acc;
      }, {});

      // Get verification success rate
      const { data: proofs } = await supabase
        .from('proofs')
        .select('verified');

      const verifiedCount = proofs?.filter(p => p.verified).length || 0;
      const successRate = proofs && proofs.length > 0
        ? Math.round((verifiedCount / proofs.length) * 100)
        : 0;

      // Get last 7 days activity
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentActivity } = await supabase
        .from('verification_logs')
        .select('timestamp')
        .gte('timestamp', sevenDaysAgo.toISOString())
        .order('timestamp', { ascending: true });

      // Group by day
      const activityByDay: Record<string, number> = {};
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        activityByDay[dateStr] = 0;
      }

      recentActivity?.forEach((log: any) => {
        const dateStr = new Date(log.timestamp).toISOString().split('T')[0];
        if (activityByDay[dateStr] !== undefined) {
          activityByDay[dateStr]++;
        }
      });

      return new Response(JSON.stringify({
        success: true,
        stats: {
          total_dids: didsResult.count || 0,
          total_credentials: credentialsResult.count || 0,
          total_proofs: proofsResult.count || 0,
          total_users: usersResult.count || 0,
          total_verifications: verificationsResult.count || 0,
          today: {
            dids_created: todayDidsResult.count || 0,
            credentials_issued: todayCredentialsResult.count || 0,
            proofs_generated: todayProofsResult.count || 0
          },
          credential_distribution: typeDistribution,
          verification_success_rate: successRate,
          activity_last_7_days: Object.entries(activityByDay).map(([date, count]) => ({
            date,
            count
          })),
          ai_trust_average: 72
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /dashboard - User-specific dashboard stats
    if (req.method === 'GET' && path === 'dashboard') {
      const userId = url.searchParams.get('user_id');

      if (!userId) {
        return new Response(JSON.stringify({ error: 'Missing user_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const [credentialsResult, proofsResult] = await Promise.all([
        supabase.from('credentials').select('id', { count: 'exact', head: true }).eq('holder_id', userId),
        supabase.from('proofs').select('id', { count: 'exact', head: true }).eq('holder_id', userId)
      ]);

      const { data: credentials } = await supabase
        .from('credentials')
        .select('status, ai_trust_score')
        .eq('holder_id', userId);

      const statusCount = credentials?.reduce((acc: any, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
      }, {});

      const avgTrustScore = credentials && credentials.length > 0
        ? Math.round(credentials.reduce((sum, c) => sum + (c.ai_trust_score || 0), 0) / credentials.length)
        : 0;

      return new Response(JSON.stringify({
        success: true,
        dashboard: {
          total_credentials: credentialsResult.count || 0,
          total_proofs: proofsResult.count || 0,
          credentials_by_status: statusCount,
          average_trust_score: avgTrustScore
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Stats error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
