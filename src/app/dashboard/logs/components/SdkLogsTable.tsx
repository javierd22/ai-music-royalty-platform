/**
 * SDK Logs Table Component
 * Per PRD Section 5.2: AI Partner SDK
 */

'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import { DualProofBadge } from '@/components/DualProofBadge';
import { formatDate, truncate } from '@/lib/format';
import type { SdkLogWithDualProof } from '@/types/sdk';

interface SdkLogsTableProps {
  logs: SdkLogWithDualProof[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function SdkLogsTable({ logs, total, page, pageSize, totalPages }: SdkLogsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Filter state
  const [modelId, setModelId] = useState(searchParams.get('modelId') || '');
  const [trackId, setTrackId] = useState(searchParams.get('trackId') || '');

  // Handle filter apply
  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (modelId) {
      params.set('modelId', modelId);
    } else {
      params.delete('modelId');
    }

    if (trackId) {
      params.set('trackId', trackId);
    } else {
      params.delete('trackId');
    }

    params.set('page', '1'); // Reset to first page

    startTransition(() => {
      router.push(`/dashboard/logs?${params.toString()}`);
    });
  };

  // Handle pagination
  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());

    startTransition(() => {
      router.push(`/dashboard/logs?${params.toString()}`);
    });
  };

  if (logs.length === 0) {
    return (
      <div className='golden-border'>
        <div className='golden-border-content text-center py-12'>
          <div className='text-6xl mb-4 opacity-20'>📝</div>
          <h3 className='text-lg font-medium text-gray-900 mb-2'>No SDK Logs Yet</h3>
          <p className='text-gray-600 mb-4'>
            SDK logs are created when AI partners log track usage via the API.
          </p>
          <div className='text-sm text-gray-500'>
            <p>To create SDK logs:</p>
            <ol className='mt-2 text-left inline-block list-decimal list-inside'>
              <li>AI partner integrates SDK (see sdk/use_slip.py)</li>
              <li>Partner calls log_use() when generating music</li>
              <li>Logs appear here with dual proof status</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Filters */}
      <div className='golden-border'>
        <div className='golden-border-content'>
          <div className='flex flex-wrap gap-4 items-end'>
            <div className='flex-1 min-w-[200px]'>
              <label htmlFor='modelId' className='block text-sm font-medium text-gray-700 mb-1'>
                Model ID
              </label>
              <input
                id='modelId'
                type='text'
                value={modelId}
                onChange={e => setModelId(e.target.value)}
                placeholder='e.g., suno-v3'
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400'
              />
            </div>

            <div className='flex-1 min-w-[200px]'>
              <label htmlFor='trackId' className='block text-sm font-medium text-gray-700 mb-1'>
                Track ID (UUID)
              </label>
              <input
                id='trackId'
                type='text'
                value={trackId}
                onChange={e => setTrackId(e.target.value)}
                placeholder='Filter by track UUID'
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400'
              />
            </div>

            <button
              onClick={applyFilters}
              disabled={isPending}
              className='px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {isPending ? 'Applying...' : 'Apply Filters'}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className='golden-border overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                  Created At
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                  Model ID
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                  Track ID
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                  Confidence
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                  Dual Proof
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                  Action
                </th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {logs.map(log => (
                <tr key={log.id} className='hover:bg-gray-50 transition-colors'>
                  <td className='px-4 py-3 text-sm text-gray-900'>
                    {formatDate(log.created_at, true)}
                  </td>
                  <td className='px-4 py-3 text-sm'>
                    <div className='font-medium text-gray-900'>{log.model_id}</div>
                    {log.prompt && (
                      <div className='text-xs text-gray-500 mt-1'>{truncate(log.prompt, 50)}</div>
                    )}
                  </td>
                  <td className='px-4 py-3 text-sm font-mono text-gray-600'>
                    {log.track_id.slice(0, 8)}...
                  </td>
                  <td className='px-4 py-3 text-sm text-gray-900'>
                    {log.confidence === null ? 'N/A' : `${(log.confidence * 100).toFixed(1)}%`}
                  </td>
                  <td className='px-4 py-3 text-sm'>
                    <DualProofBadge status={log.dual_proof_status} />
                  </td>
                  <td className='px-4 py-3 text-sm'>
                    <Link
                      href={`/dashboard/logs/${log.id}`}
                      className='text-gray-900 hover:text-gray-600 font-medium underline'
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='flex items-center justify-between'>
          <div className='text-sm text-gray-600'>
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}{' '}
            logs
          </div>

          <div className='flex gap-2'>
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || isPending}
              className='px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              Previous
            </button>

            <div className='flex items-center gap-1'>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    disabled={isPending}
                    className={`px-3 py-2 rounded-md transition-colors ${
                      page === pageNum
                        ? 'bg-gray-900 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages || isPending}
              className='px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
