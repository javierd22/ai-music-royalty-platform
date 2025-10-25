# Product Requirements Document (PRD)

## Project: AI Music Royalty Attribution Platform

### Version: 2025-10-24

---

## 1. Vision

To build the world’s first _provenance-first_ AI-music attribution infrastructure — a neutral layer between artists and AI music generators that ensures creators are automatically credited and compensated when their work influences AI-generated outputs.

Our goal is to embed royalty accountability directly into the AI creation process through real-time provenance data, compliant with upcoming EU AI Act and C2PA standards.

---

## 2. Problem

AI music systems increasingly train on copyrighted data or generate outputs influenced by existing works without transparent attribution. Artists have no visibility or compensation pathway when their creative DNA appears in AI-generated music.

---

## 3. Solution Overview

A full-stack provenance and royalty attribution platform consisting of:

### 3.1 Artist Interface

- Upload original works (audio files)
- Fingerprinting + vector embedding stored securely
- Dashboard showing when and how their works influenced AI generations
- Automatic royalty calculation and payout based on verified influence matches

### 3.2 Partner SDK (AI Generator Side)

- Lightweight SDK for AI music companies to log real-time “use slips” whenever internal generation references known audio vectors.
- Each “use slip” is cryptographically signed and stored via C2PA-style manifest.

### 3.3 Attribution Auditor

- Independent verification service that analyzes generated outputs for phrase-level similarity and confirms real matches against artist catalogs.
- Dual-proof model: payout occurs only when both SDK logs and auditor matches agree.

### 3.4 Payments & Reporting

- Smart payout routing to artist accounts via Stripe Connect (future phase)
- Transparent proof chain: every royalty event links to specific generation evidence

---

## 4. Core Architecture

| Layer                   | Tech                                | Purpose                                               |
| ----------------------- | ----------------------------------- | ----------------------------------------------------- |
| **Frontend**            | Next.js + Supabase Auth             | Artist uploads, dashboard, payments                   |
| **Attribution Service** | Python FastAPI                      | Audio fingerprinting, embeddings, similarity matching |
| **Main API**            | Node.js / Next API routes           | CRUD endpoints, user + track management               |
| **Database**            | Supabase (Postgres)                 | Tracks, results, royalty events                       |
| **Vector DB**           | Qdrant / Pinecone                   | High-dimensional embedding search                     |
| **Storage**             | Supabase / S3                       | Audio file storage                                    |
| **Provenance Layer**    | C2PA-compatible manifest generation | Proof signing + verification                          |

---

## 5. Key User Flows

1. **Artist Upload**
   - User uploads track → audio vector generated → stored in DB
2. **AI Generation Log**
   - Partner SDK logs “use slip” (generation event referencing track ID)
3. **Auditor Verification**
   - Attribution service checks generated audio for matching segments
4. **Royalty Event Creation**
   - When both proofs align → create royalty_event → prepare payout
5. **Dashboard Visibility**
   - Artists view live influence stats and revenue summaries

---

## 6. Data Model

| Table              | Fields                                            | Description                                 |
| ------------------ | ------------------------------------------------- | ------------------------------------------- |
| **tracks**         | id, title, storage_url, created_at                | Original works uploaded by artists          |
| **results**        | id, track_id, matches(jsonb), created_at          | Similarity results from attribution service |
| **royalty_events** | id, track_id, amount_cents, proof_ref, created_at | Payout-ready proof events                   |
| **sdk_logs**       | id, gen_id, track_id, timestamp, hash             | Logged “use slips” from AI SDK              |

---

## 7. Compliance Alignment

- **C2PA** for signed content provenance manifests
- **EU AI Act** transparency requirements for AI-generated content
- **GDPR** compliant data handling (Supabase EU storage)

---

## 8. Milestones (from 7-Day Research Sprint)

| Day | Focus                   | Key Deliverable                            |
| --- | ----------------------- | ------------------------------------------ |
| 1   | Competitive Analysis    | Gap: No real-time SDK logging for AI music |
| 2   | Tech + Legal Validation | SDK + C2PA alignment validated             |
| 3   | Market Positioning      | Early adopters: indie AI startups, DSPs    |
| 4   | Partnerships            | Monetization through AI-compliance layer   |
| 5   | Reality Check           | Proven market gap + Go decision confirmed  |
| 6   | Architecture Planning   | PRD, DB schema, and modular SDK plan       |
| 7   | Prototype Prep          | Local MVP ready for attribution tests      |

---

## 9. Future Roadmap

- **Phase 1:** Artist adoption + MVP validation
- **Phase 2:** SDK integration with 1–2 AI generators
- **Phase 3:** Label/publisher onboarding + API standardization

---

## 10. Success Metrics

- ≥ 100 artists onboarded with verified uploads
- ≥ 1 AI partner using SDK to log real “use slips”
- ≥ 90% attribution accuracy for auditor matches
- < 1 min latency for proof verification
- First royalty payouts executed successfully

---

## 11. Risks & Mitigations

| Risk                                   | Mitigation                                          |
| -------------------------------------- | --------------------------------------------------- |
| AI partners reluctant to integrate SDK | Offer free compliance + licensing benefits          |
| Attribution false positives            | Dual-proof (SDK + auditor) system                   |
| Regulatory changes                     | Maintain C2PA + AI Act compliance layer             |
| Data storage cost                      | Supabase tiered pricing + on-demand vector indexing |

---

## 12. Out of Scope (MVP)

- Blockchain notarization (planned for future)
- Full label catalog ingestion
- Multi-currency payouts

---

## Execution Contract for Cursor

**Scope of work**

