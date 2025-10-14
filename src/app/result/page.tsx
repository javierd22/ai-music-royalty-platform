"use client";

import { useEffect, useState } from "react";

type Match = { trackTitle: string; artist: string; similarity: number; percentInfluence: number };
type Result = { fileName: string; mockMatches: Match[]; royaltyEvent: any; at: number };

export default function ResultPage() {
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("lastResult");
    if (raw) setResult(JSON.parse(raw));
  }, []);

  if (!result) {
    return <p>No recent result found. Go to Upload to run a demo.</p>;
  }

  const totalPercent = result.mockMatches.reduce((s, m) => s + m.percentInfluence, 0);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Attribution result</h1>
      <p className="text-gray-700">File checked: <strong>{result.fileName}</strong></p>

      <div className="space-y-3">
        {result.mockMatches.map((m, i) => (
          <div key={i} className="rounded-lg border p-4">
            <div className="font-medium">{m.trackTitle} by {m.artist}</div>
            <div>Similarity score: {Math.round(m.similarity * 100)}%</div>
            <div>Percent influence: {Math.round(m.percentInfluence * 100)}%</div>
          </div>
          ))}
      </div>

      <p className="text-sm text-gray-600">Total influence across matches: {Math.round(totalPercent * 100)}%</p>
      <a href="/dashboard" className="inline-block rounded-lg border px-4 py-2">View dashboard</a>
    </section>
  );
}
