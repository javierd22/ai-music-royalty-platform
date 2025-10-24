/**
 * TrackCard Component
 *
 * Per PRD Section 5.1: Artist Platform - Track Upload & Fingerprinting
 * Displays track information with verification badges
 */

'use client';

import Link from 'next/link';

import { formatDate } from '@/lib/format';

interface Track {
  id: string;
  title: string;
  storage_url: string;
  artist_id?: string;
  created_at: string;
  updated_at: string;
}

interface TrackCardProps {
  track: Track;
  artistName?: string;
  showActions?: boolean;
  onDelete?: (trackId: string) => void;
}

export function TrackCard({ track, artistName, showActions = false, onDelete }: TrackCardProps) {
  return (
    <div className='golden-border'>
      <div className='golden-border-content'>
        <div className='flex justify-between items-start mb-3'>
          <div className='flex-1'>
            <h3 className='font-semibold text-gray-900 text-lg mb-1'>{track.title}</h3>
            {artistName && <p className='text-sm text-gray-600'>{artistName}</p>}
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-xs bg-green-100 text-green-800 px-2 py-1 rounded'>
              Fingerprinted
            </span>
          </div>
        </div>

        <div className='space-y-2 text-sm text-gray-600'>
          <div className='flex justify-between'>
            <span>Upload Date:</span>
            <span className='font-medium text-gray-900'>{formatDate(track.created_at)}</span>
          </div>
          <div className='flex justify-between'>
            <span>Last Updated:</span>
            <span className='font-medium text-gray-900'>{formatDate(track.updated_at)}</span>
          </div>
        </div>

        {showActions && (
          <div className='mt-4 pt-4 border-t border-gray-200 flex gap-2'>
            <Link
              href={`/artist/tracks/${track.id}`}
              className='flex-1 text-center text-sm font-medium text-gray-900 hover:text-gray-600 underline'
            >
              View Details
            </Link>
            {onDelete && (
              <button
                onClick={() => onDelete(track.id)}
                className='flex-1 text-center text-sm font-medium text-red-600 hover:text-red-800 underline'
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
