/**
 * SDK Logs Dashboard Page (React Server Component)
 *
 * Per PRD Section 5.2: AI Partner SDK
 * Lists AI partner SDK logs with dual proof status indicators
 */

import Link from 'next/link';

import { getSdkLogs } from '@/lib/supabase/server';

import { SdkLogsTable } from './components/SdkLogsTable';

interface SdkLogsPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    trackId?: string;
    modelId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function SdkLogsPage({ searchParams }: SdkLogsPageProps) {
  const params = await searchParams;

  // Parse search params
  const page = Number.parseInt(params.page || '1', 10);
  const pageSize = Number.parseInt(params.pageSize || '20', 10);

  // Fetch SDK logs server-side
  const paginatedLogs = await getSdkLogs(
    {
      trackId: params.trackId,
      modelId: params.modelId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    },
    { page, pageSize }
  );

  return (
    <section className='space-y-6 pb-12'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900'>SDK Logs</h1>
          <p className='text-gray-600 mt-1'>
            AI Partner SDK usage logs with dual proof verification status
          </p>
        </div>
        <div className='flex gap-3'>
          <Link href='/dashboard' className='golden-border inline-block'>
            <div className='golden-border-content'>← Dashboard</div>
          </Link>
        </div>
      </div>

      {/* SDK Logs Table */}
      <SdkLogsTable
        logs={paginatedLogs.logs}
        total={paginatedLogs.total}
        page={paginatedLogs.page}
        pageSize={paginatedLogs.pageSize}
        totalPages={paginatedLogs.totalPages}
      />

      {/* Info Box */}
      <div className='golden-border'>
        <div className='golden-border-content'>
          <div className='flex gap-3'>
            <div className='text-2xl'>📝</div>
            <div className='flex-1'>
              <h3 className='font-semibold text-gray-900 mb-2'>About SDK Logs</h3>
              <p className='text-sm text-gray-600 mb-2'>
                Per PRD Section 5.2, AI partners log track usage via SDK with{' '}
                <code className='bg-gray-100 px-1 rounded'>
                  &#123; modelID, prompt, trackID, timestamp, confidence &#125;
                </code>
              </p>
              <p className='text-sm text-gray-600 mb-2'>
                <strong>Dual Proof Status:</strong>
              </p>
              <ul className='text-sm text-gray-600 space-y-1 list-disc list-inside pl-4'>
                <li>
                  <strong>Confirmed:</strong> SDK log + auditor detection + royalty event created
                </li>
                <li>
                  <strong>Pending:</strong> SDK log + auditor detection align, awaiting royalty
                  event
                </li>
                <li>
                  <strong>None:</strong> No auditor detection found within time window or below
                  threshold
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Enable dynamic rendering
export const dynamic = 'force-dynamic';
