/**
 * Royalty Dashboard Page (React Server Component)
 *
 * Per PRD Section 5.1: Artist Platform - Results Dashboard & Royalty Ledger
 * Per PRD Section 9: UI/UX Guidelines - Clean data visualization
 *
 * Server component that loads initial data and renders client components
 */

import Link from 'next/link';

import { getRecentResults, getRoyaltyEvents, getRoyaltySummary } from '@/lib/supabase/server';

import { RoyaltyTable } from './components/RoyaltyTable';
import { Summary } from './components/Summary';

interface DashboardPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    minConfidence?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;

  // Parse search params
  const page = Number.parseInt(params.page || '1', 10);
  const pageSize = Number.parseInt(params.pageSize || '10', 10);
  const minConfidence = params.minConfidence ? Number.parseFloat(params.minConfidence) : undefined;

  // Fetch data server-side
  const [summary, paginatedEvents, recentResults] = await Promise.all([
    getRoyaltySummary(),
    getRoyaltyEvents(
      {
        minConfidence,
        status: params.status,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      },
      { page, pageSize }
    ),
    getRecentResults(5),
  ]);

  return (
    <section className='space-y-8 pb-12'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900'>Royalty Dashboard</h1>
          <p className='text-gray-600 mt-1'>
            Track verified royalty events with dual proof verification
          </p>
        </div>
        <div className='flex gap-3'>
          <Link href='/upload' className='golden-border inline-block'>
            <div className='golden-border-content'>Upload Audio</div>
          </Link>
          <Link href='/result' className='golden-border inline-block'>
            <div className='golden-border-content'>View Results</div>
          </Link>
        </div>
      </div>

      {/* Summary KPIs */}
      <Summary summary={summary} />

      {/* Royalty Events Table */}
      <div>
        <h2 className='text-xl font-semibold text-gray-900 mb-4'>Verified Royalty Events</h2>
        <RoyaltyTable
          events={paginatedEvents.events}
          total={paginatedEvents.total}
          page={paginatedEvents.page}
          pageSize={paginatedEvents.pageSize}
          totalPages={paginatedEvents.totalPages}
        />
      </div>

      {/* Recent Results Section */}
      <div>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-xl font-semibold text-gray-900'>Recent Attribution Results</h2>
          <Link
            href='/result'
            className='text-gray-900 hover:text-gray-600 text-sm font-medium underline'
          >
            View All →
          </Link>
        </div>

        {recentResults.length > 0 ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {recentResults.map(result => (
              <div key={result.id} className='golden-border'>
                <div className='golden-border-content'>
                  <div className='flex justify-between items-start mb-2'>
                    <div className='font-medium text-gray-900 text-sm'>
                      {result.metadata?.track_title || 'Unknown Track'}
                    </div>
                    <div className='text-xs text-gray-500'>
                      {new Date(result.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className='text-xs text-gray-600 mb-2'>
                    {result.metadata?.artist || 'Unknown Artist'}
                  </div>

                  <div className='flex gap-4 text-sm'>
                    <div>
                      <div className='text-gray-600 text-xs'>Similarity</div>
                      <div className='font-medium text-gray-900'>
                        {(result.similarity * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className='text-gray-600 text-xs'>Influence</div>
                      <div className='font-medium text-gray-900'>
                        {(result.percent_influence * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className='mt-2 text-xs text-gray-500'>Source: {result.source_file}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='golden-border'>
            <div className='golden-border-content text-center py-8'>
              <div className='text-gray-500 mb-2'>No attribution results yet</div>
              <div className='text-sm text-gray-400'>
                Upload audio files to start detecting influences and generating royalty events
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className='golden-border'>
        <div className='golden-border-content'>
          <div className='flex gap-3'>
            <div className='text-2xl'>ℹ️</div>
            <div className='flex-1'>
              <h3 className='font-semibold text-gray-900 mb-2'>About Dual Proof Verification</h3>
              <p className='text-sm text-gray-600 mb-2'>
                Per PRD Section 5.4, royalty events are only created when{' '}
                <strong>both proofs align</strong>:
              </p>
              <ul className='text-sm text-gray-600 space-y-1 list-disc list-inside'>
                <li>
                  <strong>Proof #1:</strong> Vector similarity detection from /compare endpoint
                  (Auditor)
                </li>
                <li>
                  <strong>Proof #2:</strong> SDK use log from AI partner confirming track usage
                </li>
              </ul>
              <p className='text-sm text-gray-600 mt-2'>
                This ensures &gt;95% detection precision and 99% traceable payouts as specified in
                the PRD.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Enable dynamic rendering for search params
export const dynamic = 'force-dynamic';
