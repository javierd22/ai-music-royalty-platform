export default function DesignCheck() {
  return (
    <main className='min-h-screen grid place-items-center p-8'>
      <div className='space-y-6 text-center'>
        <h1 className='text-4xl font-bold'>Tailwind ACTIVE ✅</h1>
        <div className='w-32 h-12 bg-yellow-600 rounded-xl shadow-sm grid place-items-center text-white'>
          gold button
        </div>
        <p className='text-gray-600'>If this button is gold and rounded, Tailwind is working.</p>
      </div>
    </main>
  );
}
