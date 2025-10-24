'use client';

/**
 * Royalty Statistics Component
 *
 * Displays KPIs for royalty performance
 */

import { formatCurrency, formatScore } from '@/lib/format';
import type { RoyaltyAnalytics } from '@/lib/supabase/labels';

interface RoyaltyStatsProps {
  analytics: RoyaltyAnalytics;
}

export default function RoyaltyStats({ analytics }: RoyaltyStatsProps) {
  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
      <div className='bg-white rounded-lg border border-gray-200 p-6'>
        <div className='text-sm font-medium text-gray-600 uppercase tracking-wide'>
          Total Verified Events
        </div>
        <div className='mt-2 text-3xl font-bold text-gray-900'>{analytics.totalEvents}</div>
        <div className='mt-2 text-sm text-gray-500'>
          Attribution events confirmed via dual proof
        </div>
      </div>

      <div className='bg-white rounded-lg border border-gray-200 p-6'>
        <div className='text-sm font-medium text-gray-600 uppercase tracking-wide'>
          Total Estimated Payout
        </div>
        <div className='mt-2 text-3xl font-bold text-gray-900'>
          {formatCurrency(analytics.totalPayoutCents)}
        </div>
        <div className='mt-2 text-sm text-gray-500'>Cumulative royalties from verified events</div>
      </div>

      <div className='bg-white rounded-lg border border-gray-200 p-6'>
        <div className='text-sm font-medium text-gray-600 uppercase tracking-wide'>
          Average Confidence
        </div>
        <div className='mt-2 text-3xl font-bold text-gray-900'>
          {formatScore(analytics.averageConfidence)}
        </div>
        <div className='mt-2 text-sm text-gray-500'>Mean similarity score across events</div>
      </div>
    </div>
  );
}
