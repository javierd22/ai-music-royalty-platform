/**
 * Label Catalog Management Page
 *
 * Per PRD Section 5.1: Catalog management for labels/publishers
 * Per PRD Section 9: Clear, accessible data tables
 *
 * Displays paginated catalog with verification status
 */

import { getCatalogStats, getLabelTracks } from '@/lib/supabase/labels';
import { Suspense } from 'react';
import CatalogStats from './components/CatalogStats';
import CatalogTable from './components/CatalogTable';

export const metadata = {
  title: 'Catalog Management | Label Console',
  description: 'Manage your registered track catalog',
};

interface CatalogPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    verified?: string;
    artist?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;

  const page = Number.parseInt(params.page || '1', 10);
  const pageSize = Number.parseInt(params.pageSize || '20', 10);

  const filters = {
    verified: params.verified ? params.verified === 'true' : undefined,
    artist: params.artist,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };

  const [stats, paginatedTracks] = await Promise.all([
    getCatalogStats(),
    getLabelTracks(filters, { page, pageSize }),
  ]);

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900'>Catalog Management</h1>
          <p className='mt-2 text-gray-600'>Manage and verify your registered track catalog</p>
        </div>

        {/* Stats */}
        <Suspense fallback={<StatsLoading />}>
          <CatalogStats stats={stats} />
        </Suspense>

        {/* Table */}
        <div className='mt-8'>
          <Suspense fallback={<TableLoading />}>
            <CatalogTable initialData={paginatedTracks} initialFilters={filters} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function StatsLoading() {
  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
      {[...Array(3)].map((_, i) => (
        <div key={i} className='bg-white rounded-lg border border-gray-200 p-6 animate-pulse'>
          <div className='h-4 bg-gray-200 rounded w-24 mb-4'></div>
          <div className='h-8 bg-gray-200 rounded w-16'></div>
        </div>
      ))}
    </div>
  );
}

function TableLoading() {
  return (
    <div className='bg-white rounded-lg border border-gray-200 p-6 animate-pulse'>
      <div className='h-8 bg-gray-200 rounded w-32 mb-6'></div>
      <div className='space-y-3'>
        {[...Array(10)].map((_, i) => (
          <div key={i} className='h-12 bg-gray-100 rounded'></div>
        ))}
      </div>
    </div>
  );
}
