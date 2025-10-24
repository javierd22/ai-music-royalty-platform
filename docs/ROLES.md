# ROLES.md

## Project: AI Music Royalty Attribution Platform

### Version: 2025-10-24

This file defines the key roles for the Cursor multi-agent setup and human contributors.  
Each task executed by Cursor should be linked to one or more roles from this list for context and accountability.

---

## 1. FRONTEND_ENGINEER

**Scope:** All tasks related to the user interface and experience.

**Responsibilities:**

- Build and maintain the Next.js app (artist dashboard, upload interface, results display).
- Implement Supabase authentication and storage integration.
- Create responsive UI layouts for artists and AI partners.
- Maintain routing, metadata, and SEO compliance.

**Outputs:**

- `/app` directory components
- `/api` routes for client-side requests
- `next.config.js` updates for production settings

---

## 2. BACKEND_ENGINEER

**Scope:** Core system logic, data flow, and service integration.

**Responsibilities:**

- Maintain FastAPI attribution service and Node.js API routes.
- Manage data pipeline between Supabase and vector database (Qdrant/Pinecone).
- Implement REST endpoints for uploads, comparison results, and royalty logs.
- Optimize request latency and ensure CORS compatibility.

**Outputs:**

- `attribution_service/` or `backend/` codebase
- API routes: `/api/tracks`, `/api/results`, `/api/sdk/log-use`
- Deployment configuration files

---

## 3. DATABASE_ENGINEER

**Scope:** Data modeling, migrations, and schema optimization.

**Responsibilities:**

- Design and maintain `tracks`, `results`, `royalty_events`, and `sdk_logs` tables.
- Set up Supabase policies and indexing for performance.
- Manage environment variables for DB connection security.
- Monitor query performance and data integrity.

**Outputs:**

- SQL schema files or migrations
- Supabase policies and triggers
- DB seed or fixture data for testing

---

## 4. AI_ATTRIBUTION_ENGINEER

**Scope:** Real-time and offline attribution logic.

**Responsibilities:**

- Implement audio fingerprinting and embedding comparison logic.
- Integrate melody and phrase-level similarity matching.
- Build the independent “Auditor” verification service.
- Ensure consistent scoring between SDK and auditor outputs.

**Outputs:**

- `compare_audio.py` or equivalent matching modules
- Similarity scoring reports
- Accuracy benchmarks

---

## 5. SDK_ENGINEER

**Scope:** AI partner-facing SDK development.

**Responsibilities:**

- Create lightweight logging SDK for AI generation tools.
- Emit signed “use slips” with track ID and generation metadata.
- Implement C2PA-style manifest creation and validation.
- Provide minimal setup instructions for AI partners.

**Outputs:**

- `/sdk` directory with client-side SDK library
- SDK documentation and example integrations

---

## 6. PRODUCT_MANAGER

**Scope:** Coordination, clarity, and milestone execution.

**Responsibilities:**

- Maintain the PRD and ensure all features align with research findings.
- Translate research and audit outcomes into daily task lists.
- Validate progress against 7-Day and 12-Week plans.
- Manage scope creep and ensure compliance milestones.

**Outputs:**

- `PRD.md` updates
- `NEXT_STEPS_AUDIT.md` or planning documents
- Weekly progress reports

---

## 7. E2E_ORCHESTRATOR (Cursor Internal Role)

**Scope:** Automated validation and testing.

**Responsibilities:**

- Before executing any new prompt or code change, verify that:
  - `PRD.md` and `ROLES.md` are present in `/docs` or root.
  - Both files have non-empty content and are less than 14 days old.
- Run E2E build test: Frontend → API → Attribution Service → DB.
- Halt execution if PRD or roles context is missing.

**Outputs:**

- Build validation logs
- “PASS/FAIL” summary appended to daily tasks

---

## 8. DESIGN_RESEARCHER (Optional Human Role)

**Scope:** Branding, UX tone, and communication design.

**Responsibilities:**

- Develop visual identity aligned with provenance and trust.
- Provide mockups for the artist dashboard and SDK partner portal.
- Maintain consistent style (Greek marble aesthetic, C2PA-compliance visuals).

**Outputs:**

- Figma / design assets
- Component guidelines

---

## 9. LEGAL_ADVISOR (Optional Human Role)

**Scope:** Compliance, licensing, and data protection.

**Responsibilities:**

- Validate compliance with EU AI Act, GDPR, and C2PA protocols.
- Draft API Terms of Service for AI partners and artists.
- Review payment and IP clauses.

**Outputs:**

- Compliance documentation
- Updated ToS and policy drafts

---

### Notes for Cursor Execution

- Before any task is executed, Cursor should check for `/docs/PRD.md` and `/docs/ROLES.md`.
- If either file is missing, stale, or empty, Cursor should halt and output:
  > “Execution blocked: Missing or outdated context files (PRD.md / ROLES.md). Please verify before continuing.”
- This ensures every action is grounded in the latest strategy and architecture.
