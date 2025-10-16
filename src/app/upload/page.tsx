'use client';

/* eslint-disable no-console, max-lines-per-function, complexity, sonarjs/cognitive-complexity */
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ToastContainer } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabaseClient';
import { logSupabaseError, validateSupabaseConfig } from '@/lib/utils';

type Match = { trackTitle: string; artist: string; similarity: number; percentInfluence: number };

// Mock matches removed - using real attribution engine

// Helper function to validate and sanitize matches data
function validateAndSanitizeMatches(matches: Match[]): Match[] {
  if (!Array.isArray(matches)) {
    throw new TypeError('Matches must be an array');
  }

  return matches.map((match, index) => {
    if (!match || typeof match !== 'object') {
      throw new Error(`Match at index ${index} is not a valid object`);
    }

    const sanitized = {
      trackTitle: String(match.trackTitle || ''),
      artist: String(match.artist || ''),
      similarity: Number(match.similarity) || 0,
      percentInfluence: Number(match.percentInfluence) || 0,
    };

    // Validate numeric values
    if (
      Number.isNaN(sanitized.similarity) ||
      sanitized.similarity < 0 ||
      sanitized.similarity > 1
    ) {
      throw new Error(`Invalid similarity value at index ${index}: ${match.similarity}`);
    }
    if (
      Number.isNaN(sanitized.percentInfluence) ||
      sanitized.percentInfluence < 0 ||
      sanitized.percentInfluence > 1
    ) {
      throw new Error(
        `Invalid percentInfluence value at index ${index}: ${match.percentInfluence}`
      );
    }

    return sanitized;
  });
}

// Helper function to validate royalty event data
function validateRoyaltyEvent(splits: unknown[]): unknown[] {
  if (!Array.isArray(splits)) {
    throw new TypeError('Splits must be an array');
  }

  return splits.map((split, index) => {
    if (!split || typeof split !== 'object') {
      throw new Error(`Split at index ${index} is not a valid object`);
    }

    const sanitized = {
      trackTitle: String((split as { trackTitle?: unknown }).trackTitle || ''),
      artist: String((split as { artist?: unknown }).artist || ''),
      percent: Number((split as { percent?: unknown }).percent) || 0,
    };

    if (Number.isNaN(sanitized.percent) || sanitized.percent < 0 || sanitized.percent > 1) {
      throw new Error(
        `Invalid percent value at index ${index}: ${(split as { percent?: unknown }).percent}`
      );
    }

    return sanitized;
  });
}

const createRoyaltyEvent = (mockMatches: Match[]) => ({
  outputId: crypto.randomUUID(),
  amountCents: 100,
  splits: mockMatches.map(m => ({
    trackTitle: m.trackTitle,
    artist: m.artist,
    percent: m.percentInfluence,
  })),
});

const meetsAttributionPolicy = (matches: Match[]): boolean => {
  // Rule: (max similarity ≥ 0.80) AND (sum of percentInfluence ≥ 0.20)

  if (matches.length === 0) {
    return false;
  }

  // Check if max similarity >= 0.80
  const maxSimilarity = Math.max(...matches.map(m => m.similarity));
  if (maxSimilarity < 0.8) {
    return false;
  }

  // Check if sum of percentInfluence >= 0.20
  const totalInfluence = matches.reduce((sum, m) => sum + m.percentInfluence, 0);

  return totalInfluence >= 0.2;
};

