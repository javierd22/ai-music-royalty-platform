'use client';

/**
 * Catalog Uploader Component
 *
 * Handles CSV drag-and-drop, parsing, and submission
 * Per PRD Section 9: Clear feedback, accessible interactions
 */

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

interface TrackRow {
  title: string;
  artist: string;
  isrc?: string;
  release_date?: string;
  duration?: number;
}

interface ImportResult {
  success: boolean;
  created: number;
  duplicates: number;
  errors: string[];
  message?: string;
}

export default function CatalogUploader() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [parsedTracks, setParsedTracks] = useState<TrackRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const parseCSV = useCallback((text: string): TrackRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const tracks: TrackRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const track: TrackRow = {
        title: '',
        artist: '',
      };

      headers.forEach((header, index) => {
        const value = values[index];
        if (header === 'title') track.title = value;
        else if (header === 'artist') track.artist = value;
        else if (header === 'isrc') track.isrc = value;
        else if (header === 'release_date') track.release_date = value;
        else if (header === 'duration') track.duration = Number.parseInt(value, 10);
      });

      if (track.title && track.artist) {
        tracks.push(track);
      }
    }

    return tracks;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = e => {
        const text = e.target?.result as string;
        const tracks = parseCSV(text);
        setParsedTracks(tracks);
        setResult(null);
      };
      reader.readAsText(file);
    },
    [parseCSV]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.csv')) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleImport = async () => {
    if (parsedTracks.length === 0) return;

    setImporting(true);
    setResult(null);

    try {
      const response = await fetch('/api/labels/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracks: parsedTracks }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success && data.created > 0) {
        // Clear tracks after successful import
        setTimeout(() => {
          setParsedTracks([]);
          router.refresh();
        }, 2000);
      }
    } catch (error) {
      setResult({
        success: false,
        created: 0,
        duplicates: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className='space-y-6'>
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragging ? 'border-gray-900 bg-gray-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className='space-y-4'>
          <svg
            className='mx-auto h-12 w-12 text-gray-400'
            stroke='currentColor'
            fill='none'
            viewBox='0 0 48 48'
            aria-hidden='true'
          >
            <path
              d='M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02'
              strokeWidth={2}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
          <div>
            <label
              htmlFor='file-upload'
              className='cursor-pointer text-gray-900 hover:text-gray-700 font-medium'
            >
              <span>Upload a CSV file</span>
              <input
                id='file-upload'
                name='file-upload'
                type='file'
                accept='.csv'
                className='sr-only'
                onChange={handleFileInput}
              />
            </label>
            <p className='text-gray-500 text-sm mt-1'>or drag and drop</p>
          </div>
          <p className='text-xs text-gray-500'>CSV up to 10MB</p>
        </div>
      </div>

      {/* Parsed Tracks Preview */}
      {parsedTracks.length > 0 && (
        <div className='bg-white rounded-lg border border-gray-200 p-6'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-lg font-semibold text-gray-900'>
              Parsed Tracks ({parsedTracks.length})
            </h3>
            <button
              onClick={() => setParsedTracks([])}
              className='text-sm text-gray-600 hover:text-gray-900'
            >
              Clear
            </button>
          </div>

          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead>
                <tr>
                  <th className='px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase'>
                    Title
                  </th>
                  <th className='px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase'>
                    Artist
                  </th>
                  <th className='px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase'>
                    ISRC
                  </th>
                  <th className='px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase'>
                    Release Date
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200'>
                {parsedTracks.slice(0, 10).map((track, index) => (
                  <tr key={index}>
                    <td className='px-4 py-2 text-sm text-gray-900'>{track.title}</td>
                    <td className='px-4 py-2 text-sm text-gray-600'>{track.artist}</td>
                    <td className='px-4 py-2 text-sm text-gray-600'>{track.isrc || '—'}</td>
                    <td className='px-4 py-2 text-sm text-gray-600'>{track.release_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedTracks.length > 10 && (
              <p className='text-sm text-gray-500 mt-4 text-center'>
                ...and {parsedTracks.length - 10} more tracks
              </p>
            )}
          </div>

          <div className='mt-6 flex justify-end'>
            <button
              onClick={handleImport}
              disabled={importing}
              className='px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {importing ? 'Importing...' : `Import ${parsedTracks.length} Tracks`}
            </button>
          </div>
        </div>
      )}

      {/* Import Result */}
      {result && (
        <div
          className={`rounded-lg border p-6 ${
            result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}
        >
          <div className='flex items-start'>
            {result.success ? (
              <svg
                className='h-5 w-5 text-green-600 mt-0.5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M5 13l4 4L19 7'
                />
              </svg>
            ) : (
              <svg
                className='h-5 w-5 text-red-600 mt-0.5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            )}
            <div className='ml-3 flex-1'>
              <h3
                className={`text-sm font-medium ${
                  result.success ? 'text-green-900' : 'text-red-900'
                }`}
              >
                {result.message || (result.success ? 'Import Successful' : 'Import Failed')}
              </h3>
              {result.success && (
                <div className='mt-2 text-sm text-green-800'>
                  <p>✓ {result.created} tracks created</p>
                  {result.duplicates > 0 && <p>⚠ {result.duplicates} duplicates skipped</p>}
                </div>
              )}
              {result.errors && result.errors.length > 0 && (
                <ul className='mt-2 text-sm text-red-800 space-y-1'>
                  {result.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
