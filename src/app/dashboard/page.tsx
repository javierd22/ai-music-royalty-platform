'use client';

import { useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabaseClient';

type RoyaltyEvent = {
  id: string;
  total_amount_cents: number;
  splits: { trackTitle: string; artist: string; percent: number }[];
  created_at: string;
};

export default function DashboardPage() {
  const [events, setEvents] = useState<RoyaltyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRoyaltyEvents() {
      try {
        const { data, error } = await supabase
          .from('royalty_events')
          .select('id, total_amount_cents, splits, created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setEvents(data || []);
      } catch (error_) {
        console.error('Error fetching royalty events:', error_);
        setError('Failed to load royalty events');
      } finally {
        setLoading(false);
      }
    }

    fetchRoyaltyEvents();
  }, []);

  const totals = useMemo(() => {
    const totalCents = events.reduce((s, e) => s + e.total_amount_cents, 0);
    return { totalCents, formatted: `$${(totalCents / 100).toFixed(2)}` };
  }, [events]);

  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  if (error) {
    return <p>Error loading dashboard: {error}</p>;
  }

  return (
    <section className='space-y-6'>
      <h1 className='text-2xl font-semibold'>Artist dashboard</h1>
      <div className='golden-border'>
        <div className='golden-border-content'>
          <div className='text-sm text-gray-600'>Lifetime paid plus pending</div>
          <div className='text-3xl font-bold'>{totals.formatted}</div>
        </div>
      </div>

      <div className='space-y-3'>
        {events.length === 0 && (
          <p>No royalty events yet. Upload an audio file and view the Result first.</p>
        )}
        {events.map(e => (
          <div key={e.id} className='golden-border'>
            <div className='golden-border-content'>
              <div className='font-medium'>Event {e.id.slice(0, 8)}</div>
              <div>Amount: ${(e.total_amount_cents / 100).toFixed(2)}</div>
              <div className='mt-2 space-y-1'>
                {e.splits.map((s, i) => (
                  <div key={i} className='text-sm text-gray-700'>
                    {Math.round(s.percent * 100)}% to {s.artist} for {s.trackTitle}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
