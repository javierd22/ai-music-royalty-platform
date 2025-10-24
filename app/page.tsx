"use client";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 font-sans bg-white text-gray-900">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">AI Music Royalty Platform</h1>
        <p className="text-base text-gray-600 leading-relaxed">
          A provenance-first infrastructure for automatic royalty attribution in AI-generated music.
          Upload your tracks, verify provenance data, and connect with AI partners using our SDK.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link
            href="/tracks"
            className="px-4 py-2 rounded-xl bg-black text-white hover:bg-gray-800 transition"
          >
            View Tracks
          </Link>
          <Link
            href="/api/tracks"
            className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 transition"
          >
            API Docs
          </Link>
        </div>
      </div>
    </main>
  );
}
