import { useState, useCallback, useEffect } from 'react';
import { ethers, BrowserProvider, JsonRpcSigner, Contract } from 'ethers';
import DIDRegistryABI from '../abis/DIDRegistry.json';
import CredentialRegistryABI from '../abis/CredentialRegistry.json';
import ZKPVerifierABI from '../abis/ZKPVerifier.json';

// Contract addresses (update with deployed addresses)
const CONTRACT_ADDRESSES = {
  DIDRegistry: import.meta.env.VITE_DID_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000',
  CredentialRegistry: import.meta.env.VITE_CREDENTIAL_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000',
  ZKPVerifier: import.meta.env.VITE_ZKP_VERIFIER_ADDRESS || '0x0000000000000000000000000000000000000000',
};

// Polygon Mumbai testnet
const POLYGON_MUMBAI = {
  chainId: '0x13881', // 80001 in hex
  chainName: 'Polygon Mumbai',
  rpcUrls: ['https://rpc-mumbai.maticvigil.com'],
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
  blockExplorerUrls: ['https://mumbai.polygonscan.com'],
};

interface UseBlockchainResult {
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToMumbai: () => Promise<void>;
  registerDID: (did: string, publicKeyHash: string) => Promise<string | null>;
  resolveDID: (did: string) => Promise<any>;
  issueCredential: (credentialId: string, issuerDID: string, holderDID: string, hash: string) => Promise<string | null>;
  verifyCredential: (credentialId: string) => Promise<any>;
  verifyProof: (proof: any, publicSignals: any[]) => Promise<boolean>;
}

export function useBlockchain(): UseBlockchainResult {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCorrectNetwork = chainId === 80001;

  // Check if wallet is already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          const browserProvider = new BrowserProvider((window as any).ethereum);
          const accounts = await browserProvider.listAccounts();

          if (accounts.length > 0) {
            const signerInstance = await browserProvider.getSigner();
            const network = await browserProvider.getNetwork();
            setProvider(browserProvider);
            setSigner(signerInstance);
            setAddress(await signerInstance.getAddress());
            setChainId(Number(network.chainId));
            setIsConnected(true);
          }
        } catch (err) {
          console.error('Failed to check wallet connection:', err);
        }
      }
    };

    checkConnection();

    // Listen for account changes
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAddress(accounts[0]);
          setIsConnected(true);
        }
      });

      (window as any).ethereum.on('chainChanged', (chainIdHex: string) => {
        setChainId(parseInt(chainIdHex, 16));
        window.location.reload();
      });
    }
  }, []);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        throw new Error('MetaMask is not installed');
      }

      const browserProvider = new BrowserProvider((window as any).ethereum);
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      const signerInstance = await browserProvider.getSigner();
      const network = await browserProvider.getNetwork();

      setProvider(browserProvider);
      setSigner(signerInstance);
      setAddress(accounts[0]);
      setChainId(Number(network.chainId));
      setIsConnected(true);

      // Switch to Mumbai if not already
      if (Number(network.chainId) !== 80001) {
        await switchToMumbai();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setChainId(null);
    setIsConnected(false);
    setError(null);
  }, []);

  const switchToMumbai = useCallback(async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setError('MetaMask is not installed');
      return;
    }

    const provider = new BrowserProvider((window as any).ethereum);

    try {
      await provider.send('wallet_switchEthereumChain', [
        { chainId: POLYGON_MUMBAI.chainId },
      ]);
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        // Chain not added to MetaMask
        try {
          await provider.send('wallet_addEthereumChain', [POLYGON_MUMBAI]);
        } catch (addError) {
          setError('Failed to add Polygon Mumbai to MetaMask');
        }
      } else {
        setError('Failed to switch to Polygon Mumbai');
      }
    }
  }, []);

  const getDIDRegistryContract = useCallback(() => {
    if (!signer) return null;
    return new Contract(
      CONTRACT_ADDRESSES.DIDRegistry,
      DIDRegistryABI.abi,
      signer
    );
  }, [signer]);

  const getCredentialRegistryContract = useCallback(() => {
    if (!signer) return null;
    return new Contract(
      CONTRACT_ADDRESSES.CredentialRegistry,
      CredentialRegistryABI.abi,
      signer
    );
  }, [signer]);

  const getZKPVerifierContract = useCallback(() => {
    if (!signer) return null;
    return new Contract(
      CONTRACT_ADDRESSES.ZKPVerifier,
      ZKPVerifierABI.abi,
      signer
    );
  }, [signer]);

  const registerDID = useCallback(async (did: string, publicKeyHash: string): Promise<string | null> => {
    const contract = getDIDRegistryContract();
    if (!contract) {
      setError('Wallet not connected');
      return null;
    }

    try {
      const tx = await contract.registerDID(
        did,
        ethers.sha256(ethers.toUtf8Bytes(publicKeyHash))
      );
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (err: any) {
      setError(err.message || 'Failed to register DID');
      return null;
    }
  }, [getDIDRegistryContract]);

  const resolveDID = useCallback(async (did: string): Promise<any> => {
    const contract = getDIDRegistryContract();
    if (!contract) {
      // Return mock data if no contract
      return {
        owner: address,
        publicKeyHash: ethers.sha256(ethers.toUtf8Bytes(did)),
        isActive: true,
        createdAt: Date.now(),
      };
    }

    try {
      const result = await contract.resolveDID(did);
      return result;
    } catch (err) {
      console.error('Failed to resolve DID:', err);
      return null;
    }
  }, [getDIDRegistryContract, address]);

  const issueCredential = useCallback(async (
    credentialId: string,
    issuerDID: string,
    holderDID: string,
    hash: string
  ): Promise<string | null> => {
    const contract = getCredentialRegistryContract();
    if (!contract) {
      setError('Wallet not connected');
      return null;
    }

    try {
      const tx = await contract.issueCredential(
        ethers.sha256(ethers.toUtf8Bytes(credentialId)),
        issuerDID,
        holderDID,
        ethers.sha256(ethers.toUtf8Bytes(hash)),
        ethers.sha256(ethers.toUtf8Bytes('schema')),
        0, // No expiry
      );
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (err: any) {
      setError(err.message || 'Failed to issue credential');
      return null;
    }
  }, [getCredentialRegistryContract]);

  const verifyCredential = useCallback(async (credentialId: string): Promise<any> => {
    const contract = getCredentialRegistryContract();
    if (!contract) {
      // Return mock data if no contract
      return {
        isValid: true,
        issuerDID: 'did:ethr:issuer',
        holderDID: 'did:ethr:holder',
      };
    }

    try {
      const result = await contract.verifyCredential(
        ethers.sha256(ethers.toUtf8Bytes(credentialId))
      );
      return result;
    } catch (err) {
      console.error('Failed to verify credential:', err);
      return { isValid: false };
    }
  }, [getCredentialRegistryContract]);

  const verifyProof = useCallback(async (proof: any, publicSignals: any[]): Promise<boolean> => {
    const contract = getZKPVerifierContract();
    if (!contract) {
      // Return true for demo
      return true;
    }

    try {
      const result = await contract.verifyProof(proof, publicSignals, 'age_18');
      return result;
    } catch (err) {
      console.error('Failed to verify proof:', err);
      return false;
    }
  }, [getZKPVerifierContract]);

  return {
    provider,
    signer,
    address,
    chainId,
    isConnecting,
    isConnected,
    isCorrectNetwork,
    error,
    connectWallet,
    disconnectWallet,
    switchToMumbai,
    registerDID,
    resolveDID,
    issueCredential,
    verifyCredential,
    verifyProof,
  };
}

export default useBlockchain;