export default function UploadPage() {
  const [fileName, setFileName] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toasts, dismissToast, showSuccess, showError, showWarning } = useToast();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setFileName(f.name);
      setFile(f);
      setError(null); // Clear any previous errors
    }
  }

  // Check environment variables on component mount
  useEffect(() => {
    const configCheck = validateSupabaseConfig();
    if (!configCheck.isValid) {
      showWarning(
        `Configuration issue: ${configCheck.error}. Some features may not work properly.`
      );
    }

    // Check NEXT_PUBLIC_ATTRIB_BASE_URL
    const attribBaseUrl = process.env.NEXT_PUBLIC_ATTRIB_BASE_URL;
    if (!attribBaseUrl) {
      showWarning(
        'NEXT_PUBLIC_ATTRIB_BASE_URL environment variable is not set. Attribution analysis will not work. Please set NEXT_PUBLIC_ATTRIB_BASE_URL in your .env.local file.'
      );
    }
  }, [showWarning]);

  async function callAttributionEngine(file: File): Promise<Match[]> {
    const baseUrl = process.env.NEXT_PUBLIC_ATTRIB_BASE_URL;

    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_ATTRIB_BASE_URL environment variable is not set');
    }

    const formData = new FormData();
    formData.append('file', file);

    console.log('🔍 Calling attribution engine at:', `${baseUrl}/compare`);

    console.log('📁 File details:', { name: file.name, size: file.size, type: file.type });

    const response = await fetch(`${baseUrl}/compare`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Attribution engine error:', { status: response.status, errorText });
      throw new Error(`Attribution engine error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Attribution engine response received');
    console.log('📊 Response data length:', JSON.stringify(data).length, 'characters');
    console.log('🔑 Response keys:', Object.keys(data));
    console.log('🎵 Matches count:', data.matches?.length || 0);
    console.log('📋 Full response data:', data);

    return data.matches || [];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fileName || !file) return;

    // Check if environment variables are properly set
    const configCheck = validateSupabaseConfig();
    if (!configCheck.isValid) {
      showError(`Configuration error: ${configCheck.error}`);
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Call attribution engine
      const rawMatches = await callAttributionEngine(file);

      // Validate and sanitize matches data
      const safeMatches = validateAndSanitizeMatches(rawMatches);
      console.log('✅ Matches validated and sanitized:', safeMatches);

      // Step 1: Insert track
      const trackPayload = {
        title: fileName,
        storage_url: `local://demo/${fileName}`,
      };
      console.log('💾 Step 1: Inserting into tracks table');
      console.log('📋 Track payload keys:', Object.keys(trackPayload));

      const { data: trackRow, error: tErr } = await supabase
        .from('tracks')
        .insert(trackPayload)
        .select()
        .single();

      if (tErr) {
        const errorDetails = { code: tErr.code, message: tErr.message, details: tErr.details };
        console.error('❌ Tracks insert failed:', errorDetails);
        logSupabaseError('track insert', tErr);
        showError(`tracks insert failed: ${tErr.code} ${tErr.message}`);
        throw new Error(`Tracks insert failed: ${tErr.message}`);
      }

      if (!trackRow?.id) {
        throw new Error('Track insert succeeded but no ID returned');
      }
      console.log('✅ Track inserted successfully with ID:', trackRow.id);

      // Step 2: Insert result
      // eslint-disable-next-line unicorn/prefer-structured-clone
      const sanitizedMatches = JSON.parse(JSON.stringify(safeMatches)); // Deep clone and sanitize
      const resultPayload = {
        track_id: trackRow.id,
        matches: sanitizedMatches,
      };
      console.log('💾 Step 2: Inserting into results table');
      console.log('📋 Result payload keys:', Object.keys(resultPayload));
      console.log('📊 Matches count:', sanitizedMatches.length);

      const { data: resultRow, error: rErr } = await supabase
        .from('results')
        .insert(resultPayload)
        .select()
        .single();

      if (rErr) {
        const errorDetails = { code: rErr.code, message: rErr.message, details: rErr.details };
        console.error('❌ Results insert failed:', errorDetails);
        logSupabaseError('result insert', rErr);
        showError(`results insert failed: ${rErr.code} ${rErr.message}`);
        throw new Error(`Results insert failed: ${rErr.message}`);
      }

      if (!resultRow?.id) {
        throw new Error('Result insert succeeded but no ID returned');
      }
      console.log('✅ Result inserted successfully with ID:', resultRow.id);

      // Step 3: Check attribution policy and conditionally insert royalty event
      const shouldCreateRoyaltyEvent = meetsAttributionPolicy(safeMatches);
      console.log('🎯 Attribution policy check:', {
        shouldCreateRoyaltyEvent,
        matchesCount: safeMatches.length,
        maxSimilarity: safeMatches.length > 0 ? Math.max(...safeMatches.map(m => m.similarity)) : 0,
        totalInfluence: safeMatches.reduce((sum, m) => sum + m.percentInfluence, 0),
      });

      if (shouldCreateRoyaltyEvent) {
        const royaltyEvent = createRoyaltyEvent(safeMatches);
        const validatedSplits = validateRoyaltyEvent(royaltyEvent.splits);
        const royaltyPayload = {
          result_id: resultRow.id,
          total_amount_cents: 100, // Ensure integer
          splits: validatedSplits,
        };
        console.log('💾 Step 3: Inserting into royalty_events table');
        console.log('📋 Royalty event payload keys:', Object.keys(royaltyPayload));
        console.log('💰 Total amount cents:', royaltyPayload.total_amount_cents);
        console.log('📊 Splits count:', validatedSplits.length);

        const { data: royaltyRow, error: reErr } = await supabase
          .from('royalty_events')
          .insert(royaltyPayload)
          .select()
          .single();

        if (reErr) {
          const errorDetails = { code: reErr.code, message: reErr.message, details: reErr.details };
          console.error('❌ Royalty events insert failed:', errorDetails);
          logSupabaseError('royalty_event insert', reErr);
          showError(`royalty_events insert failed: ${reErr.code} ${reErr.message}`);
          throw new Error(`Royalty events insert failed: ${reErr.message}`);
        }

        if (!royaltyRow?.id) {
          throw new Error('Royalty event insert succeeded but no ID returned');
        }
        console.log('✅ Royalty event inserted successfully with ID:', royaltyRow.id);
      } else {
        console.log('ℹ️ No royalty event created - attribution policy not met');
      }

      // Step 4: Navigate to result page with result_id
      const message = shouldCreateRoyaltyEvent
        ? 'Analysis complete! Redirecting to results...'
        : 'Analysis complete! No payable matches found. Redirecting to results...';
      showSuccess(message);
      router.push(`/result?result_id=${resultRow.id}`);
    } catch (error_) {
      console.error('❌ Upload process failed:', error_);

      // Handle attribution engine errors with gentle banner
      if (error_ instanceof Error && error_.message.includes('Attribution engine error')) {
        setError(error_.message);
        showError(`Attribution analysis failed: ${error_.message}`);
      } else if (error_ instanceof Error) {
        // Show specific error message
        setError(error_.message);
        showError(`Upload failed: ${error_.message}`);
      } else {
        // Generic error fallback
        setError('An unexpected error occurred');
        showError('Error saving data. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  }

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <section className='space-y-6'>
        <h1 className='text-2xl font-semibold'>Upload an audio file</h1>

        {error && (
          <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
            <div className='flex'>
              <div className='flex-shrink-0'>
                <svg className='h-5 w-5 text-red-400' viewBox='0 0 20 20' fill='currentColor'>
                  <path
                    fillRule='evenodd'
                    d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                    clipRule='evenodd'
                  />
                </svg>
              </div>
              <div className='ml-3'>
                <h3 className='text-sm font-medium text-red-800'>Attribution Analysis Failed</h3>
                <div className='mt-2 text-sm text-red-700'>
                  <p>{error}</p>
                </div>
                <div className='mt-4'>
                  <button
                    type='button'
                    onClick={() => setError(null)}
                    className='bg-red-50 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-4'>
          <input type='file' accept='audio/*' onChange={handleFileChange} className='block' />
          {fileName && <p>Selected: {fileName}</p>}
          <button
            type='submit'
            disabled={!fileName || !file || processing}
            className='rounded-lg border px-4 py-2 disabled:opacity-50'
          >
            {processing ? 'Processing…' : 'Check attribution'}
          </button>
        </form>
        <p className='text-sm text-gray-600'>
          Upload an audio file to run attribution analysis and save results to the database.
        </p>
      </section>
    </>
  );
}
