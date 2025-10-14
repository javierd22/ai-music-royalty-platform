import Link from "next/link";

export default function Home() {
  return (
    <section className="relative">
      {/* hero */}
      <div className="grid items-center gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight">
            The royalty layer for AI music
          </h1>
          <p className="text-base md:text-lg text-zinc-700">
            Fingerprint songs, verify real influence, and pay artists fairly when AI learns from or references their work.
            Consent, transparency, and audited attribution — all in one place.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {/* gold primary */}
            <Link
              href="/upload"
              className="inline-flex items-center rounded-2xl border px-5 py-2.5 text-sm font-medium
                         border-[#d4af37] bg-[#d4af37] text-zinc-900 shadow-sm hover:brightness-105 transition"
            >
              Try the demo
            </Link>

            {/* silver secondary */}
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-2xl border px-5 py-2.5 text-sm font-medium
                         border-[#c0c0c0] text-zinc-900 bg-white/70 hover:bg-white shadow-sm transition"
            >
              View dashboard
            </Link>
          </div>

          <div className="flex items-center gap-6 pt-2 text-sm text-zinc-600">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#d4af37]" />
              <span>Artist first</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#c0c0c0]" />
              <span>Audited attribution</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-400" />
              <span>Transparent payouts</span>
            </div>
          </div>
        </div>

        {/* right side card */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white/70 p-6 shadow-sm">
          <div className="space-y-4">
            <h2 className="text-lg font-medium">How it works</h2>
            <ol className="list-decimal pl-5 space-y-2 text-zinc-700">
              <li>Upload your tracks — we create privacy-safe fingerprints.</li>
              <li>Partners send use slips — our auditor verifies real phrase matches.</li>
              <li>Only verified influence gets paid — see it all in your dashboard.</li>
            </ol>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-xl border border-zinc-200 bg-white/80 p-3">
                <div className="font-semibold">Consent</div>
                <div className="text-zinc-600">Opt in controls</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white/80 p-3">
                <div className="font-semibold">Proof</div>
                <div className="text-zinc-600">Audited matches</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white/80 p-3">
                <div className="font-semibold">Pay</div>
                <div className="text-zinc-600">Auto royalties</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* soft background accents */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-16 -left-16 h-64 w-64 rounded-full bg-[#d4af37]/10 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-[#c0c0c0]/20 blur-3xl" />
      </div>
    </section>
  );
}
