/**
 * Label Catalog Upload Page
 *
 * Per PRD Section 5.1: Institutional onboarding
 * Per PRD Section 9: Minimal, transparent UI
 *
 * Allows labels/publishers to upload track metadata via CSV
 */

import { Suspense } from 'react';
import CatalogUploader from './components/CatalogUploader';

export const metadata = {
  title: 'Catalog Upload | Label Console',
  description: 'Upload track metadata for your catalog',
};

export default function CatalogUploadPage() {
  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900'>Catalog Upload</h1>
          <p className='mt-2 text-gray-600'>
            Upload track metadata in CSV format to register your catalog.
          </p>
        </div>

        {/* Instructions */}
        <div className='bg-white rounded-lg border border-gray-200 p-6 mb-8'>
          <h2 className='text-lg font-semibold text-gray-900 mb-4'>Upload Instructions</h2>
          <div className='space-y-3 text-sm text-gray-700'>
            <p>
              <strong>Required columns:</strong> title, artist
            </p>
            <p>
              <strong>Optional columns:</strong> isrc, release_date, duration
            </p>
            <p className='text-gray-600 text-xs mt-4'>Example CSV format:</p>
            <pre className='bg-gray-50 p-3 rounded text-xs overflow-x-auto'>
              title,artist,isrc,release_date,duration{'\n'}
              "Neon Dreams","Luna Eclipse","USRC12345678","2024-01-15",180{'\n'}
              "Midnight Groove","The Synth Collective","USRC87654321","2024-02-20",240
            </pre>
          </div>
        </div>

        {/* Uploader Component */}
        <Suspense fallback={<LoadingState />}>
          <CatalogUploader />
        </Suspense>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className='bg-white rounded-lg border border-gray-200 p-12'>
      <div className='flex items-center justify-center'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900'></div>
        <span className='ml-3 text-gray-600'>Loading uploader...</span>
      </div>
    </div>
  );
}
