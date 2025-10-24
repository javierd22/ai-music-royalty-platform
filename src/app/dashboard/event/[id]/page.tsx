/**
 * Royalty Event Detail Page (React Server Component)
 *
 * Per PRD Section 5.4: Display complete event with dual proof references
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getResultByRoyaltyEvent, getRoyaltyEventById } from '@/lib/supabase/server';

import { EventDetail } from '../../components/EventDetail';

interface EventDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const event = await getRoyaltyEventById(id);

  if (!event) {
    notFound();
  }

  // Fetch linked result if available
  const result = event.result_id ? await getResultByRoyaltyEvent(event.result_id) : null;

  return (
    <section className='max-w-4xl mx-auto space-y-6 pb-12'>
      {/* Back Navigation */}
      <div>
        <Link
          href='/dashboard'
          className='inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors'
        >
          <span className='mr-2'>←</span>
          Back to Dashboard
        </Link>
      </div>

      {/* Event Detail */}
      <EventDetail event={event} result={result} />
    </section>
  );
}

// Enable dynamic rendering
export const dynamic = 'force-dynamic';
