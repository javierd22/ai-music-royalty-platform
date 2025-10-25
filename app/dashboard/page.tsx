'use client';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import AppShell from '../components/AppShell';
import SimilaritySection from '../components/SimilaritySection';
import UploadSection from '../components/UploadSection';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type Match = { trackTitle: string; artist: string; similarity: number; percentInfluence: number };
type Result = { id: string; track_id: string; matches: Match[]; created_at: string };
type Track = { id: string; title: string; storage_url: string; created_at: string };
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

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle) return;

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
        alert('Track uploaded successfully!');
      } else {
        alert(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCheckSimilarity = async () => {
    if (!checkFile) return;

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
      } else {
        alert(`Check failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Check error:', error);
      alert('Check failed');
    } finally {
      setChecking(false);
    }
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
        grouped[k].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
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

        {/* Your Tracks Section */}
        <div>
          <h2 className='text-2xl font-semibold mb-4'>Your Uploaded Tracks</h2>
          {tracks.length === 0 ? (
            <p className='text-gray-600'>
              No tracks yet. Upload your first track above to get started!
            </p>
          ) : (
            <ul className='space-y-4'>
              {tracks.map(t => (
                <li key={t.id} className='bg-white rounded-xl shadow-sm border border-gray-100 p-5'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='font-medium'>{t.title}</p>
                      <a
                        href={t.storage_url}
                        target='_blank'
                        className='text-sm text-yellow-700 underline'
                        rel='noreferrer'
                      >
                        Open file
                      </a>
                    </div>
                    <a
                      href={`/tracks/${t.id}`}
                      className='px-3 py-1.5 border rounded-full text-sm hover:bg-gray-50'
                    >
                      View details
                    </a>
                  </div>

                  <div className='mt-4'>
                    <p className='text-sm text-gray-600 mb-2'>Latest attribution</p>
                    {resultsByTrack[t.id]?.length ? (
                      <ul className='space-y-1 text-sm'>
                        {resultsByTrack[t.id][0].matches.map((m, i) => (
                          <li key={`${t.id}-${i}`} className='flex flex-wrap gap-2'>
                            <span className='font-medium'>{m.trackTitle}</span> by {m.artist}
                            <span className='opacity-70'>
                              • similarity {Math.round(m.similarity * 100)}%
                            </span>
                            <span className='opacity-70'>
                              • influence {Math.round(m.percentInfluence)}%
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className='text-sm text-gray-500'>No results yet</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
