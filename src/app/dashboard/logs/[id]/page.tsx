/**
 * SDK Log Detail Page (React Server Component)
 *
 * Per PRD Section 5.2: AI Partner SDK
 * Shows detailed SDK log with dual proof status and related result/event
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { DualProofIndicator } from '@/components/DualProofBadge';
import { getDualProofStatusForSdkLog } from '@/lib/dualProof';
import { formatDate, formatScore } from '@/lib/format';
import { getResultByRoyaltyEvent, getSdkLogById } from '@/lib/supabase/server';

interface SdkLogDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SdkLogDetailPage({ params }: SdkLogDetailPageProps) {
  const { id } = await params;
  const log = await getSdkLogById(id);

  if (!log) {
    notFound();
  }

  // Get full dual proof details
  const dualProof = await getDualProofStatusForSdkLog(log.id);

  // Fetch related result if available
  const result = dualProof.resultId ? await getResultByRoyaltyEvent(dualProof.resultId) : null;

  return (
    <section className='max-w-4xl mx-auto space-y-6 pb-12'>
      {/* Back Navigation */}
      <div>
        <Link
          href='/dashboard/logs'
          className='inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors'
        >
          <span className='mr-2'>←</span>
          Back to SDK Logs
        </Link>
      </div>

      {/* Header */}
      <div className='border-b border-gray-200 pb-4'>
        <h2 className='text-2xl font-bold text-gray-900 mb-2'>SDK Log Details</h2>
        <p className='text-sm text-gray-600'>
          Log ID: <span className='font-mono'>{log.id}</span>
        </p>
      </div>

      {/* SDK Log Details */}
      <div className='golden-border'>
        <div className='golden-border-content'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>SDK Use Log</h3>

          <div className='space-y-3'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <div className='text-sm text-gray-600'>Model ID</div>
                <div className='font-medium text-gray-900'>{log.model_id}</div>
              </div>

              <div>
                <div className='text-sm text-gray-600'>Created At</div>
                <div className='font-medium text-gray-900'>{formatDate(log.created_at)}</div>
              </div>

              <div>
                <div className='text-sm text-gray-600'>Track ID</div>
                <div className='font-mono text-gray-900 text-sm'>{log.track_id}</div>
                {log.track && <div className='text-xs text-gray-500 mt-1'>{log.track.title}</div>}
              </div>

              <div>
                <div className='text-sm text-gray-600'>SDK Confidence</div>
                <div className='font-medium text-gray-900'>
                  {log.confidence === null ? 'N/A' : `${(log.confidence * 100).toFixed(1)}%`}
                </div>
              </div>
            </div>

            {log.prompt && (
              <div>
                <div className='text-sm text-gray-600 mb-1'>Prompt</div>
                <div className='text-sm text-gray-900 bg-gray-50 p-3 rounded-md font-mono'>
                  {log.prompt}
                </div>
              </div>
            )}

            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div>
                <div className='text-sm text-gray-600 mb-1'>Metadata</div>
                <pre className='text-xs text-gray-900 bg-gray-50 p-3 rounded-md overflow-x-auto'>
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dual Proof Status */}
      <div className='golden-border'>
        <div className='golden-border-content'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Dual Proof Verification</h3>
          <DualProofIndicator
            status={dualProof.status}
            sdkLogId={dualProof.sdkLogId}
            resultId={dualProof.resultId}
            royaltyEventId={dualProof.royaltyEventId}
            similarity={dualProof.similarity}
            sdkConfidence={dualProof.sdkConfidence}
          />

          {dualProof.status !== 'none' && (
            <div className='mt-4 text-sm text-gray-600'>
              <p className='mb-2'>
                <strong>Per PRD Section 5.4:</strong> Dual proof requires SDK log + auditor
                detection within {process.env.DUAL_PROOF_WINDOW_MINUTES || '10'} minute window, with
                similarity ≥ {process.env.DUAL_PROOF_THRESHOLD || '0.85'}.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Related Result */}
      {result && (
        <div className='golden-border'>
          <div className='golden-border-content'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Related Attribution Result</h3>

            <div className='space-y-3'>
              <div>
                <div className='text-sm text-gray-600'>Result ID</div>
                <div className='font-mono text-gray-900 text-sm'>{result.id}</div>
              </div>

              <div>
                <div className='text-sm text-gray-600'>Source File</div>
                <div className='font-medium text-gray-900'>{result.source_file}</div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <div className='text-sm text-gray-600'>Similarity</div>
                  <div className='font-medium text-gray-900'>{formatScore(result.similarity)}</div>
                </div>
                <div>
                  <div className='text-sm text-gray-600'>Percent Influence</div>
                  <div className='font-medium text-gray-900'>
                    {(result.percent_influence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div>
                <div className='text-sm text-gray-600'>Created At</div>
                <div className='font-medium text-gray-900'>{formatDate(result.created_at)}</div>
              </div>

              <div className='pt-2'>
                <Link
                  href={`/result?id=${result.id}`}
                  className='text-gray-900 hover:text-gray-600 font-medium underline text-sm'
                >
                  View Full Result →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link to Royalty Event if confirmed */}
      {dualProof.royaltyEventId && (
        <div className='golden-border'>
          <div className='golden-border-content'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Royalty Event</h3>
            <p className='text-sm text-gray-600 mb-3'>
              This SDK log is linked to a verified royalty event.
            </p>
            <Link
              href={`/dashboard/event/${dualProof.royaltyEventId}`}
              className='inline-block px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium'
            >
              View Royalty Event →
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

// Enable dynamic rendering
export const dynamic = 'force-dynamic';
