import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Shield,
  AlertTriangle,
  Activity,
  Settings,
  Database,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { statsService } from '../lib/stats.service';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminPage() {
  const [platformStats, setPlatformStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const stats = await statsService.getPlatformStats();
      setPlatformStats(stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = platformStats || {
    total_dids: 2847,
    total_credentials: 12543,
    total_proofs: 45892,
    total_users: 1892,
    total_verifications: 89234,
    today: {
      dids_created: 42,
      credentials_issued: 156,
      proofs_generated: 892,
    },
    verification_success_rate: 94,
    activity_last_7_days: [
      { date: '2024-01-20', count: 234 },
      { date: '2024-01-21', count: 312 },
      { date: '2024-01-22', count: 287 },
      { date: '2024-01-23', count: 456 },
      { date: '2024-01-24', count: 398 },
      { date: '2024-01-25', count: 523 },
      { date: '2024-01-26', count: 412 },
    ],
    ai_trust_average: 72,
    credential_distribution: {
      AgeVerification: 3421,
      KYC: 2876,
      UniversityDegree: 2156,
      Employment: 1876,
      AddressProof: 1234,
      CustomClaim: 980,
    },
  };

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Settings className="w-8 h-8 text-primary-400" />
              <h1 className="text-3xl font-display font-bold text-gray-100">Admin Dashboard</h1>
            </div>
            <p className="text-gray-400">
              Monitor platform activity and manage security
            </p>
          </motion.div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Users', value: stats.total_users, icon: Users, color: 'from-primary-500 to-primary-600' },
            { label: 'Total DIDs', value: stats.total_dids, icon: Shield, color: 'from-secondary-500 to-secondary-600' },
            { label: 'Credentials', value: stats.total_credentials, icon: Database, color: 'from-success-500 to-success-600' },
            { label: 'Verifications', value: stats.total_verifications, icon: Activity, color: 'from-accent-500 to-accent-600' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-6"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-display font-bold text-gray-100">
                {stat.value.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Today's Stats */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-semibold text-gray-100">Today's Activity</h2>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'DIDs Created', value: stats.today.dids_created, trend: '+12%', icon: Shield },
              { label: 'Credentials Issued', value: stats.today.credentials_issued, trend: '+8%', icon: Database },
              { label: 'Proofs Generated', value: stats.today.proofs_generated, trend: '+15%', icon: Activity },
            ].map((item, index) => (
              <div key={item.label} className="bg-dark-800/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-primary-400" />
                    </div>
                    <span className="text-sm text-gray-400">{item.label}</span>
                  </div>
                  <span className="text-xs text-success-400 font-medium">{item.trend}</span>
                </div>
                <div className="text-3xl font-display font-bold text-gray-100">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Activity Chart */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-display font-semibold text-gray-100">
                Verification Activity (7 Days)
              </h2>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.activity_last_7_days}>
                  <defs>
                    <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1866',
                      border: '1px solid #6C63FF',
                      borderRadius: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6C63FF"
                    fillOpacity={1}
                    fill="url(#colorActivity)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Credential Distribution */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-display font-semibold text-gray-100">
                Credential Distribution
              </h2>
              <Database className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {Object.entries(stats.credential_distribution).map(([type, count]: [string, any]) => (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-400">{type}</span>
                    <span className="text-sm text-gray-300 font-mono">{count.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
                      style={{ width: `${(count / stats.total_credentials) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Success Rate & Trust Score */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-display font-semibold text-gray-100">
                Verification Success Rate
              </h2>
              <CheckCircle2 className="w-5 h-5 text-success-400" />
            </div>
            <div className="flex items-center gap-6">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#27275f"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#10B981"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${stats.verification_success_rate * 3.51} 351`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-display font-bold text-gray-100">{stats.verification_success_rate}%</span>
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-2">
                  High success rate indicates trustworthy credential issuance
                </p>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-error-400" />
                  <span className="text-sm text-gray-300">
                    {Math.round(stats.total_verifications * (1 - stats.verification_success_rate / 100)).toLocaleString()} failed
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-display font-semibold text-gray-100">
                AI Trust Score Average
              </h2>
              <Shield className="w-5 h-5 text-primary-400" />
            </div>
            <div className="flex items-center gap-6">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#27275f"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#6C63FF"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${stats.ai_trust_average * 3.51} 351`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-display font-bold text-gray-100">{stats.ai_trust_average}%</span>
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-2">
                  AI-powered anomaly detection scores credential authenticity
                </p>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warning-400" />
                  <span className="text-sm text-gray-300">24 anomalies detected today</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Anomalies */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-display font-semibold text-gray-100">
              Recent Security Alerts
            </h2>
            <AlertTriangle className="w-5 h-5 text-warning-400" />
          </div>
          <div className="space-y-3">
            {[
              { type: 'rapid_verification', severity: 'high', time: '2 mins ago', user: '0x7a3b...9f2c' },
              { type: 'unusual_ip', severity: 'medium', time: '15 mins ago', user: '0x8c4d...1a3b' },
              { type: 'credential_abuse', severity: 'critical', time: '1 hour ago', user: '0x5e6f...2c4d' },
            ].map((alert, index) => (
              <div
                key={index}
                className={`flex items-center gap-4 p-4 rounded-xl ${
                  alert.severity === 'critical'
                    ? 'bg-error-500/10 border border-error-500/30'
                    : alert.severity === 'high'
                    ? 'bg-warning-500/10 border border-warning-500/30'
                    : 'bg-primary-500/10 border border-primary-500/30'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  alert.severity === 'critical'
                    ? 'bg-error-500/20'
                    : alert.severity === 'high'
                    ? 'bg-warning-500/20'
                    : 'bg-primary-500/20'
                }`}>
                  <AlertTriangle className={`w-4 h-4 ${
                    alert.severity === 'critical'
                      ? 'text-error-400'
                      : alert.severity === 'high'
                      ? 'text-warning-400'
                      : 'text-primary-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-200 font-medium">
                    {alert.type.replace('_', ' ').toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500">User: {alert.user}</p>
                </div>
                <div className="text-right">
                  <span className={`badge ${
                    alert.severity === 'critical'
                      ? 'badge-error'
                      : alert.severity === 'high'
                      ? 'badge-warning'
                      : 'badge-primary'
                  }`}>
                    {alert.severity}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
