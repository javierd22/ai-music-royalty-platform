/**
 * Artist Authentication Helpers
 *
 * Per PRD Section 5.1: Artist Identity
 * Implements artist registration, login, and session management
 * Integrates with Supabase Auth for secure session handling
 */

import { createClient } from '@supabase/supabase-js';

// Create Supabase client for auth operations
function createAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(url, key);
}

export interface Artist {
  id: string;
  name: string;
  email: string;
  wallet?: string;
  email_verified: boolean;
  auth_user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface RegisterArtistParams {
  name: string;
  email: string;
  password: string;
  wallet?: string;
}

export interface LoginArtistParams {
  email: string;
  password: string;
}

export interface VerifyCodeParams {
  email: string;
  code: string;
}

/**
 * Register a new artist account
 * Creates both Supabase Auth user and artist profile
 */
export async function registerArtist(params: RegisterArtistParams) {
  const supabase = createAuthClient();

  // 1. Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        name: params.name,
      },
    },
  });

  if (authError) {
    return { success: false, error: authError.message };
  }

  if (!authData.user) {
    return { success: false, error: 'Failed to create user account' };
  }

  // 2. Create artist profile in artists table
  const { data: artistData, error: artistError } = await supabase
    .from('artists')
    .insert({
      name: params.name,
      email: params.email,
      wallet: params.wallet,
      auth_user_id: authData.user.id,
      email_verified: false,
    })
    .select()
    .single();

  if (artistError) {
    // Clean up auth user if artist profile creation fails
    await supabase.auth.admin.deleteUser(authData.user.id);
    return { success: false, error: artistError.message };
  }

  return {
    success: true,
    data: {
      user: authData.user,
      artist: artistData,
      session: authData.session,
    },
  };
}

/**
 * Login an existing artist
 * Returns session token and artist profile
 */
export async function loginArtist(params: LoginArtistParams) {
  const supabase = createAuthClient();

  // 1. Sign in with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });

  if (authError) {
    return { success: false, error: authError.message };
  }

  if (!authData.user) {
    return { success: false, error: 'Invalid credentials' };
  }

  // 2. Fetch artist profile
  const { data: artistData, error: artistError } = await supabase
    .from('artists')
    .select('*')
    .eq('auth_user_id', authData.user.id)
    .single();

  if (artistError || !artistData) {
    return { success: false, error: 'Artist profile not found' };
  }

  return {
    success: true,
    data: {
      user: authData.user,
      artist: artistData,
      session: authData.session,
    },
  };
}

/**
 * Logout the current artist
 * Invalidates the session token
 */
export async function logoutArtist() {
  const supabase = createAuthClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get the current authenticated artist
 * Returns null if not authenticated
 */
export async function getCurrentArtist(): Promise<Artist | null> {
  const supabase = createAuthClient();

  // 1. Get current session
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return null;
  }

  // 2. Fetch artist profile
  const { data: artistData, error: artistError } = await supabase
    .from('artists')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .single();

  if (artistError || !artistData) {
    return null;
  }

  return artistData;
}

/**
 * Check if the current user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const supabase = createAuthClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return !!session;
}

/**
 * Update artist profile
 */
export async function updateArtistProfile(updates: Partial<Artist>) {
  const supabase = createAuthClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Update artist profile
  const { data: artistData, error: artistError } = await supabase
    .from('artists')
    .update(updates)
    .eq('auth_user_id', user.id)
    .select()
    .single();

  if (artistError) {
    return { success: false, error: artistError.message };
  }

  return {
    success: true,
    data: artistData,
  };
}

/**
 * Connect wallet to artist account
 */
export async function connectWallet(walletAddress: string) {
  const supabase = createAuthClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Update artist profile with wallet
  const { data: artistData, error: artistError } = await supabase
    .from('artists')
    .update({ wallet: walletAddress })
    .eq('auth_user_id', user.id)
    .select()
    .single();

  if (artistError) {
    return { success: false, error: artistError.message };
  }

  return {
    success: true,
    data: artistData,
  };
}

/**
 * Send verification code to artist email
 * For use with custom verification flow
 */
export async function sendVerificationCode(email: string) {
  const supabase = createAuthClient();

  // Generate verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Update artist with verification code
  const { error } = await supabase
    .from('artists')
    .update({
      verification_code: code,
      verification_expires_at: expiresAt.toISOString(),
    })
    .eq('email', email);

  if (error) {
    return { success: false, error: error.message };
  }

  // In production, this would send an email via SendGrid/Resend/etc.
  // For now, return the code for development
  console.log(`[DEV] Verification code for ${email}: ${code}`);

  return {
    success: true,
    message: 'Verification code sent to email',
    // Remove this in production:
    devCode: code,
  };
}

/**
 * Verify email with code
 */
export async function verifyEmailWithCode(params: VerifyCodeParams) {
  const supabase = createAuthClient();

  // Fetch artist with verification code
  const { data: artistData, error: artistError } = await supabase
    .from('artists')
    .select('*')
    .eq('email', params.email)
    .single();

  if (artistError || !artistData) {
    return { success: false, error: 'Artist not found' };
  }

  // Check if code matches and hasn't expired
  if (artistData.verification_code !== params.code) {
    return { success: false, error: 'Invalid verification code' };
  }

  if (new Date(artistData.verification_expires_at) < new Date()) {
    return { success: false, error: 'Verification code has expired' };
  }

  // Mark email as verified
  const { error: updateError } = await supabase
    .from('artists')
    .update({
      email_verified: true,
      verification_code: null,
      verification_expires_at: null,
    })
    .eq('email', params.email);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return {
    success: true,
    message: 'Email verified successfully',
  };
}

/**
 * Server-side helper to get artist from request
 * Use this in API routes and server components
 */
export async function getArtistFromRequest(): Promise<Artist | null> {
  const supabase = createAuthClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: artistData, error: artistError } = await supabase
    .from('artists')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (artistError || !artistData) {
    return null;
  }

  return artistData;
}
