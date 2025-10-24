'use client';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardPage() {
  const router = useRouter();
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) router.push('/login');

      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setTracks(data);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading)
    return (
      <AppShell>
        <div className='flex items-center justify-center min-h-[400px]'>
          <p>Loading...</p>
        </div>
      </AppShell>
    );

  return (
    <AppShell>
      <div className='space-y-6'>
        <h1 className='text-3xl font-semibold'>Your Uploaded Tracks</h1>
        {tracks.length === 0 ? (
          <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center'>
            <p className='text-gray-500'>No tracks uploaded yet.</p>
          </div>
        ) : (
          <ul className='space-y-4'>
            {tracks.map(t => (
              <li key={t.id} className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
                <p className='font-medium text-lg mb-2'>{t.title}</p>
                <a
                  href={t.storage_url}
                  target='_blank'
                  className='text-sm text-yellow-700 hover:underline'
                >
                  View File
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
