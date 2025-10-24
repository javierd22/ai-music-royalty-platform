/**
 * ProofBadge Component
 *
 * Per PRD Section 5.4: Royalty Event Engine - Dual Proof Verification
 * Displays the proof status with visual indicators
 */

'use client';

interface ProofBadgeProps {
  proofType: 'sdk' | 'auditor' | 'dual' | 'blockchain';
  status: 'verified' | 'pending' | 'missing' | 'rejected';
  compact?: boolean;
  showLabel?: boolean;
}

const proofLabels = {
  sdk: 'SDK Log',
  auditor: 'Auditor Match',
  dual: 'Dual Proof',
  blockchain: 'On-Chain',
};

const statusConfig = {
  verified: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    icon: '✓',
  },
  pending: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    icon: '⏳',
  },
  missing: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    icon: '○',
  },
  rejected: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: '✗',
  },
};

export function ProofBadge({
  proofType,
  status,
  compact = false,
  showLabel = true,
}: ProofBadgeProps) {
  const config = statusConfig[status];
  const label = proofLabels[proofType];

  if (compact) {
    return (
      <span
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${config.bg} ${config.text} text-xs font-medium`}
        title={`${label}: ${status}`}
      >
        {config.icon}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${config.bg} ${config.text} text-xs font-medium`}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{label}</span>}
      <span className='capitalize text-[10px] opacity-75'>{status}</span>
    </span>
  );
}

/**
 * Dual Proof Status Display
 * Shows both SDK and Auditor proof status side-by-side
 */
interface DualProofStatusProps {
  sdkStatus: 'verified' | 'pending' | 'missing';
  auditorStatus: 'verified' | 'pending' | 'missing';
  blockchainStatus?: 'verified' | 'pending' | 'missing';
  showBlockchain?: boolean;
}

export function DualProofStatus({
  sdkStatus,
  auditorStatus,
  blockchainStatus,
  showBlockchain = false,
}: DualProofStatusProps) {
  const bothVerified = sdkStatus === 'verified' && auditorStatus === 'verified';

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center gap-2'>
        <ProofBadge proofType='sdk' status={sdkStatus} compact={false} />
        <span className='text-gray-400'>+</span>
        <ProofBadge proofType='auditor' status={auditorStatus} compact={false} />
        {showBlockchain && blockchainStatus && (
          <>
            <span className='text-gray-400'>→</span>
            <ProofBadge proofType='blockchain' status={blockchainStatus} compact={false} />
          </>
        )}
      </div>

      {bothVerified && (
        <div className='golden-border bg-green-50'>
          <div className='golden-border-content'>
            <div className='flex gap-2 items-center text-sm text-green-800'>
              <span className='text-lg'>✓</span>
              <span className='font-medium'>
                Dual Proof Verified - Royalty event confirmed per PRD §5.4
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
