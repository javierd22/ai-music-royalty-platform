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
