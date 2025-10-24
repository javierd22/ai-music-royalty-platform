# System Architecture Flow Diagram

**Per PRD Section 7: System Architecture**  
**Date:** 2025-10-23

## Artist → SDK → Generation → Manifest → Payout Flow

```mermaid
graph TD
    A[Artist Uploads Track] --> B[Track Fingerprinted & Stored]
    B --> C[Artist Consents to AI Use]
    C --> D[Track Available for AI Training]

    E[AI Generator] --> F[SDK beginGeneration()]
    F --> G[Generation Log Created]
    G --> H[C2PA Manifest Generated]
    H --> I[Manifest Stored & URL Returned]

    J[AI Generation Process] --> K[SDK endGeneration()]
    K --> L[Generation Completed]
    L --> M[Attribution Engine Analysis]
    M --> N[Similarity Detection]
    N --> O[Attribution Results]

    O --> P[Dual Proof Verification]
    P --> Q[Royalty Event Triggered]
    Q --> R[Artist Dashboard Updated]
    R --> S[Payout Processed]

    style A fill:#e1f5fe
    style E fill:#f3e5f5
    style P fill:#fff3e0
    style S fill:#e8f5e8
```

## Key Components

1. **Artist Portal** - Track upload, consent management, dashboard
2. **Provenance SDK** - beginGeneration/endGeneration hooks
3. **Generation Logs** - C2PA manifest storage and retrieval
4. **Attribution Engine** - Similarity detection and matching
5. **Dual Proof System** - SDK logs + auditor verification
6. **Royalty Engine** - Event processing and payout calculation

## Data Flow

1. Artist uploads track → stored + fingerprinted
2. AI generator calls SDK → logs C2PA manifest → FastAPI compares embeddings
3. Verified matches → stored in results → royalty event triggered
4. Both manifest and payment record exposed to artist dashboard + auditor API

## Compliance Features

- **C2PA Provenance** - Cryptographic manifest generation
- **EU AI Act** - Transparent data usage logging
- **Dual Proof** - SDK logs + independent auditor verification
- **Audit Trail** - Immutable records for compliance verification
