import './globals.css';

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';

import { EnvCheck } from '@/components/EnvCheck';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AI Music Royalty Platform',
  description: 'AI-powered music royalty management platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#f5efe6] text-zinc-900 antialiased`}
      >
        <header className='border-b border-zinc-200/70 bg-[#f7f1e9]/80 backdrop-blur'>
          <nav className='mx-auto max-w-6xl px-4 py-4 flex items-center gap-6'>
            <Link href='/' className='text-lg font-semibold tracking-tight'>
              AI Music Royalty Platform
            </Link>
            <div className='ml-auto flex items-center gap-4 text-sm'>
              <Link href='/upload' className='hover:opacity-80'>
                Upload
              </Link>
              <Link href='/result' className='hover:opacity-80'>
                Result
              </Link>
              <Link href='/dashboard' className='hover:opacity-80'>
                Dashboard
              </Link>
            </div>
          </nav>
        </header>
        <main className='mx-auto max-w-6xl px-4 py-12'>
          <EnvCheck />
          {children}
        </main>
        <footer className='mx-auto max-w-6xl px-4 py-8 text-xs text-zinc-600'>
          © {new Date().getFullYear()} AI Music Royalty Platform
        </footer>
      </body>
    </html>
  );
}
