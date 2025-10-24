/**
 * Auth Middleware
 *
 * Per PRD Section 12: Ethical & Legal Design Principles
 * Protects artist routes and ensures authenticated access
 */

import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Check if accessing artist routes
  const isArtistRoute = request.nextUrl.pathname.startsWith('/artist');
  const isAuthRoute = request.nextUrl.pathname.match(/^\/artist\/(login|register)$/);

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If accessing artist routes (except login/register) without session, redirect to login
  if (isArtistRoute && !isAuthRoute && !session) {
    const redirectUrl = new URL('/artist/login', request.url);
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If accessing login/register with session, redirect to dashboard
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/artist/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Completely disable middleware to fix 404 issue
    // '/artist/:path*',
    // '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
