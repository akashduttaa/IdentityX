import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Award,
  FileCheck,
  Users,
  Plus,
  XCircle,
  CheckCircle2,
  Clock,
  Search,
  Send,
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../store/authStore';
import { credentialService } from '../lib/credential.service';
import toast from 'react-hot-toast';

interface IssueCredentialForm {
  holder_did: string;
  credential_type: string;
  claims: string;
  expires_at: string;
}

export default function IssuerDashboard() {
  const [activeTab, setActiveTab] = useState<'issue' | 'issued' | 'revoked'>('issue');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedCredentials, setIssuedCredentials] = useState<any[]>([]);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState<any>(null);
  const [credentialTypes, setCredentialTypes] = useState<any[]>([]);

  const { user, token } = useAuthStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IssueCredentialForm>();

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [creds, types] = await Promise.all([
        credentialService.getIssuedCredentials(token!),
        credentialService.getCredentialTypes(token),
      ]);
      setIssuedCredentials(creds);
      setCredentialTypes(types);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load issuer data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIssueCredential = async (data: IssueCredentialForm) => {
    setIsSubmitting(true);
    try {
      let claims: Record<string, any> = {};
      try {
        if (data.claims) {
          claims = JSON.parse(data.claims);
        }
      } catch {
        claims = { data: data.claims };
      }

      await credentialService.issueCredential(token!, {
        holder_did: data.holder_did,
        credential_type: data.credential_type,
        claims,
        expires_at: data.expires_at || undefined,
      });

      toast.success('Credential issued successfully!');
      setShowIssueModal(false);
      reset();
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to issue credential');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeCredential = async (credentialId: string, reason: string) => {
    try {
      await credentialService.revokeCredential(token!, credentialId, reason);
      toast.success('Credential revoked');
      setShowRevokeModal(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke credential');
    }
  };

  const activeCredentials = issuedCredentials.filter((c) => c.status === 'active');
  const revokedCredentials = issuedCredentials.filter((c) => c.status === 'revoked');

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
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-8 h-8 text-primary-400" />
              <h1 className="text-3xl font-display font-bold text-gray-100">Issuer Dashboard</h1>
            </div>
            <p className="text-gray-400">
              {user?.organization_name || 'Issue and manage verifiable credentials'}
            </p>
          </motion.div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Total Issued',
              value: issuedCredentials.length,
              icon: Award,
              color: 'from-primary-500 to-primary-600',
            },
            {
              label: 'Active',
              value: activeCredentials.length,
              icon: CheckCircle2,
              color: 'from-success-500 to-success-600',
            },
            {
              label: 'Revoked',
              value: revokedCredentials.length,
              icon: XCircle,
              color: 'from-error-500 to-error-600',
            },
            {
              label: 'Verification Level',
              value: 'L3',
              icon: FileCheck,
              color: 'from-secondary-500 to-secondary-600',
            },
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
              <div className="text-2xl font-display font-bold text-gray-100">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Issue Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowIssueModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Issue New Credential
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'issue' as const, label: 'Issue', icon: Plus },
            { id: 'issued' as const, label: 'Issued', icon: Award, count: activeCredentials.length },
            { id: 'revoked' as const, label: 'Revoked', icon: XCircle, count: revokedCredentials.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-dark-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className="bg-dark-700 px-2 py-0.5 rounded-full text-xs">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Issue Form Tab */}
        {activeTab === 'issue' && (
          <div className="glass-card p-6">
            <h2 className="text-xl font-display font-semibold text-gray-100 mb-6">
              Issue a New Credential
            </h2>
            <form onSubmit={handleSubmit(handleIssueCredential)} className="space-y-6 max-w-2xl">
              {/* Holder DID */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Recipient DID
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    {...register('holder_did', { required: 'Recipient DID is required' })}
                    className="input-field pl-12"
                    placeholder="did:ethr:0x..."
                  />
                </div>
                {errors.holder_did && (
                  <p className="text-error-400 text-sm mt-1">{errors.holder_did.message}</p>
                )}
              </div>

              {/* Credential Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Credential Type
                </label>
                <select
                  {...register('credential_type', { required: 'Credential type is required' })}
                  className="input-field"
                >
                  <option value="">Select credential type</option>
                  {credentialTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.credential_type && (
                  <p className="text-error-400 text-sm mt-1">{errors.credential_type.message}</p>
                )}
              </div>

              {/* Claims */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Claims (JSON)
                </label>
                <textarea
                  {...register('claims')}
                  className="input-field h-32 font-mono text-sm"
                  placeholder='{"name": "John Doe", "degree": "BSc Computer Science"}'
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter additional claims as JSON object
                </p>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  {...register('expires_at')}
                  className="input-field"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary inline-flex items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                Issue & Sign Credential
              </button>
            </form>
          </div>
        )}

        {/* Issued Credentials Tab */}
        {activeTab === 'issued' && (
          <div>
            {activeCredentials.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Award className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                <h3 className="text-lg font-display font-semibold text-gray-100 mb-2">
                  No Active Credentials
                </h3>
                <p className="text-gray-400">
                  Issue your first credential to get started
                </p>
              </div>
            ) : (
              <div className="glass-card overflow-hidden">
                <table className="w-full">
                  <thead className="bg-dark-800/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Credential
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Holder
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Issued
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Trust
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700">
                    {activeCredentials.map((cred) => (
                      <tr key={cred.id} className="hover:bg-dark-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-100">
                            {cred.credential_type}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            {cred.credential_id.slice(0, 12)}...
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-300">
                            {cred.holder?.name || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {cred.holder_did.slice(0, 20)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {new Date(cred.issued_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-mono font-bold text-success-400">
                            {cred.ai_trust_score}%
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setShowRevokeModal(cred)}
                            className="text-error-400 hover:text-error-300 text-sm"
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Revoked Credentials Tab */}
        {activeTab === 'revoked' && (
          <div>
            {revokedCredentials.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                <h3 className="text-lg font-display font-semibold text-gray-100 mb-2">
                  No Revoked Credentials
                </h3>
                <p className="text-gray-400">
                  All your issued credentials are active
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {revokedCredentials.map((cred) => (
                  <div key={cred.id} className="glass-card p-6 opacity-70">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-error-500/20 flex items-center justify-center flex-shrink-0">
                        <XCircle className="w-5 h-5 text-error-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-300">
                            {cred.credential_type}
                          </h4>
                          <span className="badge badge-error">Revoked</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Reason: {cred.revocation_reason || 'No reason provided'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Revoked: {new Date(cred.revoked_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Revoke Modal */}
      <AnimatePresence>
        {showRevokeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowRevokeModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="modal-content p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-error-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-error-400" />
                  </div>
                  <h3 className="text-lg font-display font-semibold text-gray-100">
                    Revoke Credential
                  </h3>
                </div>
                <button
                  onClick={() => setShowRevokeModal(null)}
                  className="p-1 rounded-lg hover:bg-dark-700 text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-gray-400 mb-4">
                Are you sure you want to revoke this credential? This action cannot be undone.
              </p>

              <div className="bg-dark-800/50 rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-300">
                  Credential: {showRevokeModal.credential_type}
                </div>
                <div className="text-xs text-gray-500">
                  Holder: {showRevokeModal.holder_did.slice(0, 30)}...
                </div>
              </div>

              <RevokeForm
                onRevoke={(reason) => handleRevokeCredential(showRevokeModal.id, reason)}
                onCancel={() => setShowRevokeModal(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RevokeForm({ onRevoke, onCancel }: { onRevoke: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Reason for Revocation
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="input-field h-24"
          placeholder="Enter reason..."
        />
      </div>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 btn-secondary"
        >
          Cancel
        </button>
        <button
          onClick={() => onRevoke(reason)}
          className="flex-1 px-4 py-2 bg-error-500 hover:bg-error-600 text-white rounded-xl transition-colors"
        >
          Revoke Credential
        </button>
      </div>
    </div>
  );
}
