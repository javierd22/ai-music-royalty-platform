/**
 * Client-side Supabase client
 *
 * Per PRD Section 5.1: Artist Platform - Client-side authentication
 * Uses browser-safe Supabase client for client-side operations
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  return createBrowserClient(url, key);
}