1. Code only. No emails, decks, outreach, or docs outside /docs.
2. Tech stack is fixed: Next.js App Router at repo root, FastAPI attribution service, Postgres via Supabase, optional Vector DB.
3. Every task must reference /docs/PRD.md and /docs/ROLES.md before any code is changed.

**Repository layout**

- Root Next.js app lives at repository root.
- If a subfolder app exists, ignore it unless PRD explicitly changes this section.

**Required files**

- app/layout.tsx
- app/page.tsx
- next.config.js
- vercel.json with only an API rewrite:
  { "rewrites": [{ "source": "/api/(.*)", "destination": "/api/$1" }] }

**Build commands**

- Install: npm ci
- Build: npm run build
- Serve: npm start

**Environment contract**

- NEXT_PUBLIC_APP_URL
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE (server only)
- VECTOR_DB_URL (optional)
- VECTOR_DB_API_KEY (optional)
- ATTRIBUTION_API_URL
- STRIPE_SECRET_KEY (future)
  Cursor must never hardcode secrets. Use process.env only.

**Routing map**

- GET / renders Home with no data dependency
- GET /tracks list tracks
- GET /tracks/[id] track detail + results
- POST /api/tracks create track {title, fileUrl}
- GET /api/tracks list tracks
- GET /api/results?trackId=uuid
- POST /api/sdk/log-use partner SDK logs {gen_id, track_id, ts, hash}
- POST {ATTRIBUTION_API_URL}/compare FastAPI endpoint

**Type contracts (authoritative)**

```ts
export type Track = { id: string; title: string; storage_url: string; created_at: string };
export type Match = {
  trackId: string;
  similarity: number;
  percentInfluence: number;
  startSec?: number;
  endSec?: number;
};
export type Result = { id: string; track_id: string; matches: Match[]; created_at: string };
export type SdkUseSlip = { gen_id: string; track_id: string; ts: string; hash: string };

export type CreateTrackReq = { title: string; fileUrl: string };
export type CompareReq = { audioUrl?: string; fileBase64?: string };

export type CreateTrackRes = { track: Track };
export type ListTracksRes = { tracks: Track[] };
export type ResultsRes = { results: Result[] };
export type CompareRes = { matches: Match[] };
```

**DB schema that must exist**

```sql
create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  storage_url text not null,
  created_at timestamptz default now()
);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references public.tracks(id) on delete cascade,
  matches jsonb not null,
  created_at timestamptz default now()
);

create table if not exists public.royalty_events (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references public.tracks(id) on delete cascade,
  amount_cents integer default 0,
  proof_ref text,
  created_at timestamptz default now()
);

create table if not exists public.sdk_logs (
  id uuid primary key default gen_random_uuid(),
  gen_id text not null,
  track_id uuid references public.tracks(id) on delete cascade,
  ts timestamptz not null,
  hash text not null
);
```

**FastAPI contract**

```py
# POST /compare  body: CompareReq
# return CompareRes
# Requirement: must accept either audioUrl or fileBase64.
# Never 404 the root route. Return 200 with {matches: []} on no match.
```

**Hard guardrails**

The home route must never depend on remote data. If data fails, render a static "OK" and log to console.

Do not create or modify files outside the Next.js app, FastAPI service, or migrations, unless PRD says so.

Do not introduce basePath or assetPrefix without changing this PRD section.

Do not add global rewrites that catch "/".

If a task would violate any item above, stop and print "Blocked by Execution Contract".

**Acceptance criteria for any PR**

- npm run build and npm start work locally.
- Next build output lists a route for "/".
- Lint passes. Types compile. No console errors in Home.
- API endpoints respond with the types defined above.
- Schema migrations apply on a clean database.

---

## Tailwind v4 Reference Note (UI Framework Addendum)

### Overview

This project now uses **Tailwind CSS v4** (active as of the latest deployment).  
Unlike Tailwind v3, version 4 eliminates the need for `@tailwind base/components/utilities` imports and the `tailwind.config.js` file, unless advanced customization is needed.  
All styling is defined directly through **the `@theme` directive** and **custom tokens**.

### Implementation in Our Codebase

The global stylesheet is located at `app/globals.css`.

It begins with:

```css
@import 'tailwindcss';

@theme {
  --color-yellow-600: #ca8a04;
  --color-slate-900: #0f172a;
  --color-slate-700: #334155;
  --color-emerald-500: #10b981;
}
```

### Rules for Future Development

- Always import Tailwind via `@import "tailwindcss";`
- Never use the old `@tailwind base; @tailwind components; @tailwind utilities;` syntax.
- Define new color or spacing tokens inside the `@theme { }` block in globals.css before using them in JSX.
- Example:
  ```css
  @theme {
    --color-royal-blue: #4169e1;
  }
  ```
  Then, you can safely use `bg-royal-blue`, `text-royal-blue`, etc.
- If you encounter a "Cannot apply unknown utility class" error, it means that utility's token was not declared in the theme.
- Keep the token naming convention consistent with Tailwind v3 palettes, e.g. `--color-zinc-200`, `--color-emerald-500`, etc.
- No config file needed — Tailwind automatically scans all files under `/app` and `/components`.
- Do not override Tailwind defaults in postcss.config.js or add legacy configs — v4 handles this automatically.

### Verification

- Run `npm run build` to confirm successful compilation after adding any new token.
- Check Vercel logs for PostCSSSyntaxError or "unknown utility" messages.

### Notes

- Tailwind v4 ships faster compilation and native CSS nesting.
- Use utility classes as normal — the color tokens in `@theme` map directly to standard classnames like `bg-yellow-600`.

_Last updated: 2025-01-27_
