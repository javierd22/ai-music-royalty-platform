'use client';
import AppShell from './components/AppShell';

export default function Home() {
  return (
    <AppShell>
      <section className='grid md:grid-cols-2 gap-8 items-center'>
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
              className='px-5 py-2.5 rounded-full shadow-sm transition text-sm btn-primary'
            >
              Try the demo
            </a>
            <a
              href='/dashboard'
              className='px-5 py-2.5 rounded-full transition text-sm btn-outline'
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
          <div className='grid grid-cols-3 gap-3 text-sm pt-3'>
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
    </AppShell>
  );
}
