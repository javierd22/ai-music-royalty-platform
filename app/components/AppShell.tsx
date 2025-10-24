"use client";
import Link from "next/link";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fdfbf8] text-gray-900 flex flex-col">
      <header className="flex justify-between items-center px-8 py-4 border-b border-gray-200 bg-[#f9f6f1]/70 backdrop-blur-sm sticky top-0 z-10">
        <h1 className="font-semibold text-lg">AI Music Royalty Platform</h1>
        <nav className="space-x-6 text-sm">
          <Link href="/" className="hover:text-yellow-700">Home</Link>
          <Link href="/upload" className="hover:text-yellow-700">Upload</Link>
          <Link href="/dashboard" className="hover:text-yellow-700">Dashboard</Link>
          <Link href="/login" className="hover:text-yellow-700">Login</Link>
        </nav>
      </header>

      <main className="flex-1 flex justify-center items-start p-8">
        <div className="w-full max-w-5xl">{children}</div>
      </main>

      <footer className="text-center text-xs text-gray-400 pb-6">
        © 2025 AI Music Royalty Platform
      </footer>
    </div>
  );
}
