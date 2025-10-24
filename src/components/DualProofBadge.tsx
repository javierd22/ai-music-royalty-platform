/**
 * Dual Proof Badge Component
 * Per PRD Section 5.4: Royalty Event Engine
 *
 * Displays visual indicator of dual proof status:
 * - Confirmed: SDK log + auditor detection + royalty event exists
 * - Pending: SDK log + auditor detection align, awaiting royalty event
 * - None: No dual proof alignment
 */

'use client';

import type { DualProofStatus } from '@/lib/dualProof';

interface DualProofBadgeProps {
  status: DualProofStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function DualProofBadge({ status, size = 'md', showLabel = true }: DualProofBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const statusConfig = {
    confirmed: {
      color: 'bg-green-100 text-green-800 border-green-300',
      icon: '✓',
      label: 'Confirmed',
      description: 'SDK log + auditor detection + royalty event',
    },
    pending: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      icon: '⏳',
      label: 'Pending',
      description: 'SDK log + auditor detection align',
    },
    none: {
      color: 'bg-gray-100 text-gray-600 border-gray-300',
      icon: '○',
      label: 'None',
      description: 'No dual proof alignment',
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${config.color} ${sizeClasses[size]}`}
      title={config.description}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

/**
 * Dual Proof Indicator with detailed information
 */
interface DualProofIndicatorProps {
  status: DualProofStatus;
  sdkLogId?: string | null;
  resultId?: string | null;
  royaltyEventId?: string | null;
  similarity?: number | null;
  sdkConfidence?: number | null;
}

export function DualProofIndicator({
  status,
  sdkLogId,
  resultId,
  royaltyEventId,
  similarity,
  sdkConfidence,
}: DualProofIndicatorProps) {
  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-2'>
        <span className='text-sm font-medium text-gray-700'>Dual Proof Status:</span>
        <DualProofBadge status={status} />
      </div>

      {status !== 'none' && (
        <div className='text-xs text-gray-600 space-y-1 pl-4 border-l-2 border-gray-200'>
          {sdkLogId && (
            <div>
              <span className='font-medium'>SDK Log:</span>{' '}
              <span className='font-mono'>{sdkLogId.slice(0, 8)}...</span>
              {sdkConfidence !== null && sdkConfidence !== undefined && (
                <span className='ml-2 text-gray-500'>
                  (confidence: {(sdkConfidence * 100).toFixed(1)}%)
                </span>
              )}
            </div>
          )}
          {resultId && (
            <div>
              <span className='font-medium'>Result:</span>{' '}
              <span className='font-mono'>{resultId.slice(0, 8)}...</span>
              {similarity !== null && similarity !== undefined && (
                <span className='ml-2 text-gray-500'>
                  (similarity: {(similarity * 100).toFixed(1)}%)
                </span>
              )}
            </div>
          )}
          {royaltyEventId && (
            <div>
              <span className='font-medium'>Royalty Event:</span>{' '}
              <span className='font-mono'>{royaltyEventId.slice(0, 8)}...</span>
            </div>
          )}
        </div>
      )}

      {status === 'none' && (
        <p className='text-xs text-gray-500 pl-4'>
          No SDK log found within time window, or similarity below threshold.
        </p>
      )}
    </div>
  );
}
