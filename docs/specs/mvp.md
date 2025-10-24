# MVP Specification - AI Music Royalty Attribution Platform

**Version:** 1.0  
**Date:** 2025-10-22  
**PRD Reference:** §6 KPIs (MVP), §11 Next 7-Day Execution

---

## Overview

This MVP establishes the core infrastructure for provenance-first AI music generation with automatic royalty attribution. The system enables AI partners to log generation events, artists to consent to AI use, and provides transparent attribution with C2PA-compatible manifests.

## Core Features

### 1. Provenance SDK

- **beginGeneration()** and **endGeneration()** hooks
- C2PA manifest generation and storage
- <50ms latency target for SDK calls
- API key authentication

### 2. Attribution Engine

- Hybrid fingerprinting + embedding similarity
- Vector database integration (Qdrant/Pinecone)
- Confidence scoring and false-positive detection
- <5% false-positive rate target

### 3. Artist Portal

- Track upload with consent management
- Real-time attribution dashboard
- Royalty event tracking
- Transparent audit logs

### 4. Partner Dashboard

- Generation event monitoring
- Compliance status tracking
- Usage analytics and reporting

## Key Performance Indicators (KPIs)

| Metric                         | Target                  | Measurement Method                         |
| ------------------------------ | ----------------------- | ------------------------------------------ |
| **Provenance capture rate**    | ≥ 90% of AI outputs     | Track SDK integration vs total generations |
| **False-positive rate**        | ≤ 5%                    | Manual verification of attribution results |
| **Artist retention (30 days)** | ≥ 80%                   | User activity tracking in dashboard        |
| **Gross margin (MVP scale)**   | ≈ 60%                   | Revenue vs infrastructure costs            |
| **SDK integration time**       | < 1 hour for developers | Partner onboarding documentation           |

## Technical Architecture

### Database Schema

```sql
-- Core tables for MVP
tracks (id, title, artist_id, storage_url, consent)
generation_logs (id, generator_id, track_id, start_time, end_time, manifest_url)
attribution_results (id, generation_id, matched_track_id, confidence, verified)
royalty_events (id, artist_id, amount, split, reference_id)
```

### API Endpoints

- `POST /api/events/start` - Begin generation event
- `POST /api/events/end` - End generation event
- `GET /api/events/logs` - Retrieve generation logs
- `POST /api/compare` - Attribution comparison
- `GET /artist/dashboard` - Artist dashboard data

### SDK Integration

```typescript
import { createSDK } from '@ai-music-royalty/sdk';

const sdk = createSDK({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.example.com',
});

// Begin generation
const generation = await sdk.beginGeneration({
  generatorId: 'suno-v3',
  trackId: 'track-uuid',
  prompt: 'upbeat electronic music',
});

// End generation
await sdk.endGeneration(generation.id, {
  outputId: 'generated-track-123',
});
```

## Success Criteria

### Day 1-7 Sprint Goals

1. ✅ **Database schema** with generation_logs and attribution_results tables
2. ✅ **SDK stub** with beginGeneration/endGeneration methods
3. ✅ **API endpoints** for event logging and retrieval
4. ✅ **Test data** with one artist and licensed track
5. ✅ **MVP documentation** with KPIs and integration guide

### Pilot Success Criteria

- SDK integrated into one live AI generator
- ≥ 10 artists opt-in catalog
- Automatic royalty payouts verified in Supabase
- Compliance endorsement from one rights organization
- Public press mention ("first AI music provenance pilot")

## Compliance & Ethics

### EU AI Act Alignment

- Transparent data usage logging
- User consent management
- Audit trail maintenance
- Data subject rights support

### C2PA Standards

- Provenance manifest generation
- Cryptographic signature verification
- Metadata preservation
- Chain of custody tracking

### Ethical Principles

1. **Transparency by Default** - All provenance data visible to users
2. **Consent-Driven Data** - No hidden ingestion; artist chooses inclusion
3. **Proof over Promise** - Payments occur only with verified dual proof
4. **Open Infrastructure** - SDK and audit logic open for community review
5. **Immutable Ownership** - Blockchain records ensure lasting authorship

## Next Steps

### Week 1 (Days 1-7)

- [x] Core infrastructure setup
- [x] SDK development and testing
- [x] Database schema implementation
- [x] API endpoint development
- [x] MVP documentation

### Week 2-4 (Pilot Phase)

- Partner integration and testing
- Artist onboarding and consent management
- Attribution engine refinement
- Compliance verification
- Performance optimization

### Month 2-3 (Scale Phase)

- Multi-partner integration
- Advanced attribution algorithms
- Blockchain integration
- International compliance
- Revenue optimization

---

**Last Updated:** 2025-10-22  
**Next Review:** 2025-10-29  
**Owner:** Senior Engineer + Product Team
