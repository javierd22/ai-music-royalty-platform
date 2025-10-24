/**
 * Summary KPI tiles for Royalty Dashboard
 *
 * Per PRD Section 5.1: Royalty Ledger shows verified events and payout history
 * Per PRD Section 9: Clean data visualization (royalty stats)
 */

'use client';

import { formatCompactNumber, formatCurrency, formatPercent } from '@/lib/format';
import type { RoyaltySummary } from '@/types/royalties';

interface SummaryProps {
  summary: RoyaltySummary;
}

export function Summary({ summary }: SummaryProps) {
  const tiles = [
    {
      label: 'Total Verified Events',
      value: formatCompactNumber(summary.totalEvents),
      description: `${summary.pendingEvents} pending, ${summary.paidEvents} paid`,
      icon: '📊',
    },
    {
      label: 'Estimated Payout',
      value: formatCurrency(summary.totalPayoutCents / 100),
      description: 'Based on verified matches',
      icon: '💰',
    },
    {
      label: 'Avg Match Confidence',
      value: formatPercent(summary.avgConfidence, 1),
      description: 'Dual proof verification',
      icon: '✓',
    },
  ];

  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
      {tiles.map((tile, index) => (
        <div key={index} className='golden-border'>
          <div className='golden-border-content'>
            <div className='flex items-start justify-between'>
              <div className='flex-1'>
                <div className='text-sm text-gray-600 mb-1'>{tile.label}</div>
                <div className='text-3xl font-bold text-gray-900 mb-1'>{tile.value}</div>
                <div className='text-xs text-gray-500'>{tile.description}</div>
              </div>
              <div className='text-3xl opacity-20'>{tile.icon}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
