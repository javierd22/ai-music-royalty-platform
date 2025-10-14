"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const [fileName, setFileName] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const router = useRouter();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFileName(f.name);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fileName) return;

    setProcessing(true);

    // pretend to fingerprint and compare
    await new Promise((r) => setTimeout(r, 1200));

    const mockMatches = [
      { trackTitle: "Echoes of You", artist: "Josh Royal", similarity: 0.86, percentInfluence: 0.56 },
      { trackTitle: "Midnight Lies", artist: "Ahna Mac", similarity: 0.81, percentInfluence: 0.30 },
      { trackTitle: "Amber Skyline", artist: "Essyonna", similarity: 0.79, percentInfluence: 0.14 },
    ];

    const royaltyEvent = {
      outputId: crypto.randomUUID(),
      amountCents: 100,
      splits: mockMatches.map(m => ({ trackTitle: m.trackTitle, artist: m.artist, percent: m.percentInfluence }))
    };

    // store to simulate state across pages
    localStorage.setItem("lastResult", JSON.stringify({ fileName, mockMatches, royaltyEvent, at: Date.now() }));

    setProcessing(false);
    router.push("/result");
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Upload an audio file</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="file" accept="audio/*" onChange={handleFileChange} className="block" />
        {fileName && <p>Selected: {fileName}</p>}
        <button
          type="submit"
          disabled={!fileName || processing}
          className="rounded-lg border px-4 py-2 disabled:opacity-50"
        >
          {processing ? "Processing…" : "Check attribution"}
        </button>
      </form>
      <p className="text-sm text-gray-600">
        Demo mode saves a fake result locally so you can see the full flow without any external services.
      </p>
    </section>
  );
}
