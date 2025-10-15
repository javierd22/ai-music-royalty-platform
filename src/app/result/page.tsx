'use client';

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
  royalty_event: { total_amount_cents: number; splits: unknown[] };
};

const transformResultData = (data: unknown) => {
  const typedData = data as {
    tracks?: { title?: string };
    matches?: Match[];
    royalty_events?: { total_amount_cents?: number; splits?: unknown[] };
  };

  return {
    track: { title: typedData.tracks?.title || 'Unknown' },
    matches: typedData.matches || [],
    royalty_event: {
      total_amount_cents: typedData.royalty_events?.total_amount_cents || 0,
      splits: typedData.royalty_events?.splits || [],
    },
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
