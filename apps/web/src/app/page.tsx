import Link from 'next/link';

export default function Home() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20'>
        <div className='text-center'>
          <h1 className='text-4xl md:text-6xl font-bold text-gray-900 mb-6'>
            AI Music Royalty Attribution Platform
          </h1>
          <p className='text-xl text-gray-600 mb-8 max-w-3xl mx-auto'>
            The first provenance-first platform that ensures artists receive royalties when AI
            systems use, are influenced by, or reference their music.
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Link
              href='/alpha'
              className='bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors'
            >
              View Alpha Platform
            </Link>
            <Link
              href='/artist/upload'
              className='bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold border border-blue-600 hover:bg-blue-50 transition-colors'
            >
              Upload Music
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
