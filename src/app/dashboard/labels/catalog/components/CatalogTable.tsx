'use client';

/**
 * Catalog Table Component
 *
 * Displays paginated tracks with filters
 * Per PRD Section 9: Accessible, clear data presentation
 */

import { formatDate } from '@/lib/format';
import type { LabelTrack } from '@/lib/supabase/labels';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

interface CatalogTableProps {
  initialData: {
    tracks: LabelTrack[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  initialFilters: {
    verified?: boolean;
    artist?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export default function CatalogTable({ initialData, initialFilters }: CatalogTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [verified, setVerified] = useState<string>(
    initialFilters.verified !== undefined ? String(initialFilters.verified) : 'all'
  );
  const [artist, setArtist] = useState(initialFilters.artist || '');

  const updateFilters = () => {
    const params = new URLSearchParams(searchParams?.toString());

    if (verified !== 'all') {
      params.set('verified', verified);
    } else {
      params.delete('verified');
    }

    if (artist.trim()) {
      params.set('artist', artist.trim());
    } else {
      params.delete('artist');
    }

    params.delete('page'); // Reset to page 1 on filter change

    startTransition(() => {
      router.push(`/dashboard/labels/catalog?${params.toString()}`);
    });
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set('page', String(newPage));

    startTransition(() => {
      router.push(`/dashboard/labels/catalog?${params.toString()}`);
    });
  };

  return (
    <div className='bg-white rounded-lg border border-gray-200'>
      {/* Filters */}
      <div className='p-6 border-b border-gray-200'>
        <h2 className='text-lg font-semibold text-gray-900 mb-4'>Filters</h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div>
            <label
              htmlFor='verified-filter'
              className='block text-sm font-medium text-gray-700 mb-1'
            >
              Verification Status
            </label>
            <select
              id='verified-filter'
              value={verified}
              onChange={e => setVerified(e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-900'
            >
              <option value='all'>All Tracks</option>
              <option value='true'>Verified On-Chain</option>
              <option value='false'>Not Verified</option>
            </select>
          </div>

          <div>
            <label htmlFor='artist-filter' className='block text-sm font-medium text-gray-700 mb-1'>
              Artist
            </label>
            <input
              id='artist-filter'
              type='text'
              value={artist}
              onChange={e => setArtist(e.target.value)}
              placeholder='Filter by artist name...'
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-900'
            />
          </div>

          <div className='flex items-end'>
            <button
              onClick={updateFilters}
              disabled={isPending}
              className='px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors'
            >
              {isPending ? 'Applying...' : 'Apply Filters'}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className='overflow-x-auto'>
        <table className='min-w-full divide-y divide-gray-200'>
          <thead className='bg-gray-50'>
            <tr>
              <th
                scope='col'
                className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
              >
                Title
              </th>
              <th
                scope='col'
                className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
              >
                Artist
              </th>
              <th
                scope='col'
                className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
              >
                ISRC
              </th>
              <th
                scope='col'
                className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
              >
                Added
              </th>
              <th
                scope='col'
                className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
              >
                Verification
              </th>
            </tr>
          </thead>
          <tbody className='bg-white divide-y divide-gray-200'>
            {initialData.tracks.length === 0 ? (
              <tr>
                <td colSpan={5} className='px-6 py-12 text-center'>
                  <div className='text-gray-500'>
                    <p className='text-lg font-medium mb-2'>No tracks found</p>
                    <p className='text-sm'>
                      Try adjusting your filters or{' '}
                      <a href='/dashboard/labels/upload' className='text-gray-900 hover:underline'>
                        upload your catalog
                      </a>
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              initialData.tracks.map(track => (
                <tr key={track.id} className='hover:bg-gray-50'>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='text-sm font-medium text-gray-900'>{track.title}</div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='text-sm text-gray-600'>{track.artist}</div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='text-sm text-gray-600 font-mono'>{track.isrc || '—'}</div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='text-sm text-gray-600'>{formatDate(track.created_at)}</div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    {track.tx_hash ? (
                      <span className='inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800'>
                        ✓ Verified On-Chain
                      </span>
                    ) : (
                      <span className='inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600'>
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {initialData.totalPages > 1 && (
        <div className='px-6 py-4 border-t border-gray-200 flex items-center justify-between'>
          <div className='text-sm text-gray-700'>
            Showing page {initialData.page} of {initialData.totalPages} ({initialData.total} total
            tracks)
          </div>
          <div className='flex gap-2'>
            <button
              onClick={() => handlePageChange(initialData.page - 1)}
              disabled={initialData.page === 1 || isPending}
              className='px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(initialData.page + 1)}
              disabled={initialData.page === initialData.totalPages || isPending}
              className='px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
