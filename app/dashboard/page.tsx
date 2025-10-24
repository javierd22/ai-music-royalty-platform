"use client";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Match = { trackTitle: string; artist: string; similarity: number; percentInfluence: number };
type Result = { id: string; track_id: string; matches: Match[]; created_at: string };
type Track  = { id: string; title: string; storage_url: string; created_at: string };

export default function DashboardPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [resultsByTrack, setResultsByTrack] = useState<Record<string, Result[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { window.location.href = "/login"; return; }

      const { data: t } = await supabase.from("tracks").select("*").order("created_at", { ascending: false });
      setTracks(t ?? []);

      const r = await fetch("/api/results", { cache: "no-store" }).then(x => x.json()) as Result[];
      const grouped: Record<string, Result[]> = {};
      for (const res of r) {
        (grouped[res.track_id] ||= []).push(res);
      }
      // sort each group newest first
      for (const k of Object.keys(grouped)) {
        grouped[k].sort((a,b) => +new Date(b.created_at) - +new Date(a.created_at));
      }
      setResultsByTrack(grouped);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <AppShell><div>Loading…</div></AppShell>;

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Your Uploaded Tracks</h1>
        {tracks.length === 0 ? (
          <p>No tracks yet. <a className="text-yellow-700 underline" href="/upload">Upload one</a>.</p>
        ) : (
          <ul className="space-y-4">
            {tracks.map((t) => (
              <li key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t.title}</p>
                    <a href={t.storage_url} target="_blank" className="text-sm text-yellow-700 underline">Open file</a>
                  </div>
                  <a href={`/tracks/${t.id}`} className="px-3 py-1.5 border rounded-full text-sm hover:bg-gray-50">View details</a>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Latest attribution</p>
                  {!(resultsByTrack[t.id]?.length) ? (
                    <p className="text-sm text-gray-500">No results yet</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {resultsByTrack[t.id][0].matches.map((m, i) => (
                        <li key={i} className="flex flex-wrap gap-2">
                          <span className="font-medium">{m.trackTitle}</span> by {m.artist}
                          <span className="opacity-70">• similarity {Math.round(m.similarity * 100)}%</span>
                          <span className="opacity-70">• influence {Math.round(m.percentInfluence)}%</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
