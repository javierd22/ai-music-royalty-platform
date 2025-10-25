'use client';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { hashPrompt } from '../../../lib/hashPrompt';
import partnerSDK, { type ManifestPreview } from '../../../sdk/partner';
import AppShell from '../../components/AppShell';
import ProvenanceModal from '../../components/ProvenanceModal';
import { useToast } from '../../components/ToastProvider';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface Track {
  id: string;
  title: string;
  audio_url: string;
  created_at: string;
}

export default function PartnerSandboxPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const [manifest, setManifest] = useState<ManifestPreview | null>(null);
  const [showManifest, setShowManifest] = useState(false);
  const { showToast } = useToast();

  // Form state
  const [generatorId, setGeneratorId] = useState('demo-generator');
  const [model, setModel] = useState('musicgen-2.0');
  const [prompt, setPrompt] = useState('Generate a jazz fusion track with saxophone');
  const [promptHash, setPromptHash] = useState('');
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [startMs, setStartMs] = useState(0);
  const [endMs, setEndMs] = useState(30_000);
  const [strength, setStrength] = useState(0.8);

  // Initialize SDK
  useEffect(() => {
    partnerSDK.init({
      baseUrl: globalThis.location.origin,
      apiKey: 'DEMO_KEY_123', // Demo key for development
    });
  }, []);

  // Load tracks for selection
  useEffect(() => {
    async function loadTracks() {
      try {
        const { data: tracksData } = await supabase
          .from('tracks')
          .select('id, title, audio_url, created_at')
          .order('created_at', { ascending: false });
        setTracks(tracksData || []);
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    }
    loadTracks();
  }, []);

  // Compute prompt hash when prompt changes
  useEffect(() => {
    if (prompt) {
      hashPrompt(prompt)
        .then(setPromptHash)
        .catch(() => {
          // Handle error silently
        });
    }
  }, [prompt]);

  const handleStartSession = async () => {
    try {
      await partnerSDK.startSession({
        generatorId,
        model,
        promptHash,
      });
      setSessionActive(true);
      showToast('Session started successfully', 'success');
    } catch {
      showToast('Failed to start session', 'error');
    }
  };

  const handleLogUse = async () => {
    try {
      const manifestPreview = await partnerSDK.logUse({
        trackId: selectedTrackId || undefined,
        startMs,
        endMs,
        strength,
      });
      setManifest(manifestPreview);
      setShowManifest(true);
      showToast('Use event logged successfully', 'success');
    } catch {
      showToast('Failed to log use event', 'error');
    }
  };

  const handleEndSession = async () => {
    try {
      await partnerSDK.endSession();
      setSessionActive(false);
      setManifest(null);
      showToast('Session ended successfully', 'success');
    } catch {
      showToast('Failed to end session', 'error');
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className='flex items-center justify-center min-h-64'>
          <div className='text-gray-600'>Loading tracks...</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className='space-y-8'>
        <div className='text-center'>
          <h1 className='text-3xl font-semibold text-slate-900'>Partner SDK Sandbox</h1>
          <p className='text-gray-600 mt-2'>Test the AI Music Royalty Attribution SDK</p>
        </div>

        {/* Session Configuration */}
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6'>
          <h2 className='text-xl font-semibold mb-4'>Session Configuration</h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label
                htmlFor='generator-id'
                className='block text-sm font-medium text-gray-700 mb-2'
              >
                Generator ID
              </label>
              <input
                id='generator-id'
                type='text'
                value={generatorId}
                onChange={e => setGeneratorId(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                placeholder='demo-generator'
              />
            </div>
            <div>
              <label htmlFor='model' className='block text-sm font-medium text-gray-700 mb-2'>
                Model
              </label>
              <input
                id='model'
                type='text'
                value={model}
                onChange={e => setModel(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                placeholder='musicgen-2.0'
              />
            </div>
          </div>
        </div>

        {/* Prompt Configuration */}
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6'>
          <h2 className='text-xl font-semibold mb-4'>Prompt Configuration</h2>
          <div className='space-y-4'>
            <div>
              <label htmlFor='prompt' className='block text-sm font-medium text-gray-700 mb-2'>
                AI Prompt
              </label>
              <textarea
                id='prompt'
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                rows={3}
                placeholder='Generate a jazz fusion track with saxophone'
              />
            </div>
            <div>
              <label htmlFor='prompt-hash' className='block text-sm font-medium text-gray-700 mb-2'>
                Prompt Hash (SHA-256)
              </label>
              <div
                id='prompt-hash'
                className='px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm text-gray-600'
              >
                {promptHash || 'Computing...'}
              </div>
            </div>
          </div>
        </div>

        {/* Use Event Configuration */}
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6'>
          <h2 className='text-xl font-semibold mb-4'>Use Event Configuration</h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label
                htmlFor='track-select'
                className='block text-sm font-medium text-gray-700 mb-2'
              >
                Track (Optional)
              </label>
              <select
                id='track-select'
                value={selectedTrackId}
                onChange={e => setSelectedTrackId(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
              >
                <option value=''>No track selected</option>
                {tracks.map(track => (
                  <option key={track.id} value={track.id}>
                    {track.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor='strength' className='block text-sm font-medium text-gray-700 mb-2'>
                Strength (0.0 - 1.0)
              </label>
              <input
                id='strength'
                type='number'
                min='0'
                max='1'
                step='0.1'
                value={strength}
                onChange={e => setStrength(Number.parseFloat(e.target.value))}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
              />
            </div>
            <div>
              <label htmlFor='start-ms' className='block text-sm font-medium text-gray-700 mb-2'>
                Start (ms)
              </label>
              <input
                id='start-ms'
                type='number'
                value={startMs}
                onChange={e => setStartMs(Number.parseInt(e.target.value))}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
              />
            </div>
            <div>
              <label htmlFor='end-ms' className='block text-sm font-medium text-gray-700 mb-2'>
                End (ms)
              </label>
              <input
                id='end-ms'
                type='number'
                value={endMs}
                onChange={e => setEndMs(Number.parseInt(e.target.value))}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
              />
            </div>
          </div>
        </div>

        {/* SDK Actions */}
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6'>
          <h2 className='text-xl font-semibold mb-4'>SDK Actions</h2>
          <div className='flex flex-wrap gap-4'>
            <button
              onClick={handleStartSession}
              disabled={sessionActive}
              className='px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {sessionActive ? 'Session Active' : 'Start Session'}
            </button>

            <button
              onClick={handleLogUse}
              disabled={!sessionActive}
              className='px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              Log Use Event
            </button>

            <button
              onClick={handleEndSession}
              disabled={!sessionActive}
              className='px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              End Session
            </button>
          </div>
        </div>

        {/* Manifest Preview */}
        {manifest && (
          <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6'>
            <h2 className='text-xl font-semibold mb-4'>Latest Manifest Preview</h2>
            <div className='bg-gray-50 rounded-xl p-4 border'>
              <pre className='text-sm text-gray-800 overflow-x-auto'>
                {JSON.stringify(manifest, null, 2)}
              </pre>
            </div>
            <div className='mt-4 flex gap-3'>
              <button
                onClick={() => setShowManifest(true)}
                className='px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors'
              >
                View Full Manifest
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(manifest, null, 2))}
                className='px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors'
              >
                Copy Manifest
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manifest Modal */}
      <ProvenanceModal
        track={
          manifest
            ? {
                id: manifest.event_id,
                title: `Use Event - ${manifest.generator_id}`,
                audio_url: '',
                created_at: manifest.created_at,
              }
            : null
        }
        isOpen={showManifest}
        onClose={() => setShowManifest(false)}
      />
    </AppShell>
  );
}
