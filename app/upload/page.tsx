'use client';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AppShell from '../components/AppShell';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function checkAuth() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) router.push('/login');
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    checkAuth();
    if (!file || !title) return setStatus('Please select a file and title.');
    setLoading(true);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('tracks')
      .upload(`${Date.now()}-${file.name}`, file);

    if (uploadError) {
      setStatus(uploadError.message);
      setLoading(false);
      return;
    }

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tracks/${uploadData.path}`;
    const { error: dbError } = await supabase.from('tracks').insert({
      title,
      storage_url: publicUrl,
    });

    if (dbError) setStatus(dbError.message);
    else setStatus('Track uploaded successfully!');
    setLoading(false);
  }

  return (
    <AppShell>
      <div className='bg-white p-8 rounded-xl shadow-sm w-[420px] border border-gray-100'>
        <h1 className='text-2xl font-semibold mb-6 text-center'>Upload Track</h1>
        <form onSubmit={handleUpload} className='space-y-4'>
          <input
            type='text'
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder='Track title'
            className='w-full border rounded-lg p-2.5 text-sm'
          />
          <input
            type='file'
            accept='audio/*'
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className='w-full text-sm'
          />
          <button
            type='submit'
            disabled={loading}
            className='w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-lg'
          >
            {loading ? 'Uploading...' : 'Upload'}
          </button>
          {status && <p className='text-center text-sm mt-2'>{status}</p>}
        </form>
      </div>
    </AppShell>
  );
}
