/**
 * Artist Upload Page
 *
 * Per PRD Section 5.1: Artist Platform
 * Upload music → consent to AI use → view provenance logs + royalty events
 */

'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'react-hot-toast';

interface UploadFormData {
  title: string;
  file: File | null;
  consent: boolean;
  licenseAgreed: boolean;
}

export default function ArtistUploadPage() {
  const [formData, setFormData] = useState<UploadFormData>({
    title: '',
    file: null,
    consent: false,
    licenseAgreed: false,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload an audio file (MP3, WAV, M4A)');
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setFormData(prev => ({ ...prev, file }));
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.file || !formData.title.trim()) {
      toast.error('Please provide a title and select a file');
      return;
    }

    if (!formData.consent) {
      toast.error('You must consent to AI use to upload tracks');
      return;
    }

    if (!formData.licenseAgreed) {
      toast.error('You must agree to the license terms');
      return;
    }

    setIsUploading(true);

    try {
      // Upload file to Supabase Storage
      const fileExt = formData.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `tracks/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(filePath, formData.file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('audio-files').getPublicUrl(filePath);

      // Insert track record
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error: insertError } = await supabase.from('tracks').insert({
        title: formData.title,
        storage_url: publicUrl,
        artist_id: user.id,
        consent: formData.consent,
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        throw insertError;
      }

      // Log consent in ai_use_logs for audit trail
      const { error: logError } = await supabase.from('ai_use_logs').insert({
        track_id: null, // Will be updated after track creation
        model_id: 'artist_consent',
        prompt: 'Artist consent for AI training',
        confidence: 1.0,
        metadata: {
          action: 'consent_given',
          track_title: formData.title,
          consent_type: 'ai_training',
          timestamp: new Date().toISOString(),
        },
      });

      if (logError) {
        console.warn('Failed to log consent:', logError);
      }

      toast.success('Track uploaded successfully!');
      router.push('/artist/dashboard');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload track. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-2xl mx-auto px-4'>
        <div className='bg-white rounded-lg shadow-lg p-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-8'>Upload Your Music</h1>

          <form onSubmit={handleSubmit} className='space-y-6'>
            {/* Track Title */}
            <div>
              <label htmlFor='title' className='block text-sm font-medium text-gray-700 mb-2'>
                Track Title *
              </label>
              <input
                type='text'
                id='title'
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                placeholder='Enter your track title'
                required
              />
            </div>

            {/* File Upload */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Audio File *</label>
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type='file'
                  accept='audio/*'
                  onChange={handleFileInput}
                  className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
                />
                <div className='space-y-2'>
                  <svg
                    className='mx-auto h-12 w-12 text-gray-400'
                    stroke='currentColor'
                    fill='none'
                    viewBox='0 0 48 48'
                  >
                    <path
                      d='M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                  <p className='text-sm text-gray-600'>
                    {formData.file ? (
                      <span className='font-medium text-blue-600'>{formData.file.name}</span>
                    ) : (
                      <>
                        <span className='font-medium'>Click to upload</span> or drag and drop
                      </>
                    )}
                  </p>
                  <p className='text-xs text-gray-500'>MP3, WAV, M4A up to 50MB</p>
                </div>
              </div>
            </div>

            {/* AI Consent Toggle */}
            <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
              <div className='flex items-start'>
                <input
                  type='checkbox'
                  id='consent'
                  checked={formData.consent}
                  onChange={e => setFormData(prev => ({ ...prev, consent: e.target.checked }))}
                  className='mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
                />
                <label htmlFor='consent' className='ml-3 text-sm'>
                  <span className='font-medium text-blue-900'>
                    I consent to my music being used for AI training and generation
                  </span>
                  <p className='text-blue-700 mt-1'>
                    By checking this box, you agree that your music may be used to train AI models
                    and that you will receive royalties when your music influences AI-generated
                    content.
                  </p>
                </label>
              </div>
            </div>

            {/* License Agreement */}
            <div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
              <div className='flex items-start'>
                <input
                  type='checkbox'
                  id='license'
                  checked={formData.licenseAgreed}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, licenseAgreed: e.target.checked }))
                  }
                  className='mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
                />
                <label htmlFor='license' className='ml-3 text-sm'>
                  <span className='font-medium text-gray-900'>
                    I agree to the{' '}
                    <a
                      href='/legal/ai-training-license'
                      target='_blank'
                      className='text-blue-600 hover:text-blue-800 underline'
                    >
                      AI Training License Terms
                    </a>
                  </span>
                  <p className='text-gray-600 mt-1'>
                    This includes the 60/40 revenue split and revocation terms.
                  </p>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className='pt-4'>
              <button
                type='submit'
                disabled={isUploading || !formData.consent || !formData.licenseAgreed}
                className='w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isUploading ? 'Uploading...' : 'Upload Track'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
