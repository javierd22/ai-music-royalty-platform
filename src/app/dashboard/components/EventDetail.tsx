/**
 * Royalty Event Detail View
 *
 * Per PRD Section 5.1: Shows verified events with match details
 * Per PRD Section 5.4: Displays dual proof (SDK log + auditor detection)
 */

'use client';

import Link from 'next/link';

import { formatCurrency, formatDate, formatPercent, formatScore } from '@/lib/format';
import type { ResultWithMatches, RoyaltyEventWithTrack } from '@/types/royalties';

interface EventDetailProps {
  event: RoyaltyEventWithTrack;
  result: ResultWithMatches | null;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'paid': {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    case 'approved': {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    case 'pending': {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    case 'disputed': {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    default: {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }
}

function EventHeader({ event }: { event: RoyaltyEventWithTrack }) {
  return (
    <div className='border-b border-gray-200 pb-4'>
      <div className='flex items-start justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900 mb-2'>Royalty Event Details</h2>
          <p className='text-sm text-gray-600'>
            Event ID: <span className='font-mono'>{event.id}</span>
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(event.status)}`}
        >
          {event.status.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

function EventSummary({ event }: { event: RoyaltyEventWithTrack }) {
  return (
    <div className='golden-border'>
      <div className='golden-border-content'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>Event Summary</h3>
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <div className='text-sm text-gray-600'>Track</div>
            <div className='font-medium text-gray-900'>
              {event.track?.title || event.metadata?.track_title || 'Unknown Track'}
            </div>
            <div className='text-sm text-gray-500'>
              {event.track?.artist || event.metadata?.artist || 'Unknown Artist'}
            </div>
          </div>
          <div>
            <div className='text-sm text-gray-600'>Payout Amount</div>
            <div className='text-2xl font-bold text-gray-900'>{formatCurrency(event.amount)}</div>
          </div>
          <div>
            <div className='text-sm text-gray-600'>Match Confidence</div>
            <div className='font-medium text-gray-900'>
              {formatPercent(event.match_confidence || 0, 1)}
            </div>
            <div className='text-xs text-gray-500'>Dual proof verified</div>
          </div>
          <div>
            <div className='text-sm text-gray-600'>Payout Weight</div>
            <div className='font-medium text-gray-900'>{formatPercent(event.payout_weight, 1)}</div>
            <div className='text-xs text-gray-500'>Based on similarity & duration</div>
          </div>
          <div>
            <div className='text-sm text-gray-600'>Similarity Score</div>
            <div className='font-medium text-gray-900'>{formatScore(event.similarity)}</div>
          </div>
          <div>
            <div className='text-sm text-gray-600'>Verified At</div>
            <div className='font-medium text-gray-900'>{formatDate(event.verified_at)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DualProofSection({ event }: { event: RoyaltyEventWithTrack }) {
  return (
    <div className='golden-border'>
      <div className='golden-border-content'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2'>
          <span>✓</span> Dual Proof Verification
        </h3>
        <div className='space-y-4'>
          <div className='border-l-4 border-blue-500 pl-4'>
            <div className='flex items-center gap-2 mb-2'>
              <span className='text-2xl'>🔍</span>
              <div>
                <div className='font-semibold text-gray-900'>Proof #1: Auditor Detection</div>
                <div className='text-sm text-gray-600'>
                  Vector similarity match from /compare endpoint
                </div>
              </div>
            </div>
            <div className='text-sm space-y-1'>
              <div>
                <span className='text-gray-600'>Result ID:</span>{' '}
                <span className='font-mono text-gray-900'>{event.result_id || 'N/A'}</span>
              </div>
              <div>
                <span className='text-gray-600'>Similarity:</span>{' '}
                <span className='font-medium text-gray-900'>{formatScore(event.similarity)}</span>
              </div>
            </div>
          </div>

          <div className='border-l-4 border-green-500 pl-4'>
            <div className='flex items-center gap-2 mb-2'>
              <span className='text-2xl'>📝</span>
              <div>
                <div className='font-semibold text-gray-900'>Proof #2: SDK Use Log</div>
                <div className='text-sm text-gray-600'>AI partner logged track usage</div>
              </div>
            </div>
            <div className='text-sm space-y-1'>
              <div>
                <span className='text-gray-600'>SDK Log ID:</span>{' '}
                {event.ai_use_log_id ? (
                  <Link
                    href={`/dashboard/logs/${event.ai_use_log_id}`}
                    className='font-mono text-gray-900 hover:text-gray-600 underline'
                  >
                    {event.ai_use_log_id.slice(0, 8)}...
                  </Link>
                ) : (
                  <span className='font-mono text-gray-900'>N/A</span>
                )}
              </div>
              {event.metadata?.model_id && (
                <div>
                  <span className='text-gray-600'>Model ID:</span>{' '}
                  <span className='font-medium text-gray-900'>{event.metadata.model_id}</span>
                </div>
              )}
              {event.metadata?.sdk_confidence !== undefined && (
                <div>
                  <span className='text-gray-600'>SDK Confidence:</span>{' '}
                  <span className='font-medium text-gray-900'>
                    {formatScore(event.metadata.sdk_confidence)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {event.metadata?.verification_note && (
            <div className='bg-blue-50 border border-blue-200 rounded-md p-3'>
              <div className='text-sm text-blue-900'>
                <span className='font-semibold'>Verification Note:</span>{' '}
                {event.metadata.verification_note}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultDetails({ result }: { result: ResultWithMatches }) {
  return (
    <div className='golden-border'>
      <div className='golden-border-content'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>Attribution Result Details</h3>
        <div className='space-y-3'>
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
                {formatPercent(result.percent_influence, 1)}
              </div>
            </div>
          </div>
          <div>
            <div className='text-sm text-gray-600'>Created At</div>
            <div className='font-medium text-gray-900'>{formatDate(result.created_at)}</div>
          </div>
          {result.metadata?.embedding_model && (
            <div>
              <div className='text-sm text-gray-600'>Embedding Model</div>
              <div className='font-medium text-gray-900'>{result.metadata.embedding_model}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetadataSection({ event }: { event: RoyaltyEventWithTrack }) {
  if (!event.metadata || Object.keys(event.metadata).length === 0) {
    return null;
  }

  return (
    <div className='golden-border'>
      <div className='golden-border-content'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>Additional Metadata</h3>
        <div className='space-y-2'>
          {event.metadata.duration_seconds !== undefined && (
            <div className='flex justify-between'>
              <span className='text-gray-600'>Duration:</span>
              <span className='font-medium text-gray-900'>
                {Math.floor(event.metadata.duration_seconds / 60)}:
                {String(Math.floor(event.metadata.duration_seconds % 60)).padStart(2, '0')}
              </span>
            </div>
          )}
          {event.metadata.model_tier && (
            <div className='flex justify-between'>
              <span className='text-gray-600'>Model Tier:</span>
              <span className='font-medium text-gray-900 capitalize'>
                {event.metadata.model_tier}
              </span>
            </div>
          )}
          <div className='flex justify-between'>
            <span className='text-gray-600'>Event Type:</span>
            <span className='font-medium text-gray-900'>{event.event_type}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EventDetail({ event, result }: EventDetailProps) {
  return (
    <div className='space-y-6'>
      <EventHeader event={event} />
      <EventSummary event={event} />
      <DualProofSection event={event} />
      {result && <ResultDetails result={result} />}
      <MetadataSection event={event} />
    </div>
  );
}
