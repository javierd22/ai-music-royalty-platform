'use client';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import AppShell from '../components/AppShell';
import ProvenanceModal from '../components/ProvenanceModal';
import SimilaritySection from '../components/SimilaritySection';
import { useToast } from '../components/ToastProvider';
import UploadSection from '../components/UploadSection';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type Match = { trackTitle: string; artist: string; similarity: number; percentInfluence: number };
type Result = { id: string; track_id: string; matches: Match[]; created_at: string };
type Track = { id: string; title: string; audio_url: string; created_at: string; user_id?: string };
type SimilarityMatch = { id: string; title: string; score: number };

export default function DashboardPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [resultsByTrack, setResultsByTrack] = useState<Record<string, Result[]>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [similarityResults, setSimilarityResults] = useState<SimilarityMatch[]>([]);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [checkFile, setCheckFile] = useState<File | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showProvenance, setShowProvenance] = useState(false);
  const { showToast } = useToast();

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('audio/')) {
      return 'Please select an audio file';
    }
    if (file.size > 50 * 1024 * 1024) {
      // 50MB limit
      return 'File size must be less than 50MB';
    }
    return null;
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle) {
      showToast('Please provide both title and file', 'error');
      return;
    }

    const validationError = validateFile(uploadFile);
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        // Refresh tracks list
        const { data: t } = await supabase
          .from('tracks')
          .select('*')
          .order('created_at', { ascending: false });
        setTracks(t ?? []);

        // Reset form
        setUploadTitle('');
        setUploadFile(null);
        showToast('Track uploaded successfully!', 'success');
      } else {
        showToast(`Upload failed: ${result.error}`, 'error');
      }
    } catch {
      showToast('Upload failed - please try again', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleCheckSimilarity = async () => {
    if (!checkFile) {
      showToast('Please select a file to check', 'error');
      return;
    }

    const validationError = validateFile(checkFile);
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    setChecking(true);
    try {
      const formData = new FormData();
      formData.append('file', checkFile);

      const response = await fetch('/api/check', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.matches) {
        setSimilarityResults(result.matches);
        showToast(`Found ${result.matches.length} similar tracks`, 'success');
      } else {
        showToast(`Check failed: ${result.error}`, 'error');
      }
    } catch {
      showToast('Check failed - please try again', 'error');
    } finally {
      setChecking(false);
    }
  };

  const handleViewProvenance = (track: Track) => {
    setSelectedTrack(track);
    setShowProvenance(true);
  };

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        globalThis.location.href = '/login';
        return;
      }

      const { data: t } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false });
      setTracks(t ?? []);

      const r = (await fetch('/api/results', { cache: 'no-store' }).then(x =>
        x.json()
      )) as Result[];
      const grouped: Record<string, Result[]> = {};
      for (const res of r) {
        if (!grouped[res.track_id]) {
          grouped[res.track_id] = [];
        }
        grouped[res.track_id].push(res);
      }
      // sort each group newest first
      for (const k of Object.keys(grouped)) {
        const group = grouped[k];
        if (group) {
          group.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
        }
      }
      setResultsByTrack(grouped);
      setLoading(false);
    }
    load();
  }, []);

  if (loading)
    return (
      <AppShell>
        <div>Loading…</div>
      </AppShell>
    );

  return (
    <AppShell>
      <div className='space-y-8'>
        <h1 className='text-3xl font-semibold'>Attribution Dashboard</h1>

        <UploadSection
          uploadTitle={uploadTitle}
          setUploadTitle={setUploadTitle}
          uploadFile={uploadFile}
          setUploadFile={setUploadFile}
          uploading={uploading}
          onUpload={handleUpload}
        />

        <SimilaritySection
          checkFile={checkFile}
          setCheckFile={setCheckFile}
          checking={checking}
          onCheck={handleCheckSimilarity}
          similarityResults={similarityResults}
        />

        {/* My Tracks Section */}
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-2xl font-semibold text-slate-900'>My Tracks</h2>
            <div className='text-sm text-gray-600'>
              {tracks.length} track{tracks.length === 1 ? '' : 's'}
            </div>
          </div>

          {tracks.length === 0 ? (
            <div className='text-center py-12'>
              <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                <svg
                  className='w-8 h-8 text-gray-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3'
                  />
                </svg>
              </div>
              <p className='text-gray-600 mb-2'>No tracks yet</p>
              <p className='text-sm text-gray-500'>Upload your first track above to get started!</p>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {tracks.map(track => (
                <div
                  key={track.id}
                  className='bg-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow'
                >
                  <div className='flex items-start justify-between mb-3'>
                    <div className='flex-1 min-w-0'>
                      <h3 className='font-semibold text-slate-900 truncate'>{track.title}</h3>
                      <p className='text-sm text-gray-600 mt-1'>
                        {new Date(track.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className='ml-2 flex-shrink-0'>
                      <div className='w-2 h-2 bg-emerald-500 rounded-full' title='Verified' />
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-gray-600'>Track ID</span>
                      <span className='font-mono text-xs text-gray-500'>
                        {track.id.slice(0, 8)}...
                      </span>
                    </div>

                    {resultsByTrack[track.id]?.length ? (
                      <div className='bg-white rounded-lg p-3 border'>
                        <p className='text-xs font-medium text-gray-700 mb-2'>Latest Attribution</p>
                        <div className='space-y-1'>
                          {resultsByTrack[track.id][0].matches.slice(0, 2).map((m, i) => (
                            <div
                              key={`${track.id}-match-${i}`}
                              className='flex items-center justify-between text-xs'
                            >
                              <span className='truncate'>{m.trackTitle}</span>
                              <span className='text-emerald-600 font-medium'>
                                {Math.round(m.similarity * 100)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className='bg-gray-100 rounded-lg p-3 text-center'>
                        <p className='text-xs text-gray-500'>No attribution results yet</p>
                      </div>
                    )}
                  </div>

                  <div className='flex space-x-2 mt-4'>
                    <button
                      onClick={() => handleViewProvenance(track)}
                      className='flex-1 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition-colors'
                    >
                      View Provenance
                    </button>
                    <a
                      href={track.audio_url}
                      target='_blank'
                      rel='noreferrer'
                      className='px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors'
                    >
                      Listen
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ProvenanceModal
        track={selectedTrack}
        isOpen={showProvenance}
        onClose={() => {
          setShowProvenance(false);
          setSelectedTrack(null);
        }}
      />
    </AppShell>
  );
}
