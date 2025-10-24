'use client';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AppShell from '../components/AppShell';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const fn =
      mode === 'login'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    if (error) setError(error.message);
    else router.push('/dashboard');
  }

  return (
    <AppShell>
      <div className='bg-white shadow-sm rounded-2xl p-8 border border-gray-100 w-[380px]'>
        <h1 className='text-2xl font-semibold mb-6 text-center'>
          {mode === 'login' ? 'Artist Login' : 'Create Account'}
        </h1>
        <form onSubmit={handleAuth} className='space-y-4'>
          <input
            type='email'
            placeholder='Email'
            value={email}
            onChange={e => setEmail(e.target.value)}
            className='w-full border rounded-lg p-2.5 text-sm'
            required
          />
          <input
            type='password'
            placeholder='Password'
            value={password}
            onChange={e => setPassword(e.target.value)}
            className='w-full border rounded-lg p-2.5 text-sm'
            required
          />
          {error && <p className='text-red-600 text-sm'>{error}</p>}
          <button
            type='submit'
            className='w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-lg'
          >
            {mode === 'login' ? 'Login' : 'Sign Up'}
          </button>
        </form>
        <p
          className='text-sm text-center text-gray-500 mt-4 cursor-pointer hover:underline'
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Login'}
        </p>
      </div>
    </AppShell>
  );
}
