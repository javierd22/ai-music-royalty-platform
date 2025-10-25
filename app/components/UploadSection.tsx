'use client';

interface UploadSectionProps {
  uploadTitle: string;
  setUploadTitle: (title: string) => void;
  uploadFile: File | null;
  setUploadFile: (file: File | null) => void;
  uploading: boolean;
  onUpload: () => void;
}

export default function UploadSection({
  uploadTitle,
  setUploadTitle,
  uploadFile,
  setUploadFile,
  uploading,
  onUpload,
}: UploadSectionProps) {
  return (
    <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
      <h2 className='text-xl font-semibold mb-4'>Upload Track</h2>
      <div className='space-y-4'>
        <div>
          <label htmlFor='upload-title' className='block text-sm font-medium text-gray-700 mb-2'>
            Track Title
          </label>
          <input
            id='upload-title'
            type='text'
            value={uploadTitle}
            onChange={e => setUploadTitle(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500'
            placeholder='Enter track title'
          />
        </div>
        <div>
          <label htmlFor='upload-file' className='block text-sm font-medium text-gray-700 mb-2'>
            Audio File
          </label>
          <input
            id='upload-file'
            type='file'
            accept='audio/*'
            onChange={e => setUploadFile(e.target.files?.[0] || null)}
            className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500'
          />
        </div>
        <button
          onClick={onUpload}
          disabled={uploading || !uploadFile || !uploadTitle}
          className='px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {uploading ? 'Uploading...' : 'Upload Track'}
        </button>
      </div>
    </div>
  );
}
