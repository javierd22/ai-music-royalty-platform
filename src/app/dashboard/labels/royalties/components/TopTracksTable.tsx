'use client';

/**
 * Top Tracks Table Component
 *
 * Displays top earning tracks
 */

import { formatCurrency } from '@/lib/format';

interface TopTracksTableProps {
  tracks: Array<{
    track_id: string;
    title: string;
    artist: string;
    event_count: number;
    total_payout: number;
  }>;
}

export default function TopTracksTable({ tracks }: TopTracksTableProps) {
  return (
    <div className='bg-white rounded-lg border border-gray-200'>
      <div className='p-6 border-b border-gray-200'>
        <h2 className='text-lg font-semibold text-gray-900'>Top 20 Earning Tracks</h2>
        <p className='mt-1 text-sm text-gray-600'>Tracks with highest cumulative payouts</p>
      </div>

      {tracks.length === 0 ? (
        <div className='p-12 text-center text-gray-500'>No royalty data available yet</div>
      ) : (
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200'>
            <thead className='bg-gray-50'>
              <tr>
                <th
                  scope='col'
                  className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                >
                  Rank
                </th>
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
                  Events
                </th>
                <th
                  scope='col'
                  className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                >
                  Total Payout
                </th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {tracks.map((track, index) => (
                <tr key={track.track_id} className='hover:bg-gray-50'>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='text-sm font-medium text-gray-900'>#{index + 1}</div>
                  </td>
                  <td className='px-6 py-4'>
                    <div className='text-sm font-medium text-gray-900'>{track.title}</div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='text-sm text-gray-600'>{track.artist}</div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='text-sm text-gray-900'>{track.event_count}</div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='text-sm font-medium text-gray-900'>
                      {formatCurrency(track.total_payout)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
