/**
 * Artist Login Page
 *
 * Per PRD Section 5.1: Artist Platform - Artist Identity
 * Allows artists to log in with email and password
 */

'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { loginArtist } from '@/lib/supabase/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/artist/dashboard';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validation
    if (!formData.email.trim()) {
      setError('Please provide your email address');
      setIsLoading(false);
      return;
    }

    if (!formData.password) {
      setError('Please provide your password');
      setIsLoading(false);
      return;
    }

    try {
      const result = await loginArtist({
        email: formData.email,
        password: formData.password,
      });

      if (!result.success) {
        setError(result.error || 'Login failed');
        setIsLoading(false);
        return;
      }

      // Redirect to dashboard or requested page
      router.push(redirectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center px-4 py-12'>
      <div className='w-full max-w-md'>
        <div className='text-center mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>Artist Login</h1>
          <p className='text-gray-600'>Access your dashboard and manage your music rights</p>
        </div>

        <div className='golden-border'>
          <div className='golden-border-content'>
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

              {/* Email */}
              <div>
                <label htmlFor='email' className='block text-sm font-medium text-gray-900 mb-2'>
                  Email Address
                </label>
                <input
                  id='email'
                  type='email'
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder='artist@example.com'
                  className='w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent'
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor='password' className='block text-sm font-medium text-gray-900 mb-2'>
                  Password
                </label>
                <input
                  id='password'
                  type='password'
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder='Enter your password'
                  className='w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent'
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Submit Button */}
              <button
                type='submit'
                className='w-full px-6 py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium'
                disabled={isLoading}
              >
                {isLoading ? 'Logging In...' : 'Log In'}
              </button>
            </form>

            <div className='mt-6 pt-6 border-t border-gray-200 space-y-3'>
              <p className='text-sm text-gray-600 text-center'>
                Don't have an account?{' '}
                <Link
                  href='/artist/register'
                  className='text-gray-900 hover:text-gray-600 font-medium underline'
                >
                  Register Here
                </Link>
              </p>
              <p className='text-sm text-gray-600 text-center'>
                <Link
                  href='/artist/forgot-password'
                  className='text-gray-600 hover:text-gray-900 underline'
                >
                  Forgot Password?
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Alternative Login Methods */}
        <div className='mt-6 golden-border'>
          <div className='golden-border-content'>
            <div className='text-center'>
              <p className='text-sm font-medium text-gray-900 mb-3'>
                Alternative Authentication (Coming Soon)
              </p>
              <div className='space-y-2'>
                <button
                  disabled
                  className='w-full px-4 py-2 border border-gray-300 text-gray-400 rounded-md cursor-not-allowed'
                >
                  🦊 Connect with MetaMask
                </button>
                <button
                  disabled
                  className='w-full px-4 py-2 border border-gray-300 text-gray-400 rounded-md cursor-not-allowed'
                >
                  🌈 Connect with WalletConnect
                </button>
              </div>
              <p className='text-xs text-gray-500 mt-2'>
                Per PRD Section 5.1: Wallet sign-in will be available in Phase 3
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className='mt-6 golden-border'>
          <div className='golden-border-content'>
            <div className='flex gap-3 text-sm'>
              <span className='text-lg'>ℹ️</span>
              <div className='flex-1'>
                <p className='text-gray-600'>
                  <strong className='text-gray-900'>Secure Authentication:</strong> Your session is
                  protected with Supabase Auth and JWT tokens. All data access is controlled through
                  Row Level Security (RLS) per PRD §12.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}

// Enable dynamic rendering for auth pages
export const dynamic = 'force-dynamic';
