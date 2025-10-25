'use client';

type SimilarityMatch = { id: string; title: string; score: number };

interface SimilaritySectionProps {
  checkFile: File | null;
  setCheckFile: (file: File | null) => void;
  checking: boolean;
  onCheck: () => void;
  similarityResults: SimilarityMatch[];
}

export default function SimilaritySection({
  checkFile,
  setCheckFile,
  checking,
  onCheck,
  similarityResults,
}: SimilaritySectionProps) {
  return (
    <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
      <h2 className='text-xl font-semibold mb-4'>Check Similarity</h2>
      <div className='space-y-4'>
        <div>
          <label htmlFor='check-file' className='block text-sm font-medium text-gray-700 mb-2'>
            Audio File to Check
          </label>
          <input
            id='check-file'
            type='file'
            accept='audio/*'
            onChange={e => setCheckFile(e.target.files?.[0] || null)}
            className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500'
          />
        </div>
        <button
          onClick={onCheck}
          disabled={checking || !checkFile}
          className='px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {checking ? 'Checking...' : 'Check Similarity'}
        </button>

        {similarityResults.length > 0 && (
          <div className='mt-6'>
            <h3 className='text-lg font-medium mb-3'>Similarity Results</h3>
            <div className='space-y-3'>
              {similarityResults.map((match, index) => (
                <div
                  key={match.id}
                  className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'
                >
                  <div>
                    <p className='font-medium'>{match.title}</p>
                    <p className='text-sm text-gray-600'>Match #{index + 1}</p>
                  </div>
                  <div className='text-right'>
                    <div className='text-lg font-semibold text-yellow-600'>
                      {Math.round(match.score * 100)}%
                    </div>
                    <div className='w-24 bg-gray-200 rounded-full h-2 mt-1'>
                      <div
                        className='bg-yellow-600 h-2 rounded-full'
                        style={{ width: `${match.score * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
