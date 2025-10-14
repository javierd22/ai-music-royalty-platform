'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { supabase } from '@/lib/supabaseClient';

export default function UploadPage() {
  const [fileName, setFileName] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const router = useRouter();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFileName(f.name);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fileName) return;

    setProcessing(true);

    try {
      // pretend to fingerprint and compare
      await new Promise(resolve => setTimeout(resolve, 1200));

      const mockMatches = [
        {
          trackTitle: 'Echoes of You',
          artist: 'Josh Royal',
          similarity: 0.86,
          percentInfluence: 0.56,
        },
        {
          trackTitle: 'Midnight Lies',
          artist: 'Ahna Mac',
          similarity: 0.81,
          percentInfluence: 0.3,
        },
        {
          trackTitle: 'Amber Skyline',
          artist: 'Essyonna',
          similarity: 0.79,
          percentInfluence: 0.14,
        },
      ];

      const royaltyEvent = {
        outputId: crypto.randomUUID(),
        amountCents: 100,
        splits: mockMatches.map(m => ({
          trackTitle: m.trackTitle,
          artist: m.artist,
          percent: m.percentInfluence,
        })),
      };

      // Step 1: Insert track
      const { data: trackRow, error: tErr } = await supabase
        .from('tracks')
        .insert({
          title: fileName,
          storage_url: `local://demo/${fileName}`,
        })
        .select()
        .single();

      if (tErr) throw tErr;

      // Step 2: Insert result
      const { data: resultRow, error: rErr } = await supabase
        .from('results')
        .insert({
          track_id: trackRow.id,
          matches: mockMatches,
        })
        .select()
        .single();

      if (rErr) throw rErr;

      // Step 3: Insert royalty event
      const { error: reErr } = await supabase.from('royalty_events').insert({
        result_id: resultRow.id,
        total_amount_cents: 100,
        splits: royaltyEvent.splits,
      });

      if (reErr) throw reErr;

      // Step 4: Navigate to result page with result_id
      router.push(`/result?result_id=${resultRow.id}`);
    } catch (error) {
      console.error('Error saving to database:', error);
      alert('Error saving data. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <section className='space-y-6'>
      <h1 className='text-2xl font-semibold'>Upload an audio file</h1>
      <form onSubmit={handleSubmit} className='space-y-4'>
        <input type='file' accept='audio/*' onChange={handleFileChange} className='block' />
        {fileName && <p>Selected: {fileName}</p>}
        <button
          type='submit'
          disabled={!fileName || processing}
          className='rounded-lg border px-4 py-2 disabled:opacity-50'
        >
          {processing ? 'Processing…' : 'Check attribution'}
        </button>
      </form>
      <p className='text-sm text-gray-600'>
        Upload an audio file to run attribution analysis and save results to the database.
      </p>
    </section>
  );
}
