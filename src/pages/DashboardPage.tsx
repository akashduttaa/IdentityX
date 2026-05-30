import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  CreditCard,
  Shield,
  Activity,
  Copy,
  ExternalLink,
  QrCode,
  Download,
  Key,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  EyeOff,
  Sparkles,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useWalletStore } from '../store/walletStore';
import { credentialService } from '../lib/credential.service';
import { proofService } from '../lib/proof.service';
import { statsService } from '../lib/stats.service';
import toast from 'react-hot-toast';

type TabType = 'wallet' | 'credentials' | 'proofs' | 'activity';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('wallet');
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [selectedCredential, setSelectedCredential] = useState<any>(null);
  const [showProofModal, setShowProofModal] = useState(false);

  const { user, token, did } = useAuthStore();
  const { credentials, proofs, setCredentials, setProofs } = useWalletStore();

  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [creds, proofData, stats] = await Promise.all([
        credentialService.getMyCredentials(token!),
        proofService.getMyProofs(token!),
        statsService.getDashboardStats(user?.id || ''),
      ]);
      setCredentials(creds);
      setProofs(proofData);
      setDashboardStats(stats);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const tabs = [
    { id: 'wallet' as TabType, label: 'Wallet', icon: Wallet },
    { id: 'credentials' as TabType, label: 'Credentials', icon: CreditCard },
    { id: 'proofs' as TabType, label: 'Proofs', icon: Shield },
    { id: 'activity' as TabType, label: 'Activity', icon: Activity },
  ];

  const getCredentialTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      AgeVerification: 'Age Verification',
      KYC: 'KYC',
      UniversityDegree: 'University Degree',
      Employment: 'Employment',
      AddressProof: 'Address Proof',
      CustomClaim: 'Custom Claim',
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'badge-success';
      case 'expired':
        return 'badge-warning';
      case 'revoked':
        return 'badge-error';
      default:
        return 'badge-primary';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-display font-bold text-gray-100">
              Welcome back, {user?.name || user?.email?.split('@')[0]}
            </h1>
            <p className="text-gray-400 mt-1">Manage your decentralized identity</p>
          </motion.div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Total Credentials',
              value: dashboardStats?.total_credentials || credentials.length,
              icon: CreditCard,
              color: 'from-primary-500 to-primary-600',
            },
            {
              label: 'Proofs Generated',
              value: dashboardStats?.total_proofs || proofs.length,
              icon: Shield,
              color: 'from-secondary-500 to-secondary-600',
            },
            {
              label: 'Trust Score',
              value: `${dashboardStats?.average_trust_score || 72}%`,
              icon: Sparkles,
              color: 'from-accent-500 to-accent-600',
            },
            {
              label: 'Active Credentials',
              value: dashboardStats?.credentials_by_status?.active || credentials.filter(c => c.status === 'active').length,
              icon: CheckCircle2,
              color: 'from-success-500 to-success-600',
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="text-2xl font-display font-bold text-gray-100">{stat.value}</div>
              <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-dark-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Wallet Tab */}
            {activeTab === 'wallet' && (
              <div className="space-y-6">
                {/* DID Card */}
                <div className="glass-card p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                        <Wallet className="w-10 h-10 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-display font-semibold text-gray-100">
                          Your Decentralized Identifier
                        </h3>
                        <span className="badge badge-success">Active</span>
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <code className="text-primary-400 font-mono text-sm bg-dark-800 px-3 py-1.5 rounded-lg">
                          {did?.did_string || `did:ethr:${user?.wallet_address}`}
                        </code>
                        <button
                          onClick={() => copyToClipboard(did?.did_string || '', 'DID')}
                          className="p-1.5 rounded-lg hover:bg-dark-700 text-gray-400 hover:text-gray-300"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Wallet Address</span>
                          <p className="text-gray-300 font-mono">{user?.wallet_address?.slice(0, 10)}...{user?.wallet_address?.slice(-8)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Created</span>
                          <p className="text-gray-300">{new Date(did?.created_at || Date.now()).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 lg:flex-col">
                      <button className="btn-secondary inline-flex items-center gap-2 text-sm">
                        <Download className="w-4 h-4" />
                        Export DID
                      </button>
                      <button className="btn-secondary inline-flex items-center gap-2 text-sm text-warning-400 hover:text-warning-300 hover:border-warning-500">
                        <RefreshCw className="w-4 h-4" />
                        Rotate Keys
                      </button>
                    </div>
                  </div>
                </div>

                {/* DID Document */}
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-display font-semibold text-gray-100">DID Document</h3>
                    <button className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
                      View on Block Explorer
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="terminal">
                    <div className="terminal-header">
                      <div className="terminal-dot bg-error-500" />
                      <div className="terminal-dot bg-warning-500" />
                      <div className="terminal-dot bg-success-500" />
                      <span className="ml-4 text-gray-500 text-xs">did-document.json</span>
                    </div>
                    <div className="terminal-body overflow-auto max-h-64">
                      <pre className="text-xs text-gray-300">
                        {JSON.stringify(did?.did_document || {
                          '@context': ['https://www.w3.org/ns/did/v1'],
                          id: did?.did_string || `did:ethr:${user?.wallet_address}`,
                          verificationMethod: [{
                            id: `${did?.did_string || `did:ethr:${user?.wallet_address}`}#keys-1`,
                            type: 'EcdsaSecp256k1VerificationKey2019',
                            controller: did?.did_string || `did:ethr:${user?.wallet_address}`,
                          }],
                        }, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Credentials Tab */}
            {activeTab === 'credentials' && (
              <div>
                {credentials.length === 0 ? (
                  <div className="glass-card p-12 text-center">
                    <CreditCard className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                    <h3 className="text-lg font-display font-semibold text-gray-100 mb-2">
                      No Credentials Yet
                    </h3>
                    <p className="text-gray-400 mb-6">
                      Request credentials from trusted issuers to get started
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {credentials.map((credential, index) => (
                      <motion.div
                        key={credential.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="glass-card p-6 tilt-card cursor-pointer"
                        onClick={() => setSelectedCredential(credential)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary-400" />
                          </div>
                          <span className={`badge ${getStatusColor(credential.status)}`}>
                            {credential.status}
                          </span>
                        </div>
                        <h4 className="font-display font-semibold text-gray-100 mb-1">
                          {getCredentialTypeLabel(credential.credential_type)}
                        </h4>
                        <p className="text-sm text-gray-400 mb-4">
                          Issued by {credential.issuer?.issuer_name || 'Unknown Issuer'}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Trust: {credential.ai_trust_score}%</span>
                          <span>{new Date(credential.issued_at).toLocaleDateString()}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Proofs Tab */}
            {activeTab === 'proofs' && (
              <div>
                {proofs.length === 0 ? (
                  <div className="glass-card p-12 text-center">
                    <Shield className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                    <h3 className="text-lg font-display font-semibold text-gray-100 mb-2">
                      No Proofs Generated
                    </h3>
                    <p className="text-gray-400 mb-6">
                      Generate zero-knowledge proofs from your credentials
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {proofs.map((proof, index) => (
                      <motion.div
                        key={proof.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="glass-card p-6"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              proof.verified ? 'bg-success-500/20' : 'bg-error-500/20'
                            }`}>
                              {proof.verified ? (
                                <CheckCircle2 className="w-5 h-5 text-success-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-error-500" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-display font-semibold text-gray-100">
                                {proof.claim_type}
                              </h4>
                              <p className="text-sm text-gray-400">
                                {new Date(proof.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm text-gray-400">Anomaly Score</div>
                              <div className={`font-mono font-bold ${
                                proof.ai_anomaly_score > 70 ? 'text-error-400' : 'text-success-400'
                              }`}>
                                {proof.ai_anomaly_score}%
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div className="glass-card p-6">
                <h3 className="text-lg font-display font-semibold text-gray-100 mb-6">
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {credentials.slice(0, 5).map((cred, index) => (
                    <div key={cred.id} className="activity-item">
                      <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-4 h-4 text-primary-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-300">
                          Credential issued: <span className="text-primary-400">{getCredentialTypeLabel(cred.credential_type)}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(cred.issued_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {proofs.slice(0, 5).map((proof) => (
                    <div key={proof.id} className="activity-item">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        proof.verified ? 'bg-success-500/20' : 'bg-error-500/20'
                      }`}>
                        <Shield className={`w-4 h-4 ${proof.verified ? 'text-success-400' : 'text-error-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-300">
                          Proof {proof.verified ? 'verified' : 'failed'}: <span className="text-secondary-400">{proof.claim_type}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(proof.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
