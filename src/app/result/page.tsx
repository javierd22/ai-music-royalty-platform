'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabaseClient';

type Match = { trackTitle: string; artist: string; similarity: number; percentInfluence: number };
type ResultData = {
  track: { title: string };
  matches: Match[];
  royalty_event: { total_amount_cents: number; splits: any[] };
};

const transformResultData = (data: any) => {
  return {
    track: { title: data.tracks?.title || 'Unknown' },
    matches: data.matches || [],
    royalty_event: {
      total_amount_cents: data.royalty_events?.total_amount_cents || 0,
      splits: data.royalty_events?.splits || [],
    },
  };
};

function ResultContent() {
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const resultId = searchParams.get('result_id');

  const fetchResultData = useCallback(async () => {
    if (!resultId) {
      setError('No result ID provided');
      setLoading(false);
      return;
    }

    // Check if environment variables are properly set
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co'
    ) {
      setError('Supabase configuration missing. Please check environment variables.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('results')
        .select('*, tracks(title), royalty_events(total_amount_cents, splits)')
        .eq('id', resultId)
        .single();

      if (error) throw error;

      if (data) {
        const transformedData = transformResultData(data);
        setResult(transformedData);
      }
    } catch (error_) {
      console.error('Error fetching result:', error_);
      setError('Failed to load result');
    } finally {
      setLoading(false);
    }
  }, [resultId]);

  useEffect(() => {
    fetchResultData();
  }, [fetchResultData]);

  if (loading) {
    return <p>Loading result...</p>;
  }

  if (error || !result) {
    return <p>No result found. Go to Upload to run a demo.</p>;
  }

  const totalPercent = result.matches.reduce((s, m) => s + m.percentInfluence, 0);

  return (
    <section className='space-y-6'>
      <h1 className='text-2xl font-semibold'>Attribution result</h1>
      <p className='text-gray-700'>
        File checked: <strong>{result.track.title}</strong>
      </p>

      <div className='space-y-3'>
        {result.matches.map((m, i) => (
          <div key={i} className='golden-border'>
            <div className='golden-border-content'>
              <div className='font-medium'>
                {m.trackTitle} by {m.artist}
              </div>
              <div>Similarity score: {Math.round(m.similarity * 100)}%</div>
              <div>Percent influence: {Math.round(m.percentInfluence * 100)}%</div>
            </div>
          </div>
        ))}
      </div>

      <p className='text-sm text-gray-600'>
        Total influence across matches: {Math.round(totalPercent * 100)}%
      </p>
      <Link href='/dashboard' className='golden-border inline-block'>
        <div className='golden-border-content'>View dashboard</div>
      </Link>
    </section>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<p>Loading result...</p>}>
      <ResultContent />
    </Suspense>
  );
}
