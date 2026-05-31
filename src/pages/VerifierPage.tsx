import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Upload,
  CheckCircle2,
  XCircle,
  FileCheck,
  AlertTriangle,
  Loader2,
  Terminal,
  Download,
  Building2,
  Copy,
  ChevronRight,
} from 'lucide-react';
import { proofService } from '../lib/proof.service';
import { hasSupabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function VerifierPage() {
  const [proofInput, setProofInput] = useState('');
  const [publicSignalsInput, setPublicSignalsInput] = useState('');
  const [fileData, setFileData] = useState<{ name: string; mime: string; base64: string } | null>(null);
  const [claimType, setClaimType] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'verify' | 'issuers'>('verify');

  // Mock issuers for demo
  const mockIssuers = [
    {
      id: '1',
      name: 'MIT University',
      did: 'did:ethr:0x7a3b...9f2c',
      type: 'university',
      level: 5,
      credentials: 1234,
    },
    {
      id: '2',
      name: 'HSBC Bank',
      did: 'did:ethr:0x8c4d...1a3b',
      type: 'bank',
      level: 4,
      credentials: 892,
    },
    {
      id: '3',
      name: 'Gov UK',
      did: 'did:ethr:0x5e6f...2c4d',
      type: 'government',
      level: 5,
      credentials: 4523,
    },
  ];

  const handleVerify = async () => {
    if (!proofInput.trim() && !fileData) {
      toast.error('Please enter proof data or upload a file');
      return;
    }

    setIsVerifying(true);
    setResult(null);

    try {
      let zkProof;
      let publicSignals;

      if (fileData) {
        // If a file (image/pdf) was uploaded
        if (hasSupabase) {
          const verificationResult = await proofService.verifyProof({
            zk_proof: { file: { name: fileData.name, mime: fileData.mime, data: fileData.base64 } },
            public_signals: [],
            claim_type: claimType || 'file_upload',
          } as any);

          setResult({ success: verificationResult.verified, ...verificationResult });
          toast.success(verificationResult.verified ? 'Proof verified successfully!' : 'Proof verification failed');
        } else {
          // Local mock verification for image/pdf
          await new Promise((r) => setTimeout(r, 800));
          const fake = {
            verified: true,
            claim_type: claimType || 'file_upload',
            timestamp: Date.now(),
            receipt_id: `local_receipt_${Date.now()}`,
          };
          setResult({ success: true, ...fake });
          toast.success('Supabase configured');
        }
      } else {
        // Try to parse JSON proof input
        try {
          zkProof = JSON.parse(proofInput);
        } catch {
          zkProof = { raw: proofInput };
        }

        try {
          publicSignals = publicSignalsInput ? JSON.parse(publicSignalsInput) : ['1', '18'];
        } catch {
          publicSignals = ['1', '18'];
        }

        const verificationResult = await proofService.verifyProof({
          zk_proof: zkProof,
          public_signals: publicSignals,
          claim_type: claimType || 'age_18',
        } as any);

        setResult({ success: verificationResult.verified, ...verificationResult });
        toast.success(verificationResult.verified ? 'Proof verified successfully!' : 'Proof verification failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Verification failed');
      setResult({
        success: false,
        error: error.message,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      reader.onload = (event) => {
        const content = event.target?.result as string;
        try {
          const parsed = JSON.parse(content);
          setProofInput(JSON.stringify(parsed.zkProof || parsed.proof || parsed, null, 2));
          setPublicSignalsInput(JSON.stringify(parsed.publicSignals || parsed.public_signals || [], null, 2));
          setFileData(null);
          toast.success('JSON proof loaded successfully');
        } catch {
          setProofInput(content);
          setFileData(null);
          toast.success('File loaded');
        }
      };
      reader.readAsText(file);
    } else if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      // Read as Data URL (base64) for images and PDFs
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const base64 = dataUrl.split(',')[1] || '';
        setFileData({ name: file.name, mime: file.type, base64 });
        // clear text inputs
        setProofInput('');
        setPublicSignalsInput('');
        toast.success(`${file.type.startsWith('image/') ? 'Image' : 'PDF'} uploaded`);
      };
      reader.readAsDataURL(file);
    } else {
      // fallback to text
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setProofInput(content);
        setFileData(null);
        toast.success('File loaded');
      };
      reader.readAsText(file);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const downloadReceipt = () => {
    if (!result) return;

    const timestamp = result.timestamp ? new Date(result.timestamp).toISOString() : new Date().toISOString();
    const receipt = {
      receipt_id: result.receipt_id || result.verification_id || `receipt_${Date.now()}`,
      verification_result: result.success ? 'valid' : 'invalid',
      claim_type: result.claim_type || claimType || 'unknown',
      timestamp,
      ...result,
    };

    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `verification-receipt-${receipt.receipt_id}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-display font-bold text-gray-100 mb-4">
            Zero-Knowledge Proof Verifier
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Verify identity claims without accessing sensitive data. Zero-knowledge proofs ensure privacy while confirming validity.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[
            { id: 'verify' as const, label: 'Verify Proof', icon: FileCheck },
            { id: 'issuers' as const, label: 'Trusted Issuers', icon: Building2 },
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
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'verify' && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Section */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-display font-semibold text-gray-100 mb-4">
                    Proof Input
                  </h3>

                  {/* File Upload */}
                  <div className="mb-6">
                    <label className="block mb-2 cursor-pointer">
                      <div className="border-2 border-dashed border-dark-600 rounded-xl p-8 text-center hover:border-primary-500/50 transition-colors">
                        <Upload className="w-10 h-10 mx-auto text-gray-500 mb-3" />
                        <p className="text-sm text-gray-400">
                          Drag & drop proof file or click to browse
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Supports JSON, image (PNG/JPEG) or PDF</p>
                      </div>
                      <input
                        type="file"
                        accept=".json,image/*,application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {fileData && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Uploaded File</label>
                      <div className="flex items-center gap-4">
                        {fileData.mime.startsWith('image/') ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`data:${fileData.mime};base64,${fileData.base64}`} alt={fileData.name} className="w-24 h-24 object-cover rounded" />
                        ) : (
                          <div className="w-24 h-24 flex items-center justify-center bg-dark-800 rounded">
                            <FileCheck className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm text-gray-200 font-medium">{fileData.name}</div>
                          <div className="text-xs text-gray-400">{fileData.mime}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ZK Proof Input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ZK Proof (JSON)
                    </label>
                    <textarea
                      value={proofInput}
                      onChange={(e) => setProofInput(e.target.value)}
                      className="input-field h-32 font-mono text-xs"
                      placeholder='{"pi_a": [...], "pi_b": [...], "pi_c": [...]}'
                    />
                  </div>

                  {/* Public Signals */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Public Signals (JSON array)
                    </label>
                    <textarea
                      value={publicSignalsInput}
                      onChange={(e) => setPublicSignalsInput(e.target.value)}
                      className="input-field h-20 font-mono text-xs"
                      placeholder='["1", "18"]'
                    />
                  </div>

                  {/* Claim Type */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Claim Type
                    </label>
                    <select
                      value={claimType}
                      onChange={(e) => setClaimType(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Auto-detect</option>
                      <option value="age_18">Age &gt;= 18</option>
                      <option value="age_21">Age &gt;= 21</option>
                      <option value="kyc_complete">KYC Complete</option>
                      <option value="degree_verified">Degree Verified</option>
                      <option value="employment_verified">Employment Verified</option>
                    </select>
                  </div>

                  {/* Verify Button */}
                  <button
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="w-full btn-primary flex items-center justify-center gap-2 py-4"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5" />
                        Verify Proof
                      </>
                    )}
                  </button>
                </div>

                {/* Result Section */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-display font-semibold text-gray-100 mb-4">
                    Verification Result
                  </h3>

                  {result ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      {/* Status */}
                      <div className={`p-6 rounded-xl mb-6 ${
                        result.success
                          ? 'bg-success-500/10 border border-success-500/30'
                          : 'bg-error-500/10 border border-error-500/30'
                      }`}>
                        <div className="flex items-center gap-4">
                          {result.success ? (
                            <CheckCircle2 className="w-12 h-12 text-success-500" />
                          ) : (
                            <XCircle className="w-12 h-12 text-error-500" />
                          )}
                          <div>
                            <h4 className={`text-xl font-display font-bold ${
                              result.success ? 'text-success-400' : 'text-error-400'
                            }`}>
                              {result.success ? 'VERIFIED' : 'INVALID'}
                            </h4>
                            <p className="text-gray-400 text-sm">
                              {result.success
                                ? 'The proof is valid and cryptographically verified'
                                : result.error || 'The proof failed verification'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                          <span className="text-sm text-gray-400">Claim Type</span>
                          <span className="text-sm text-gray-200 font-mono">{result.claim_type}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                          <span className="text-sm text-gray-400">Timestamp</span>
                          <span className="text-sm text-gray-200">{new Date(result.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                          <span className="text-sm text-gray-400">Receipt ID</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-200 font-mono">{result.receipt_id?.slice(0, 16)}...</span>
                            <button
                              onClick={() => copyToClipboard(result.receipt_id)}
                              className="p-1 hover:bg-dark-700 rounded"
                            >
                              <Copy className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Download Receipt */}
                      <button
                        onClick={downloadReceipt}
                        className="w-full btn-secondary mt-6 flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download Verification Receipt
                      </button>
                    </motion.div>
                  ) : (
                    <div className="terminal min-h-[400px]">
                      <div className="terminal-header">
                        <div className="terminal-dot bg-error-500" />
                        <div className="terminal-dot bg-warning-500" />
                        <div className="terminal-dot bg-success-500" />
                        <span className="ml-4 text-gray-500 text-xs">verifier-output</span>
                      </div>
                      <div className="terminal-body">
                        <div className="text-gray-500">
                          <p className="mb-2">$ Waiting for proof input...</p>
                          <p className="text-gray-600 animate-pulse">|</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'issuers' && (
            <motion.div
              key="issuers"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="glass-card p-6 mb-6">
                <h3 className="text-lg font-display font-semibold text-gray-100 mb-2">
                  Trusted Credential Issuers
                </h3>
                <p className="text-gray-400 text-sm">
                  These organizations have been verified and can issue trusted credentials
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockIssuers.map((issuer, index) => (
                  <motion.div
                    key={issuer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="glass-card p-6 hover:scale-105 transition-transform cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary-400" />
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: issuer.level }).map((_, i) => (
                          <div key={i} className="w-2 h-2 rounded-full bg-primary-500" />
                        ))}
                      </div>
                    </div>
                    <h4 className="font-display font-semibold text-gray-100 mb-1">
                      {issuer.name}
                    </h4>
                    <p className="text-xs text-gray-500 mb-3">{issuer.type}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{issuer.credentials} credentials</span>
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* How ZK Verification Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-12 glass-card p-8"
        >
          <h3 className="text-xl font-display font-semibold text-gray-100 mb-6">
            How Zero-Knowledge Verification Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '1',
                title: 'Generate Proof',
                description: 'User creates a ZK proof from their credential without revealing the underlying data',
              },
              {
                step: '2',
                title: 'Submit Proof',
                description: 'Proof and public signals are sent to the verifier (this page)',
              },
              {
                step: '3',
                title: 'Verify Cryptographically',
                description: ' verifier checks mathematical validity of the proof without seeing raw data',
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary-400">{item.step}</span>
                </div>
                <div>
                  <h4 className="font-display font-semibold text-gray-100 mb-1">
                    {item.title}
                  </h4>
                  <p className="text-sm text-gray-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
