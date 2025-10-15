'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ToastContainer } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabaseClient';
import { logSupabaseError, validateSupabaseConfig } from '@/lib/utils';

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
  const { toasts, dismissToast, showError } = useToast();

  useEffect(() => {
    async function fetchRoyaltyEvents() {
      // Check if environment variables are properly set
      const configCheck = validateSupabaseConfig();
      if (!configCheck.isValid) {
        setError(`Configuration error: ${configCheck.error}`);
        showError(`Configuration error: ${configCheck.error}`);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('royalty_events')
          .select('id, total_amount_cents, splits, created_at')
          .order('created_at', { ascending: false });

        if (error) {
          logSupabaseError('royalty_events fetch', error);
          throw error;
        }
        setEvents(data || []);
      } catch (error_) {
        // Error is already logged by logSupabaseError
        setError('Failed to load royalty events');
        showError('Failed to load royalty events data');
      } finally {
        setLoading(false);
      }
    }

    fetchRoyaltyEvents();
  }, [showError]);

  const totals = useMemo(() => {
    const totalCents = events.reduce((s, e) => s + e.total_amount_cents, 0);
    return { totalCents, formatted: `$${(totalCents / 100).toFixed(2)}` };
  }, [events]);

  if (loading) {
    return (
      <section className='space-y-6'>
        <h1 className='text-2xl font-semibold'>Artist dashboard</h1>
        <div className='golden-border'>
          <div className='golden-border-content'>
            <p className='text-center text-gray-600'>Loading dashboard...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className='space-y-6'>
        <h1 className='text-2xl font-semibold'>Artist dashboard</h1>
        <div className='golden-border'>
          <div className='golden-border-content text-center'>
            <p className='text-gray-700'>Error loading dashboard: {error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <section className='space-y-6'>
        <h1 className='text-2xl font-semibold'>Artist dashboard</h1>
        <div className='golden-border'>
          <div className='golden-border-content'>
            <div className='text-sm text-gray-600'>Lifetime paid plus pending</div>
            <div className='text-3xl font-bold'>{totals.formatted}</div>
          </div>
        </div>

        <div className='space-y-3'>
          <h2 className='text-lg font-medium text-gray-800'>Recent Royalty Events</h2>
          {events.length === 0 && (
            <div className='golden-border'>
              <div className='golden-border-content text-center'>
                <p className='text-gray-700'>
                  No royalty events yet. Upload an audio file and view the Result first.
                </p>
              </div>
            </div>
          )}
          {events.map(e => (
            <div key={e.id} className='golden-border'>
              <div className='golden-border-content'>
                <div className='flex justify-between items-center'>
                  <div className='font-medium text-gray-900'>Event {e.id.slice(0, 8)}</div>
                  <div className='text-lg font-bold text-gray-900'>
                    ${(e.total_amount_cents / 100).toFixed(2)}
                  </div>
                </div>
                <div className='text-sm text-gray-600 mt-1'>
                  {new Date(e.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className='flex gap-4 justify-center pt-4'>
          <Link href='/upload' className='golden-border inline-block'>
            <div className='golden-border-content'>Upload new file</div>
          </Link>
          <Link href='/' className='golden-border inline-block'>
            <div className='golden-border-content'>Home</div>
          </Link>
        </div>
      </section>
    </>
  );
}
