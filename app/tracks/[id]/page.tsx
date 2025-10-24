import AppShell from '../../components/AppShell';

type Result = {
  id: string;
  track_id: string;
  matches: { trackTitle: string; artist: string; similarity: number; percentInfluence: number }[];
  created_at: string;
};

type Track = { id: string; title: string; storage_url: string; created_at: string };

async function fetchTrack(id: string) {
  const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/tracks`, {
    cache: 'no-store',
  });
  const all = (await r.json()) as Track[];
  return all.find(t => t.id === id) || null;
}

async function fetchResults(id: string) {
  const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/results`, {
    cache: 'no-store',
  });
  const all = (await r.json()) as Result[];
  return all.filter(x => x.track_id === id);
}

export default async function TrackDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const track = await fetchTrack(id);
  const results = await fetchResults(id);

  if (!track) {
    return (
      <AppShell>
        <div className='space-y-6'>
          <h1 className='text-xl'>Track not found</h1>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-semibold'>{track.title}</h1>
          <p className='text-sm opacity-70'>
            Created {new Date(track.created_at).toLocaleString()}
          </p>
        </div>

        <section className='space-y-4'>
          <h2 className='text-xl font-semibold'>Attribution Results</h2>
          {results.length === 0 && <p className='opacity-70'>No results yet</p>}
          {results.map(r => (
            <div
              key={r.id}
              className='bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-2'
            >
              <div className='text-sm opacity-70'>
                Result {new Date(r.created_at).toLocaleString()}
              </div>
              <ul className='space-y-1'>
                {r.matches.map((m, i) => (
                  <li key={i} className='text-sm'>
                    {m.trackTitle} by {m.artist}
                    {'  '}similarity {Math.round(m.similarity * 100)}%{'  '}influence{' '}
                    {Math.round(m.percentInfluence)}%
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
