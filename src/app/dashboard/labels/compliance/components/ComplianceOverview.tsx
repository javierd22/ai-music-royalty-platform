'use client';

/**
 * Compliance Overview Component
 *
 * Shows high-level compliance statistics
 */

import type { ComplianceReport } from '@/lib/supabase/labels';

interface ComplianceOverviewProps {
  report: ComplianceReport;
}

export default function ComplianceOverview({ report }: ComplianceOverviewProps) {
  const verificationRate =
    report.tracks_registered > 0
      ? (report.tracks_verified_onchain / report.tracks_registered) * 100
      : 0;

  return (
    <div className='bg-white rounded-lg border border-gray-200 p-6'>
      <h2 className='text-lg font-semibold text-gray-900 mb-6'>Compliance Overview</h2>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <div className='border-l-4 border-gray-900 pl-4'>
          <div className='text-sm font-medium text-gray-600 uppercase tracking-wide'>
            Tracks Registered
          </div>
          <div className='mt-1 text-2xl font-bold text-gray-900'>{report.tracks_registered}</div>
        </div>

        <div className='border-l-4 border-green-600 pl-4'>
          <div className='text-sm font-medium text-gray-600 uppercase tracking-wide'>
            Verified On-Chain
          </div>
          <div className='mt-1 text-2xl font-bold text-gray-900'>
            {report.tracks_verified_onchain}
          </div>
          <div className='mt-1 text-sm text-gray-600'>{verificationRate.toFixed(1)}% verified</div>
        </div>

        <div className='border-l-4 border-blue-600 pl-4'>
          <div className='text-sm font-medium text-gray-600 uppercase tracking-wide'>
            Royalty Events
          </div>
          <div className='mt-1 text-2xl font-bold text-gray-900'>{report.royalty_events}</div>
        </div>
      </div>

      <div className='mt-6 text-sm text-gray-600'>
        Report generated: {new Date(report.generated_at).toLocaleString()}
      </div>
    </div>
  );
}
