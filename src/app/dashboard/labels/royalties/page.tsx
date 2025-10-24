/**
 * Royalty Analytics Page
 *
 * Per PRD Section 5.4: Royalty analytics and reporting
 * Per PRD Section 9: Clear data visualization
 *
 * Displays royalty KPIs, charts, and top tracks
 */

import { getRoyaltyAnalytics } from '@/lib/supabase/labels';
import { Suspense } from 'react';
import ExportButton from './components/ExportButton';
import PayoutChart from './components/PayoutChart';
import RoyaltyStats from './components/RoyaltyStats';
import TopTracksTable from './components/TopTracksTable';

export const metadata = {
  title: 'Royalty Analytics | Label Console',
  description: 'Track royalty performance and analytics',
};

export default async function RoyaltiesPage() {
  const analytics = await getRoyaltyAnalytics();

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='flex items-center justify-between mb-8'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900'>Royalty Analytics</h1>
            <p className='mt-2 text-gray-600'>Track verified events and payout performance</p>
          </div>
          <ExportButton />
        </div>

        {/* Stats */}
        <Suspense fallback={<StatsLoading />}>
          <RoyaltyStats analytics={analytics} />
        </Suspense>

        {/* Chart */}
        {analytics.payoutsOverTime.length > 0 && (
          <div className='mt-8'>
            <Suspense fallback={<ChartLoading />}>
              <PayoutChart data={analytics.payoutsOverTime} />
            </Suspense>
          </div>
        )}

        {/* Top Tracks */}
        <div className='mt-8'>
          <Suspense fallback={<TableLoading />}>
            <TopTracksTable tracks={analytics.topTracks} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function StatsLoading() {
  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
      {[...Array(3)].map((_, i) => (
        <div key={i} className='bg-white rounded-lg border border-gray-200 p-6 animate-pulse'>
          <div className='h-4 bg-gray-200 rounded w-32 mb-4'></div>
          <div className='h-8 bg-gray-200 rounded w-20'></div>
        </div>
      ))}
    </div>
  );
}

function ChartLoading() {
  return (
    <div className='bg-white rounded-lg border border-gray-200 p-6 animate-pulse'>
      <div className='h-64 bg-gray-100 rounded'></div>
    </div>
  );
}

function TableLoading() {
  return (
    <div className='bg-white rounded-lg border border-gray-200 p-6 animate-pulse'>
      <div className='h-8 bg-gray-200 rounded w-40 mb-6'></div>
      <div className='space-y-3'>
        {[...Array(10)].map((_, i) => (
          <div key={i} className='h-12 bg-gray-100 rounded'></div>
        ))}
      </div>
    </div>
  );
}
