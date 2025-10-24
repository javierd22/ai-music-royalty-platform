/**
 * ClaimForm Component
 *
 * Per PRD Section 5.1: Artist Platform - Claims Center
 * Form for submitting AI use claims
 */

'use client';

import { useState } from 'react';

interface ClaimFormData {
  title: string;
  description: string;
  trackId?: string;
  fileUrl?: string;
  externalLink?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface ClaimFormProps {
  tracks?: Array<{ id: string; title: string }>;
  onSubmit: (data: ClaimFormData) => Promise<void>;
  onCancel?: () => void;
}

export function ClaimForm({ tracks = [], onSubmit, onCancel }: ClaimFormProps) {
  const [formData, setFormData] = useState<ClaimFormData>({
    title: '',
    description: '',
    trackId: '',
    fileUrl: '',
    externalLink: '',
    priority: 'medium',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.title.trim()) {
      setError('Please provide a title for your claim');
      return;
    }

    if (!formData.description.trim()) {
      setError('Please provide a description of the potential AI use');
      return;
    }

    if (!formData.fileUrl && !formData.externalLink) {
      setError('Please provide either a file URL or external link as evidence');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      // Reset form on success
      setFormData({
        title: '',
        description: '',
        trackId: '',
        fileUrl: '',
        externalLink: '',
        priority: 'medium',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit claim');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      {error && (
        <div className='golden-border bg-red-50'>
          <div className='golden-border-content'>
            <div className='flex gap-2 items-start'>
              <span className='text-red-600'>⚠️</span>
              <p className='text-sm text-red-800'>{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor='title' className='block text-sm font-medium text-gray-900 mb-2'>
          Claim Title <span className='text-red-600'>*</span>
        </label>
        <input
          id='title'
          type='text'
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          placeholder='Brief summary of the claim'
          className='w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent'
          required
        />
      </div>

      {/* Track Selection */}
      {tracks.length > 0 && (
        <div>
          <label htmlFor='trackId' className='block text-sm font-medium text-gray-900 mb-2'>
            Related Track (Optional)
          </label>
          <select
            id='trackId'
            value={formData.trackId}
            onChange={e => setFormData({ ...formData, trackId: e.target.value })}
            className='w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent'
          >
            <option value=''>Select a track (if applicable)</option>
            {tracks.map(track => (
              <option key={track.id} value={track.id}>
                {track.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Description */}
      <div>
        <label htmlFor='description' className='block text-sm font-medium text-gray-900 mb-2'>
          Description <span className='text-red-600'>*</span>
        </label>
        <textarea
          id='description'
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the potential AI use in detail. Include where you found it, what makes you believe it's influenced by your work, and any other relevant context."
          rows={6}
          className='w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent'
          required
        />
        <p className='mt-1 text-xs text-gray-500'>
          Provide as much detail as possible to help with investigation
        </p>
      </div>

      {/* File URL */}
      <div>
        <label htmlFor='fileUrl' className='block text-sm font-medium text-gray-900 mb-2'>
          Audio File URL
        </label>
        <input
          id='fileUrl'
          type='url'
          value={formData.fileUrl}
          onChange={e => setFormData({ ...formData, fileUrl: e.target.value })}
          placeholder='https://example.com/audio-file.mp3'
          className='w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent'
        />
      </div>

      {/* External Link */}
      <div>
        <label htmlFor='externalLink' className='block text-sm font-medium text-gray-900 mb-2'>
          External Link
        </label>
        <input
          id='externalLink'
          type='url'
          value={formData.externalLink}
          onChange={e => setFormData({ ...formData, externalLink: e.target.value })}
          placeholder='https://example.com/ai-generated-track'
          className='w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent'
        />
        <p className='mt-1 text-xs text-gray-500'>
          Link to where the AI-generated content is published
        </p>
      </div>

      {/* Priority */}
      <div>
        <label htmlFor='priority' className='block text-sm font-medium text-gray-900 mb-2'>
          Priority Level
        </label>
        <select
          id='priority'
          value={formData.priority}
          onChange={e =>
            setFormData({ ...formData, priority: e.target.value as ClaimFormData['priority'] })
          }
          className='w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent'
        >
          <option value='low'>Low - Minor similarity</option>
          <option value='medium'>Medium - Notable similarity</option>
          <option value='high'>High - Significant similarity</option>
          <option value='urgent'>Urgent - Copyright infringement</option>
        </select>
      </div>

      {/* Actions */}
      <div className='flex gap-3 pt-4 border-t border-gray-200'>
        {onCancel && (
          <button
            type='button'
            onClick={onCancel}
            className='flex-1 px-6 py-2 border border-gray-300 text-gray-900 rounded-md hover:bg-gray-50 transition-colors'
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
        <button
          type='submit'
          className='flex-1 px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Claim'}
        </button>
      </div>
    </form>
  );
}
