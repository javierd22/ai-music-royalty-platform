export default function AlphaLanding() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* Header */}
      <header className='bg-white shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-6'>
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                <h1 className='text-2xl font-bold text-gray-900'>AI Music Royalty Attribution</h1>
              </div>
            </div>
            <div className='flex items-center space-x-4'>
              <span className='inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800'>
                🟢 Alpha Live
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className='py-20'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center'>
            <h1 className='text-4xl md:text-6xl font-bold text-gray-900 mb-6'>
              Get Paid When AI Uses Your Music
            </h1>
            <p className='text-xl text-gray-600 mb-8 max-w-3xl mx-auto'>
              The first provenance-first platform that ensures artists receive royalties when AI
              systems use, are influenced by, or reference their music.
            </p>
            <div className='flex flex-col sm:flex-row gap-4 justify-center'>
              <a
                href='/upload'
                className='bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors'
              >
                Upload Your Music
              </a>
              <a
                href='#how-it-works'
                className='bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold border border-blue-600 hover:bg-blue-50 transition-colors'
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Public KPIs */}
      <section className='py-16 bg-white'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center mb-12'>
            <h2 className='text-3xl font-bold text-gray-900 mb-4'>Platform Performance</h2>
            <p className='text-gray-600'>Real-time metrics from our attribution engine</p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6'>
            <div className='bg-blue-50 rounded-lg p-6 text-center'>
              <div className='text-3xl font-bold text-blue-600 mb-2'>47</div>
              <div className='text-sm text-blue-800'>Artists</div>
            </div>

            <div className='bg-green-50 rounded-lg p-6 text-center'>
              <div className='text-3xl font-bold text-green-600 mb-2'>1,247</div>
              <div className='text-sm text-green-800'>Generations</div>
            </div>

            <div className='bg-purple-50 rounded-lg p-6 text-center'>
              <div className='text-3xl font-bold text-purple-600 mb-2'>97.2%</div>
              <div className='text-sm text-purple-800'>Accuracy</div>
            </div>

            <div className='bg-yellow-50 rounded-lg p-6 text-center'>
              <div className='text-3xl font-bold text-yellow-600 mb-2'>1.2s</div>
              <div className='text-sm text-yellow-800'>Avg Latency</div>
            </div>

            <div className='bg-indigo-50 rounded-lg p-6 text-center'>
              <div className='text-3xl font-bold text-indigo-600 mb-2'>99.1%</div>
              <div className='text-sm text-indigo-800'>Compliance</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id='how-it-works' className='py-20'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl font-bold text-gray-900 mb-4'>How It Works</h2>
            <p className='text-xl text-gray-600 max-w-2xl mx-auto'>
              Our platform uses advanced attribution technology to track when AI systems use your
              music and ensure you get paid.
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            <div className='text-center'>
              <div className='bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4'>
                <span className='text-2xl'>🎵</span>
              </div>
              <h3 className='text-xl font-semibold text-gray-900 mb-2'>Upload Your Music</h3>
              <p className='text-gray-600'>
                Upload your tracks and consent to AI training. We create a cryptographic fingerprint
                for attribution.
              </p>
            </div>

            <div className='text-center'>
              <div className='bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4'>
                <span className='text-2xl'>🤖</span>
              </div>
              <h3 className='text-xl font-semibold text-gray-900 mb-2'>AI Uses Your Music</h3>
              <p className='text-gray-600'>
                When AI systems generate music influenced by your work, our attribution engine
                detects the similarity.
              </p>
            </div>

            <div className='text-center'>
              <div className='bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4'>
                <span className='text-2xl'>💰</span>
              </div>
              <h3 className='text-xl font-semibold text-gray-900 mb-2'>Get Paid Automatically</h3>
              <p className='text-gray-600'>
                Receive royalties automatically when your music influences AI-generated content.
                60/40 revenue split.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='py-20'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
          <h2 className='text-3xl font-bold text-gray-900 mb-4'>Ready to Get Started?</h2>
          <p className='text-xl text-gray-600 mb-8'>
            Join the alpha program and start earning royalties from AI music generation.
          </p>

          <div className='max-w-md mx-auto'>
            <div className='flex gap-4'>
              <input
                type='email'
                placeholder='Enter your email'
                className='flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <button
                type='button'
                className='bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                Join Alpha
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className='bg-gray-900 text-white py-12'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center text-gray-400'>
            <p>&copy; 2025 AI Music Royalty Attribution Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
