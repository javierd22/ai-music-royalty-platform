'use client';

/**
 * Verification Badge Component
 *
 * Displays blockchain verification status with "Verify Proof" action
 * Per PRD Section 5.5: Public transparency and verification
 */

import { useState } from 'react';

interface VerificationBadgeProps {
  entityType: 'track' | 'event';
  entityId: string;
  txHash?: string;
  verified?: boolean;
  compact?: boolean;
}

interface VerificationResult {
  verified_on_chain: boolean;
  proof_hash: string;
  blockchain_details?: {
    block_number?: number;
    timestamp?: string;
    network?: string;
  };
}

export default function VerificationBadge({
  entityType,
  entityId,
  txHash,
  verified = false,
  compact = false,
}: VerificationBadgeProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/compliance/verify/${entityType}/${entityId}`
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        throw new Error('Verification failed');
      }

      const data = await response.json();
      setVerificationResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  // Initial badge display
  if (!verificationResult && !txHash) {
    return (
      <span className='inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600'>
        Not Verified
      </span>
    );
  }

  // Show verification result or initial status
  const isVerified = verificationResult?.verified_on_chain ?? verified;

  return (
    <div className='inline-flex items-center gap-2'>
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
          isVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
        }`}
      >
        {isVerified ? '✓ Verified On-Chain' : 'Pending Verification'}
      </span>

      {txHash && !compact && (
        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className='text-xs text-gray-600 hover:text-gray-900 underline disabled:opacity-50'
          title='Verify blockchain proof'
        >
          {isVerifying ? 'Verifying...' : 'Verify Proof'}
        </button>
      )}

      {verificationResult && !compact && (
        <div className='text-xs text-gray-500'>
          <details className='inline cursor-pointer'>
            <summary className='hover:text-gray-700'>Proof Details</summary>
            <div className='mt-2 p-3 bg-gray-50 rounded text-left space-y-1'>
              <div>
                <strong>Proof Hash:</strong>
                <code className='block text-xs font-mono mt-1 break-all'>
                  {verificationResult.proof_hash}
                </code>
              </div>
              {verificationResult.blockchain_details && (
                <>
                  <div>
                    <strong>Block:</strong> {verificationResult.blockchain_details.block_number}
                  </div>
                  <div>
                    <strong>Network:</strong> {verificationResult.blockchain_details.network}
                  </div>
                  <div>
                    <strong>Timestamp:</strong>{' '}
                    {verificationResult.blockchain_details.timestamp
                      ? new Date(verificationResult.blockchain_details.timestamp).toLocaleString()
                      : 'N/A'}
                  </div>
                </>
              )}
            </div>
          </details>
        </div>
      )}

      {error && !compact && <span className='text-xs text-red-600'>{error}</span>}
    </div>
  );
}
