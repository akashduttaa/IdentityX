import { useState, useCallback } from 'react';
import { groth16 } from 'snarkjs';

interface ZKProof {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  publicSignals: string[];
}

interface UseZKPResult {
  isGenerating: boolean;
  error: string | null;
  generateAgeProof: (birthYear: number, threshold?: number) => Promise<ZKProof | null>;
  generateKYCProof: (isVerified: boolean) => Promise<ZKProof | null>;
  generateMembershipProof: (memberOf: string[]) => Promise<ZKProof | null>;
  verifyProof: (proof: any, publicSignals: string[]) => Promise<boolean>;
}

export function useZKP(): UseZKPResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCircuitFiles = (circuitName: string) => {
    const circuits: Record<string, { wasm: string; zkey: string; vkey: string }> = {
      age_check: {
        wasm: '/circuits/age_check.wasm',
        zkey: '/circuits/age_check.zkey',
        vkey: '/circuits/age_check_vkey.json',
      },
      kyc_verify: {
        wasm: '/circuits/kyc_verify.wasm',
        zkey: '/circuits/kyc_verify.zkey',
        vkey: '/circuits/kyc_verify_vkey.json',
      },
      membership: {
        wasm: '/circuits/membership.wasm',
        zkey: '/circuits/membership.zkey',
        vkey: '/circuits/membership_vkey.json',
      },
    };

    return circuits[circuitName];
  };

  const generateAgeProof = useCallback(async (birthYear: number, threshold: number = 18): Promise<ZKProof | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;

      // For demo purposes, generate a mock proof if circuits are not available
      // In production, use actual circom circuits
      const mockProof = generateMockProof('age_check', [age.toString(), threshold.toString(), currentYear.toString()]);

      setIsGenerating(false);
      return mockProof;

      // Uncomment when actual circuits are available:
      /*
      const circuitName = 'age_check';
      const files = getCircuitFiles(circuitName);

      const { proof, publicSignals } = await groth16.fullProve(
        { birthYear, threshold, currentYear },
        files.wasm,
        files.zkey
      );

      setIsGenerating(false);
      return { proof, publicSignals };
      */
    } catch (err: any) {
      setError(err.message || 'Failed to generate proof');
      setIsGenerating(false);
      return null;
    }
  }, []);

  const generateKYCProof = useCallback(async (isVerified: boolean): Promise<ZKProof | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      // Mock proof for demo
      const mockProof = generateMockProof('kyc_verify', [isVerified ? '1' : '0']);

      setIsGenerating(false);
      return mockProof;

      // Uncomment when actual circuits are available:
      /*
      const circuitName = 'kyc_verify';
      const files = getCircuitFiles(circuitName);

      const { proof, publicSignals } = await groth16.fullProve(
        { isVerified: isVerified ? 1 : 0 },
        files.wasm,
        files.zkey
      );

      setIsGenerating(false);
      return { proof, publicSignals };
      */
    } catch (err: any) {
      setError(err.message || 'Failed to generate proof');
      setIsGenerating(false);
      return null;
    }
  }, []);

  const generateMembershipProof = useCallback(async (memberOf: string[]): Promise<ZKProof | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      // Mock proof for demo
      const count = memberOf.length.toString();
      const mockProof = generateMockProof('membership', [count]);

      setIsGenerating(false);
      return mockProof;

      // Uncomment when actual circuits are available:
      /*
      const circuitName = 'membership';
      const files = getCircuitFiles(circuitName);

      const { proof, publicSignals } = await groth16.fullProve(
        { memberOf },
        files.wasm,
        files.zkey
      );

      setIsGenerating(false);
      return { proof, publicSignals };
      */
    } catch (err: any) {
      setError(err.message || 'Failed to generate proof');
      setIsGenerating(false);
      return null;
    }
  }, []);

  const verifyProof = useCallback(async (proof: any, publicSignals: string[]): Promise<boolean> => {
    try {
      // For demo, always return true
      return true;

      // Uncomment when actual circuits are available:
      /*
      const vkeyResponse = await fetch('/circuits/age_check_vkey.json');
      if (!vkeyResponse.ok) {
        return true; // Fall back to mock verification
      }
      const vkey = await vkeyResponse.json();

      const isValid = await groth16.verify(vkey, publicSignals, proof);
      return isValid;
      */
    } catch (err) {
      console.error('Proof verification error:', err);
      return false;
    }
  }, []);

  return {
    isGenerating,
    error,
    generateAgeProof,
    generateKYCProof,
    generateMembershipProof,
    verifyProof,
  };
}

// Helper function to generate mock proofs
function generateMockProof(circuitName: string, publicSignals: string[]): ZKProof {
  const randomValue = () => {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0].toString();
  };

  return {
    proof: {
      pi_a: [
        `${randomValue()}${randomValue()}${randomNumber()}`,
        `${randomValue()}${randomValue()}${randomNumber()}`,
      ],
      pi_b: [
        [
          `${randomValue()}${randomValue()}${randomNumber()}`,
          `${randomValue()}${randomValue()}${randomNumber()}`,
        ],
        [
          `${randomValue()}${randomValue()}${randomNumber()}`,
          `${randomValue()}${randomValue()}${randomNumber()}`,
        ],
      ],
      pi_c: [
        `${randomValue()}${randomValue()}${randomNumber()}`,
        `${randomValue()}${randomValue()}${randomNumber()}`,
      ],
      protocol: 'groth16',
      curve: 'bn128',
    },
    publicSignals,
  };
}

function randomNumber(): string {
  return Math.floor(Math.random() * 1000000).toString();
}

export default useZKP;
