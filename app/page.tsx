'use client';

export default function Home() {
  return (
    <main className='min-h-screen bg-[#fdfbf8] text-gray-900'>
      <header className='flex justify-between items-center px-8 py-4 border-b border-gray-200 bg-[#f9f6f1]/70 backdrop-blur-sm sticky top-0 z-10'>
        <h1 className='font-semibold text-lg'>AI Music Royalty Platform</h1>
        <nav className='space-x-6 text-sm'>
          <a href='/upload' className='hover:underline'>
            Upload
          </a>
          <a href='/results' className='hover:underline'>
            Result
          </a>
          <a href='/tracks' className='hover:underline'>
            Dashboard
          </a>
        </nav>
      </header>

      <section className='max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center px-8 py-20'>
        <div className='space-y-6'>
          <h2 className='text-5xl font-bold leading-tight'>
            The royalty layer for <span className='text-yellow-700'>AI music</span>
          </h2>
          <p className='text-lg text-gray-600 leading-relaxed'>
            Fingerprint songs, verify real influence, and pay artists fairly when AI learns from or
            references their work. Consent, transparency, and audited attribution — all in one
            place.
          </p>
          <div className='flex gap-4 pt-2'>
            <a
              href='/demo'
              className='px-5 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-full shadow-sm transition'
            >
              Try the demo
            </a>
            <a
              href='/tracks'
              className='px-5 py-2.5 border border-gray-300 rounded-full hover:bg-gray-50 transition'
            >
              View dashboard
            </a>
          </div>

          <div className='flex gap-6 text-sm pt-6 text-gray-500'>
            <div className='flex items-center gap-1.5'>
              <span className='w-2 h-2 bg-yellow-600 rounded-full' />
              Artist first
            </div>
            <div className='flex items-center gap-1.5'>
              <span className='w-2 h-2 bg-gray-400 rounded-full' />
              Audited attribution
            </div>
            <div className='flex items-center gap-1.5'>
              <span className='w-2 h-2 bg-gray-300 rounded-full' />
              Transparent payouts
            </div>
          </div>
        </div>

        <aside className='bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6'>
          <h3 className='text-lg font-semibold'>How it works</h3>
          <ol className='list-decimal list-inside space-y-3 text-gray-600 text-sm'>
            <li>Upload your tracks — we create privacy-safe fingerprints.</li>
            <li>Partners send use slips — our auditor verifies real phrase matches.</li>
            <li>Only verified influence gets paid — see it all in your dashboard.</li>
          </ol>
          <div className='flex justify-between text-sm pt-3'>
            <div className='text-center'>
              <p className='font-medium'>Consent</p>
              <p className='text-gray-500'>Opt-in controls</p>
            </div>
            <div className='text-center'>
              <p className='font-medium'>Proof</p>
              <p className='text-gray-500'>Audited matches</p>
            </div>
            <div className='text-center'>
              <p className='font-medium'>Pay</p>
              <p className='text-gray-500'>Auto royalties</p>
            </div>
          </div>
        </aside>
      </section>

      <footer className='text-center text-xs text-gray-400 pb-6'>
        © 2025 AI Music Royalty Platform
      </footer>
    </main>
  );
}
