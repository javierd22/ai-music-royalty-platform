'use client';

/* eslint-disable max-lines-per-function */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

import { ToastContainer } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabaseClient';
import { logSupabaseError, validateSupabaseConfig } from '@/lib/utils';

type Match = { trackTitle: string; artist: string; similarity: number; percentInfluence: number };
type ResultData = {
  track: { title: string };
  matches: Match[];
  royalty_event: { total_amount_cents: number; splits: unknown[] } | null;
};

const transformResultData = (data: unknown) => {
  const typedData = data as {
    tracks?: { title?: string };
    matches?: Match[];
    royalty_events?: { total_amount_cents?: number; splits?: unknown[] } | null;
  };

  return {
    track: { title: typedData.tracks?.title || 'Unknown' },
    matches: typedData.matches || [],
    royalty_event: typedData.royalty_events
      ? {
          total_amount_cents: typedData.royalty_events.total_amount_cents || 0,
          splits: typedData.royalty_events.splits || [],
        }
      : null,
  };
};

function ResultContent() {
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const resultId = searchParams.get('result_id');
  const { toasts, dismissToast, showError } = useToast();

  const fetchResultData = useCallback(async () => {
    if (!resultId) {
      setError('No result ID provided');
      setLoading(false);
      return;
    }

    // Check if environment variables are properly set
    const configCheck = validateSupabaseConfig();
    if (!configCheck.isValid) {
      setError(`Configuration error: ${configCheck.error}`);
      showError(`Configuration error: ${configCheck.error}`);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('results')
        .select('*, tracks(title), royalty_events(total_amount_cents, splits)')
        .eq('id', resultId)
        .single();

      if (error) {
        logSupabaseError('result fetch', error);
        throw error;
      }

      if (data) {
        const transformedData = transformResultData(data);
        setResult(transformedData);
      }
    } catch {
      // Error is already logged by logSupabaseError
      setError('Failed to load result');
      showError('Failed to load result data');
    } finally {
      setLoading(false);
    }
  }, [resultId, showError]);

  useEffect(() => {
    fetchResultData();
  }, [fetchResultData]);

  if (loading) {
    return (
      <section className='space-y-6'>
        <h1 className='text-2xl font-semibold'>Attribution result</h1>
        <div className='golden-border'>
          <div className='golden-border-content'>
            <p className='text-center text-gray-600'>Loading result...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error || !result) {
    return (
      <section className='space-y-6'>
        <h1 className='text-2xl font-semibold'>Attribution result</h1>
        <div className='golden-border'>
          <div className='golden-border-content text-center'>
            <p className='text-gray-700 mb-4'>
              {error === 'No result ID provided'
                ? 'No result ID provided in the URL.'
                : 'No result found or result ID is invalid.'}
            </p>
            <Link href='/upload' className='golden-border inline-block'>
              <div className='golden-border-content'>Upload a file to run analysis</div>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const totalPercent = result.matches.reduce((s, m) => s + m.percentInfluence, 0);

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <section className='space-y-6'>
        <h1 className='text-2xl font-semibold'>Attribution result</h1>

        {/* File info with golden border */}
        <div className='golden-border'>
          <div className='golden-border-content'>
            <p className='text-gray-700'>
              File checked: <strong className='text-gray-900'>{result.track.title}</strong>
            </p>
          </div>
        </div>

        {/* Matches with enhanced styling */}
        <div className='space-y-3'>
          <h2 className='text-lg font-medium text-gray-800'>Similarity Matches</h2>
          {result.matches.map(m => (
            <div key={`${m.trackTitle}-${m.artist}`} className='golden-border'>
              <div className='golden-border-content'>
                <div className='font-medium text-gray-900 mb-2'>
                  {m.trackTitle} by {m.artist}
                </div>
                <div className='grid grid-cols-2 gap-4 text-sm'>
                  <div className='text-gray-600'>
                    Similarity:{' '}
                    <span className='font-semibold text-gray-900'>
                      {Math.round(m.similarity * 100)}%
                    </span>
                  </div>
                  <div className='text-gray-600'>
                    Influence:{' '}
                    <span className='font-semibold text-gray-900'>
                      {Math.round(m.percentInfluence * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary with golden border */}
        <div className='golden-border'>
          <div className='golden-border-content'>
            <p className='text-sm text-gray-600 text-center'>
              Total influence across matches:{' '}
              <span className='font-semibold text-gray-900'>{Math.round(totalPercent * 100)}%</span>
            </p>
          </div>
        </div>

        {/* No payable matches message */}
        {!result.royalty_event && (
          <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
            <div className='flex'>
              <div className='flex-shrink-0'>
                <svg className='h-5 w-5 text-yellow-400' viewBox='0 0 20 20' fill='currentColor'>
                  <path
                    fillRule='evenodd'
                    d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                    clipRule='evenodd'
                  />
                </svg>
              </div>
              <div className='ml-3'>
                <h3 className='text-sm font-medium text-yellow-800'>No Payable Matches Found</h3>
                <div className='mt-2 text-sm text-yellow-700'>
                  <p>
                    No payable matches found (below threshold). Similarity and influence values did
                    not meet the minimum requirements for royalty distribution.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation links */}
        <div className='flex gap-4 justify-center'>
          <Link href='/dashboard' className='golden-border inline-block'>
            <div className='golden-border-content'>View dashboard</div>
          </Link>
          <Link href='/upload' className='golden-border inline-block'>
            <div className='golden-border-content'>Upload another file</div>
          </Link>
        </div>
      </section>
    </>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <section className='space-y-6'>
          <h1 className='text-2xl font-semibold'>Attribution result</h1>
          <div className='golden-border'>
            <div className='golden-border-content'>
              <p className='text-center text-gray-600'>Loading result...</p>
            </div>
          </div>
        </section>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
