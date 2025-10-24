import Link from 'next/link';

type Track = {
  id: string;
  title: string;
  created_at: string;
};

export default async function TracksPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/tracks`, {
    cache: 'no-store',
  });
  const tracks = (await res.json()) as Track[];
  return (
    <main className='p-8 space-y-4'>
      <h1 className='text-2xl font-semibold'>Tracks</h1>
      <ul className='space-y-2'>
        {tracks.map(t => (
          <li key={t.id} className='border rounded p-3'>
            <Link href={`/tracks/${t.id}`} className='underline'>
              {t.title}
            </Link>
            <div className='text-sm opacity-70'>{new Date(t.created_at).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
