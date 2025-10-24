/**
 * Partner Dashboard Page
 *
 * Per PRD Section 5.2: Partner Platform
 * Displays compliance status, usage analytics, and royalty distributions for AI music generators
 */

'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface UseSlip {
  id: string;
  generator_id: string;
  track_id: string;
  start_time: string;
  end_time: string | null;
  manifest_url: string | null;
  prompt: string | null;
  confidence: number | null;
  metadata: any;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
  track_title?: string;
  manifest_valid?: boolean;
  compliance_status?: 'compliant' | 'non_compliant' | 'pending';
}

interface ProvenanceStats {
  total_generations: number;
  verified_generations: number;
  verification_rate: number;
  compliant_generations: number;
  compliance_rate: number;
}

export default function PartnerDashboard() {
  const [useSlips, setUseSlips] = useState<UseSlip[]>([]);
  const [stats, setStats] = useState<ProvenanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchUseSlips = useCallback(
    async (page: number = 1) => {
      try {
        setLoading(true);
        setError(null);

        // Fetch generation logs with track information
        const { data: generations, error: genError } = await supabase
          .from('generation_logs')
          .select(
            `
          *,
          tracks!inner(title)
        `
          )
          .order('created_at', { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1);

        if (genError) {
          throw genError;
        }

        // Process use slips with additional metadata
        const processedSlips =
          generations?.map(gen => ({
            ...gen,
            track_title: gen.tracks?.title || 'Unknown Track',
            manifest_valid: gen.manifest_url ? true : false, // Simplified validation
            compliance_status: gen.manifest_url ? 'compliant' : ('non_compliant' as const),
          })) || [];

        setUseSlips(processedSlips);
        setCurrentPage(page);
      } catch (err) {
        console.error('Error fetching use slips:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch use slips');
        toast.error('Failed to load use slips');
      } finally {
        setLoading(false);
      }
    },
    [supabase, pageSize]
  );

  const fetchProvenanceStats = useCallback(async () => {
    try {
      // Fetch total generations
      const { count: totalCount, error: totalError } = await supabase
        .from('generation_logs')
        .select('*', { count: 'exact', head: true });

      if (totalError) throw totalError;

      // Fetch verified generations (with manifest)
      const { count: verifiedCount, error: verifiedError } = await supabase
        .from('generation_logs')
        .select('*', { count: 'exact', head: true })
        .not('manifest_url', 'is', null);

      if (verifiedError) throw verifiedError;

      // Fetch compliant generations (with valid manifest)
      const { count: compliantCount, error: compliantError } = await supabase
        .from('generation_logs')
        .select('*', { count: 'exact', head: true })
        .not('manifest_url', 'is', null)
        .not('end_time', 'is', null);

      if (compliantError) throw compliantError;

      const total = totalCount || 0;
      const verified = verifiedCount || 0;
      const compliant = compliantCount || 0;

      setStats({
        total_generations: total,
        verified_generations: verified,
        verification_rate: total > 0 ? (verified / total) * 100 : 0,
        compliant_generations: compliant,
        compliance_rate: total > 0 ? (compliant / total) * 100 : 0,
      });

      setTotalPages(Math.ceil(total / pageSize));
    } catch (err) {
      console.error('Error fetching provenance stats:', err);
      toast.error('Failed to load provenance statistics');
    }
  }, [supabase, pageSize]);

  useEffect(() => {
    fetchUseSlips(1);
    fetchProvenanceStats();
  }, [fetchUseSlips, fetchProvenanceStats]);

  const handlePageChange = (page: number) => {
    fetchUseSlips(page);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getComplianceBadge = (status: string) => {
    const baseClasses = 'inline-flex px-2 py-1 text-xs font-semibold rounded-full';
    switch (status) {
      case 'compliant':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'non_compliant':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (loading && useSlips.length === 0) {
    return (
      <div className='min-h-screen bg-gray-50 py-8'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='animate-pulse'>
            <div className='h-8 bg-gray-200 rounded w-1/3 mb-6'></div>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-8'>
              {[...Array(4)].map((_, i) => (
                <div key={i} className='bg-white rounded-lg shadow p-6'>
                  <div className='h-4 bg-gray-200 rounded w-1/2 mb-2'></div>
                  <div className='h-8 bg-gray-200 rounded w-3/4'></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen bg-gray-50 py-8'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='bg-red-50 border border-red-200 rounded-lg p-6 text-center'>
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
            <h3 className='text-lg font-medium text-red-900 mb-2'>Error Loading Dashboard</h3>
            <p className='text-red-700 mb-4'>{error}</p>
            <button
              onClick={() => {
                fetchUseSlips(1);
                fetchProvenanceStats();
              }}
              className='bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500'
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-7xl mx-auto px-4'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>Partner Dashboard</h1>
          <p className='text-gray-600'>
            Monitor AI generation compliance and provenance verification
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-8'>
            <div className='bg-white rounded-lg shadow p-6'>
              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <div className='w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center'>
                    <svg
                      className='w-5 h-5 text-blue-600'
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
                </div>
                <div className='ml-4'>
                  <p className='text-sm font-medium text-gray-500'>Total Generations</p>
                  <p className='text-2xl font-semibold text-gray-900'>{stats.total_generations}</p>
                </div>
              </div>
            </div>

            <div className='bg-white rounded-lg shadow p-6'>
              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <div className='w-8 h-8 bg-green-100 rounded-md flex items-center justify-center'>
                    <svg
                      className='w-5 h-5 text-green-600'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='2'
                        d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                      />
                    </svg>
                  </div>
                </div>
                <div className='ml-4'>
                  <p className='text-sm font-medium text-gray-500'>Verified</p>
                  <p className='text-2xl font-semibold text-gray-900'>
                    {stats.verified_generations}
                  </p>
                </div>
              </div>
            </div>

            <div className='bg-white rounded-lg shadow p-6'>
              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <div className='w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center'>
                    <svg
                      className='w-5 h-5 text-purple-600'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='2'
                        d='M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
                      />
                    </svg>
                  </div>
                </div>
                <div className='ml-4'>
                  <p className='text-sm font-medium text-gray-500'>Verification Rate</p>
                  <p className='text-2xl font-semibold text-gray-900'>
                    {stats.verification_rate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div className='bg-white rounded-lg shadow p-6'>
              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <div className='w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center'>
                    <svg
                      className='w-5 h-5 text-yellow-600'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='2'
                        d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                      />
                    </svg>
                  </div>
                </div>
                <div className='ml-4'>
                  <p className='text-sm font-medium text-gray-500'>Compliance Rate</p>
                  <p className='text-2xl font-semibold text-gray-900'>
                    {stats.compliance_rate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Use Slips Table */}
        <div className='bg-white rounded-lg shadow'>
          <div className='px-6 py-4 border-b border-gray-200'>
            <h2 className='text-lg font-medium text-gray-900'>Generation Use Slips</h2>
            <p className='text-sm text-gray-500'>
              Track all AI generation events and their compliance status
            </p>
          </div>

          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Generator
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Track
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Status
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Manifest
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Confidence
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Generated
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {useSlips.map(slip => (
                  <tr key={slip.id} className='hover:bg-gray-50'>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm font-medium text-gray-900'>{slip.generator_id}</div>
                      <div className='text-sm text-gray-500'>
                        {slip.idempotency_key.slice(0, 8)}...
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm font-medium text-gray-900'>{slip.track_title}</div>
                      <div className='text-sm text-gray-500'>{slip.track_id.slice(0, 8)}...</div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span className={getComplianceBadge(slip.compliance_status || 'pending')}>
                        {slip.compliance_status || 'pending'}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      {slip.manifest_url ? (
                        <a
                          href={slip.manifest_url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-blue-600 hover:text-blue-800 text-sm font-medium'
                        >
                          View Manifest
                        </a>
                      ) : (
                        <span className='text-gray-400 text-sm'>No Manifest</span>
                      )}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      {slip.confidence ? `${(slip.confidence * 100).toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                      {formatDate(slip.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className='px-6 py-4 border-t border-gray-200 flex items-center justify-between'>
              <div className='text-sm text-gray-700'>
                Showing page {currentPage} of {totalPages}
              </div>
              <div className='flex space-x-2'>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className='px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className='px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
