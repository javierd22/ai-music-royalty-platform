/**
 * Artist Registration Page
 *
 * Per PRD Section 5.1: Artist Platform - Artist Identity
 * Allows artists to create an account with email and password
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { registerArtist } from '@/lib/supabase/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    wallet: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validation
    if (!formData.name.trim()) {
      setError('Please provide your artist name');
      setIsLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setError('Please provide your email address');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const result = await registerArtist({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        wallet: formData.wallet || undefined,
      });

      if (!result.success) {
        setError(result.error || 'Registration failed');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      // Redirect to dashboard after successful registration
      setTimeout(() => {
        router.push('/artist/dashboard');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className='min-h-screen flex items-center justify-center px-4 py-12'>
        <div className='w-full max-w-md'>
          <div className='golden-border bg-green-50'>
            <div className='golden-border-content text-center'>
              <div className='text-4xl mb-4'>✓</div>
              <h2 className='text-xl font-semibold text-gray-900 mb-2'>Registration Successful!</h2>
              <p className='text-gray-600'>
                Welcome to the AI Music Royalty Platform. Redirecting to your dashboard...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center px-4 py-12'>
      <div className='w-full max-w-md'>
        <div className='text-center mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>Artist Registration</h1>
          <p className='text-gray-600'>
            Join the platform to protect your music and track AI usage
          </p>
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

              {/* Artist Name */}
              <div>
                <label htmlFor='name' className='block text-sm font-medium text-gray-900 mb-2'>
                  Artist Name <span className='text-red-600'>*</span>
                </label>
                <input
                  id='name'
                  type='text'
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder='Your artist or band name'
                  className='w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent'
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor='email' className='block text-sm font-medium text-gray-900 mb-2'>
                  Email Address <span className='text-red-600'>*</span>
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
                  Password <span className='text-red-600'>*</span>
                </label>
                <input
                  id='password'
                  type='password'
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder='At least 8 characters'
                  className='w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent'
                  required
                  disabled={isLoading}
                  minLength={8}
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor='confirmPassword'
                  className='block text-sm font-medium text-gray-900 mb-2'
                >
                  Confirm Password <span className='text-red-600'>*</span>
                </label>
                <input
                  id='confirmPassword'
                  type='password'
                  value={formData.confirmPassword}
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder='Re-enter your password'
                  className='w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent'
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Wallet (Optional) */}
              <div>
                <label htmlFor='wallet' className='block text-sm font-medium text-gray-900 mb-2'>
                  Wallet Address (Optional)
                </label>
                <input
                  id='wallet'
                  type='text'
                  value={formData.wallet}
                  onChange={e => setFormData({ ...formData, wallet: e.target.value })}
                  placeholder='0x... (for testnet payouts)'
                  className='w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent'
                  disabled={isLoading}
                />
                <p className='mt-1 text-xs text-gray-500'>
                  Connect your wallet later for receiving royalty payouts
                </p>
              </div>

              {/* Submit Button */}
              <button
                type='submit'
                className='w-full px-6 py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium'
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div className='mt-6 pt-6 border-t border-gray-200 text-center'>
              <p className='text-sm text-gray-600'>
                Already have an account?{' '}
                <Link
                  href='/artist/login'
                  className='text-gray-900 hover:text-gray-600 font-medium underline'
                >
                  Log In
                </Link>
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
                  <strong className='text-gray-900'>Per PRD Section 5.1:</strong> Artist accounts
                  enable you to upload tracks, monitor AI usage, view royalty events with dual proof
                  verification, and submit claims for potential unauthorized AI use.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enable dynamic rendering for auth pages
export const dynamic = 'force-dynamic';
