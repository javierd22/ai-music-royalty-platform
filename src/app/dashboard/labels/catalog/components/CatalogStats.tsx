'use client';

/**
 * Catalog Statistics Component
 *
 * Displays KPIs for label catalog
 */

interface CatalogStatsProps {
  stats: {
    totalTracks: number;
    verifiedTracks: number;
    totalArtists: number;
  };
}

export default function CatalogStats({ stats }: CatalogStatsProps) {
  const verificationRate =
    stats.totalTracks > 0 ? (stats.verifiedTracks / stats.totalTracks) * 100 : 0;

  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
      <div className='bg-white rounded-lg border border-gray-200 p-6'>
        <div className='text-sm font-medium text-gray-600 uppercase tracking-wide'>
          Total Tracks
        </div>
        <div className='mt-2 text-3xl font-bold text-gray-900'>{stats.totalTracks}</div>
      </div>

      <div className='bg-white rounded-lg border border-gray-200 p-6'>
        <div className='text-sm font-medium text-gray-600 uppercase tracking-wide'>
          Verified On-Chain
        </div>
        <div className='mt-2 text-3xl font-bold text-gray-900'>{stats.verifiedTracks}</div>
        <div className='mt-2 text-sm text-gray-500'>{verificationRate.toFixed(1)}% of catalog</div>
      </div>

      <div className='bg-white rounded-lg border border-gray-200 p-6'>
        <div className='text-sm font-medium text-gray-600 uppercase tracking-wide'>
          Total Artists
        </div>
        <div className='mt-2 text-3xl font-bold text-gray-900'>{stats.totalArtists}</div>
      </div>
    </div>
  );
}
