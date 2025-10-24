/**
 * Usage Stats Card Component
 *
 * Per PRD Section 5.1: Artist Platform
 * Displays usage statistics and consent status for artist dashboard
 */

'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';

interface UsageStats {
  track_id: string;
  title: string;
  consent: boolean;
  generation_count: number;
  attribution_count: number;
  total_royalties: number;
  track_created_at: string;
}

interface UsageStatsCardProps {
  className?: string;
}

export default function UsageStatsCard({ className = '' }: UsageStatsCardProps) {
  const [stats, setStats] = useState<UsageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const fetchUsageStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch usage stats from the view
      const { data, error: fetchError } = await supabase
        .from('usage_stats')
        .select('*')
        .order('track_created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setStats(data || []);
    } catch (err) {
      console.error('Error fetching usage stats:', err);
      setError('Failed to load usage statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount / 100); // Convert cents to dollars
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className='animate-pulse'>
          <div className='h-6 bg-gray-200 rounded w-1/3 mb-4'></div>
          <div className='space-y-3'>
            <div className='h-4 bg-gray-200 rounded'></div>
            <div className='h-4 bg-gray-200 rounded'></div>
            <div className='h-4 bg-gray-200 rounded'></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className='text-center'>
          <div className='text-red-600 mb-2'>
            <svg
              className='mx-auto h-12 w-12'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
              />
            </svg>
          </div>
          <h3 className='text-lg font-medium text-gray-900 mb-2'>Error Loading Stats</h3>
          <p className='text-gray-600 mb-4'>{error}</p>
          <button
            onClick={fetchUsageStats}
            className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const totalGenerations = stats.reduce((sum, stat) => sum + stat.generation_count, 0);
  const totalAttributions = stats.reduce((sum, stat) => sum + stat.attribution_count, 0);
  const totalRoyalties = stats.reduce((sum, stat) => sum + stat.total_royalties, 0);
  const consentedTracks = stats.filter(stat => stat.consent).length;

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-xl font-semibold text-gray-900'>Usage Statistics</h2>
        <button
          onClick={fetchUsageStats}
          className='text-blue-600 hover:text-blue-800 text-sm font-medium'
        >
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
        <div className='text-center'>
          <div className='text-2xl font-bold text-blue-600'>{stats.length}</div>
          <div className='text-sm text-gray-600'>Total Tracks</div>
        </div>
        <div className='text-center'>
          <div className='text-2xl font-bold text-green-600'>{consentedTracks}</div>
          <div className='text-sm text-gray-600'>AI Enabled</div>
        </div>
        <div className='text-center'>
          <div className='text-2xl font-bold text-purple-600'>{totalGenerations}</div>
          <div className='text-sm text-gray-600'>Generations</div>
        </div>
        <div className='text-center'>
          <div className='text-2xl font-bold text-yellow-600'>{formatCurrency(totalRoyalties)}</div>
          <div className='text-sm text-gray-600'>Earnings</div>
        </div>
      </div>

      {/* Track Details */}
      {stats.length === 0 ? (
        <div className='text-center py-8'>
          <div className='text-gray-400 mb-4'>
            <svg
              className='mx-auto h-12 w-12'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                d='M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3'
              />
            </svg>
          </div>
          <h3 className='text-lg font-medium text-gray-900 mb-2'>No Tracks Yet</h3>
          <p className='text-gray-600 mb-4'>Upload your first track to start earning royalties</p>
          <a
            href='/artist/upload'
            className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            Upload Track
          </a>
        </div>
      ) : (
        <div className='space-y-4'>
          <h3 className='text-lg font-medium text-gray-900'>Track Performance</h3>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Track
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Status
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Generations
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Attributions
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Earnings
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Uploaded
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {stats.map(stat => (
                  <tr key={stat.track_id} className='hover:bg-gray-50'>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm font-medium text-gray-900'>{stat.title}</div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          stat.consent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {stat.consent ? 'AI Enabled' : 'AI Disabled'}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      {stat.generation_count}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      {stat.attribution_count}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      {formatCurrency(stat.total_royalties)}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                      {formatDate(stat.track_created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
