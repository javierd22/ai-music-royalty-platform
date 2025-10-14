"use client";

import { useEffect, useMemo, useState } from "react";

type Split = { trackTitle: string; artist: string; percent: number };
type RoyaltyEvent = { outputId: string; amountCents: number; splits: Split[] };

export default function DashboardPage() {
  const [events, setEvents] = useState<RoyaltyEvent[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("lastResult");
    if (!raw) return;
    const { royaltyEvent } = JSON.parse(raw);
    // append this event to a simple local list for the demo
    const listRaw = localStorage.getItem("royaltyEvents");
    const list: RoyaltyEvent[] = listRaw ? JSON.parse(listRaw) : [];
    const exists = list.some(e => e.outputId === royaltyEvent.outputId);
    const next = exists ? list : [royaltyEvent, ...list];
    localStorage.setItem("royaltyEvents", JSON.stringify(next));
    setEvents(next);
  }, []);

  const totals = useMemo(() => {
    const totalCents = events.reduce((s, e) => s + e.amountCents, 0);
    return { totalCents, formatted: `$${(totalCents / 100).toFixed(2)}` };
  }, [events]);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Artist dashboard</h1>
      <div className="golden-border">
        <div className="golden-border-content">
          <div className="text-sm text-gray-600">Lifetime paid plus pending</div>
          <div className="text-3xl font-bold">{totals.formatted}</div>
        </div>
      </div>

      <div className="space-y-3">
        {events.length === 0 && <p>No royalty events yet. Upload an audio file and view the Result first.</p>}
        {events.map((e) => (
          <div key={e.outputId} className="golden-border">
            <div className="golden-border-content">
              <div className="font-medium">Output {e.outputId.slice(0, 8)}</div>
              <div>Amount: ${(e.amountCents / 100).toFixed(2)}</div>
              <div className="mt-2 space-y-1">
                {e.splits.map((s, i) => (
                  <div key={i} className="text-sm text-gray-700">
                    {Math.round(s.percent * 100)}% to {s.artist} for {s.trackTitle}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
