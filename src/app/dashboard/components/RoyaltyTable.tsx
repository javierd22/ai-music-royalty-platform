/**
 * Royalty Events Table with Filters and Pagination
 *
 * Per PRD Section 5.1: Royalty Ledger - transaction-style table for payouts
 * Per PRD Section 9: Clean data visualization
 */

'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import { formatCurrency, formatDate, formatPercent, truncate } from '@/lib/format';
import type { RoyaltyEventWithTrack } from '@/types/royalties';

interface RoyaltyTableProps {
  events: RoyaltyEventWithTrack[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'paid': {
      return 'bg-green-100 text-green-800';
    }
    case 'approved': {
      return 'bg-blue-100 text-blue-800';
    }
    case 'pending': {
      return 'bg-yellow-100 text-yellow-800';
    }
    case 'disputed': {
      return 'bg-red-100 text-red-800';
    }
    default: {
      return 'bg-gray-100 text-gray-800';
    }
  }
}

export function RoyaltyTable({ events, total, page, pageSize, totalPages }: RoyaltyTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Filter state
  const [minConfidence, setMinConfidence] = useState(searchParams.get('minConfidence') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');

  // Handle filter apply
  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (minConfidence) {
      params.set('minConfidence', minConfidence);
    } else {
      params.delete('minConfidence');
    }

    if (status && status !== 'all') {
      params.set('status', status);
    } else {
      params.delete('status');
    }

    params.set('page', '1'); // Reset to first page

    startTransition(() => {
      router.push(`/dashboard?${params.toString()}`);
    });
  };

  // Handle pagination
  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());

    startTransition(() => {
      router.push(`/dashboard?${params.toString()}`);
    });
  };

  if (events.length === 0) {
    return (
      <div className='golden-border'>
        <div className='golden-border-content text-center py-12'>
          <div className='text-6xl mb-4 opacity-20'>💰</div>
          <h3 className='text-lg font-medium text-gray-900 mb-2'>No Verified Royalty Events Yet</h3>
          <p className='text-gray-600 mb-4'>
            Royalty events are created when both AI SDK logs and auditor detections align (dual
            proof).
          </p>
          <div className='text-sm text-gray-500'>
            <p>To generate events:</p>
            <ol className='mt-2 text-left inline-block'>
              <li>1. Upload audio files to create vector matches</li>
              <li>2. AI partners log track usage via SDK</li>
              <li>3. Attribution auditor verifies dual proof</li>
              <li>4. Verified events appear here</li>
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
              <label
                htmlFor='minConfidence'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Min Confidence
              </label>
              <input
                id='minConfidence'
                type='number'
                min='0'
                max='1'
                step='0.01'
                value={minConfidence}
                onChange={e => setMinConfidence(e.target.value)}
                placeholder='0.85'
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400'
              />
            </div>

            <div className='flex-1 min-w-[200px]'>
              <label
                htmlFor='statusFilter'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Status
              </label>
              <select
                id='statusFilter'
                value={status}
                onChange={e => setStatus(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400'
              >
                <option value='all'>All Statuses</option>
                <option value='pending'>Pending</option>
                <option value='approved'>Approved</option>
                <option value='paid'>Paid</option>
                <option value='disputed'>Disputed</option>
              </select>
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
                  Date Verified
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                  Track
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                  Confidence
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                  Weight
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                  Payout
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                  Status
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                  Action
                </th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {events.map(event => (
                <tr key={event.id} className='hover:bg-gray-50 transition-colors'>
                  <td className='px-4 py-3 text-sm text-gray-900'>
                    {formatDate(event.verified_at, false)}
                  </td>
                  <td className='px-4 py-3 text-sm'>
                    <div className='font-medium text-gray-900'>
                      {truncate(
                        event.track?.title || event.metadata?.track_title || 'Unknown Track',
                        30
                      )}
                    </div>
                    <div className='text-gray-500 text-xs'>
                      {event.track?.artist || event.metadata?.artist || 'Unknown Artist'}
                    </div>
                  </td>
                  <td className='px-4 py-3 text-sm text-gray-900'>
                    {formatPercent(event.match_confidence || 0, 1)}
                  </td>
                  <td className='px-4 py-3 text-sm text-gray-900'>
                    {formatPercent(event.payout_weight, 1)}
                  </td>
                  <td className='px-4 py-3 text-sm font-medium text-gray-900'>
                    {formatCurrency(event.amount)}
                  </td>
                  <td className='px-4 py-3 text-sm'>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}
                    >
                      {event.status}
                    </span>
                  </td>
                  <td className='px-4 py-3 text-sm'>
                    <Link
                      href={`/dashboard/event/${event.id}`}
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
            events
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
