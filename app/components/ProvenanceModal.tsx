'use client';
import { useState } from 'react';

interface Track {
  id: string;
  title: string;
  audio_url: string;
  created_at: string;
  user_id?: string;
}

interface ProvenanceModalProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProvenanceModal({ track, isOpen, onClose }: ProvenanceModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !track) return null;

  // Generate manifest
  const manifest = {
    track_id: track.id,
    uploader: 'demo@user.com', // Placeholder for now
    created_at: track.created_at,
    embedding_hash: `sha256_${track.id.slice(0, 8)}...`, // Placeholder hash
    manifest_version: '0.1-beta',
    audio_url: track.audio_url,
    title: track.title,
  };

  const copyManifest = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(manifest, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Handle copy error silently
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black bg-opacity-50'
        onClick={onClose}
        onKeyDown={e => e.key === 'Escape' && onClose()}
        role='button'
        tabIndex={0}
      />

      {/* Modal */}
      <div className='relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden'>
        <div className='p-6 border-b border-gray-200'>
          <div className='flex items-center justify-between'>
            <h2 className='text-2xl font-semibold text-slate-900'>Track Provenance</h2>
            <button onClick={onClose} className='text-gray-400 hover:text-gray-600 text-2xl'>
              ×
            </button>
          </div>
        </div>

        <div className='p-6 space-y-6 max-h-[60vh] overflow-y-auto'>
          {/* Track Info */}
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold text-slate-900'>Track Information</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label htmlFor='track-title' className='text-sm font-medium text-gray-600'>
                  Title
                </label>
                <p id='track-title' className='text-slate-900 font-medium'>
                  {track.title}
                </p>
              </div>
              <div>
                <label htmlFor='track-id' className='text-sm font-medium text-gray-600'>
                  Track ID
                </label>
                <p id='track-id' className='text-slate-900 font-mono text-sm'>
                  {track.id}
                </p>
              </div>
              <div>
                <label htmlFor='track-uploaded' className='text-sm font-medium text-gray-600'>
                  Uploaded
                </label>
                <p id='track-uploaded' className='text-slate-900'>
                  {new Date(track.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <label htmlFor='track-uploader' className='text-sm font-medium text-gray-600'>
                  Uploader
                </label>
                <p id='track-uploader' className='text-slate-900'>
                  demo@user.com
                </p>
              </div>
            </div>
          </div>

          {/* Manifest */}
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <h3 className='text-lg font-semibold text-slate-900'>Provenance Manifest</h3>
              <button
                onClick={copyManifest}
                className='px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium'
              >
                {copied ? 'Copied!' : 'Copy Manifest'}
              </button>
            </div>

            <div className='bg-gray-50 rounded-xl p-4 border'>
              <pre className='text-sm text-gray-800 overflow-x-auto'>
                {JSON.stringify(manifest, null, 2)}
              </pre>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold text-slate-900'>Trust Indicators</h3>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div className='bg-green-50 rounded-xl p-4 border border-green-200'>
                <div className='flex items-center'>
                  <div className='w-3 h-3 bg-green-500 rounded-full mr-3' />
                  <div>
                    <p className='font-medium text-green-900'>Verified Upload</p>
                    <p className='text-sm text-green-700'>Authenticated user</p>
                  </div>
                </div>
              </div>

              <div className='bg-blue-50 rounded-xl p-4 border border-blue-200'>
                <div className='flex items-center'>
                  <div className='w-3 h-3 bg-blue-500 rounded-full mr-3' />
                  <div>
                    <p className='font-medium text-blue-900'>Immutable Record</p>
                    <p className='text-sm text-blue-700'>Blockchain-ready</p>
                  </div>
                </div>
              </div>

              <div className='bg-purple-50 rounded-xl p-4 border border-purple-200'>
                <div className='flex items-center'>
                  <div className='w-3 h-3 bg-purple-500 rounded-full mr-3' />
                  <div>
                    <p className='font-medium text-purple-900'>AI Fingerprint</p>
                    <p className='text-sm text-purple-700'>512-dim embedding</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='p-6 border-t border-gray-200 bg-gray-50'>
          <div className='flex justify-end space-x-3'>
            <button
              onClick={onClose}
              className='px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors'
            >
              Close
            </button>
            <a
              href={track.audio_url}
              target='_blank'
              rel='noreferrer'
              className='px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors'
            >
              Listen to Track
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
