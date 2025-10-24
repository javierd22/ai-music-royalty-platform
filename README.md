# AI Music Royalty Attribution Platform

**Version:** 1.0  
**Last Updated:** 2025-10-25

---

## Overview

The AI Music Royalty Attribution Platform is a provenance-first system that ensures artists get paid when AI systems use, are influenced by, or directly reference their music. The platform provides transparent attribution, automatic royalty distribution, and compliance with emerging AI regulations.

> 📋 **Product Requirements**: See [PRD.md](./markdown/PRD.md) for the complete Product Requirements Document including vision, features, architecture, and roadmap.

## Key Features

- **Provenance SDK**: Lightweight integration for AI music generators
- **Attribution Engine**: Advanced similarity detection with <5% false positive rate
- **Artist Portal**: Upload, consent management, and royalty tracking
- **C2PA Compliance**: Cryptographic provenance manifests
- **EU AI Act Compliance**: Transparent data usage logging
- **Audio Upload & Analysis**: Upload audio files for attribution analysis
- **Royalty Management**: Track and manage royalty splits based on attribution results
- **Database Integration**: Supabase-powered data persistence
- **Artist API**: RESTful API for per-artist data access (tracks, royalties, claims, reports)

## Architecture

### Frontend (Next.js)

- Artist dashboard and authentication
- Track upload and management interface
- Royalty tracking and claims center
- Real-time attribution results display

### Backend Services

- **Main API**: FastAPI + Supabase Postgres
- **Attribution Service**: Python FastAPI for audio analysis and vector matching
- **Database**: Supabase Postgres with vector search capabilities

### Key Components

- Vector similarity search (Qdrant/Pinecone)
- Audio fingerprinting and embedding generation
- Dual-proof verification system (SDK logs + auditor detection)
- Blockchain integration for ownership verification

### Package Structure

#### `/src/app` - Next.js Frontend

- Artist dashboard and authentication pages
- Track upload and management interfaces
- Royalty tracking and claims center

#### `/server` - Main API Service

- FastAPI backend for attribution analysis
- Vector database integration
- Royalty event processing
- Database schema and migrations

#### `/attrib-service` - Attribution Microservice

- Audio processing and fingerprinting
- Vector similarity search
- Cross-validation and threshold verification

#### `/packages/sdk` - AI Partner SDK

- Client library for AI music generators
- Use slip logging and authentication
- Compliance reporting

#### `/dev-tools` - Development Tools

- MCP server for development automation
- Testing utilities and scripts
- Local development helpers

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Supabase account
- PostgreSQL 14+

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/ai-music-royalty-platform.git
   cd ai-music-royalty-platform
   ```

2. **Install dependencies**

   ```bash
   # Frontend
   cd apps/web
   npm install

   # Backend
   cd ../../server
   pip install -r requirements.txt

   # Attribution service
   cd ../services/attribution
   pip install -r requirements.txt
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Set up database**

   ```bash
   # Run migrations
   psql -h your-supabase-host -U postgres -d postgres -f server/schema/generation_logs.sql
   psql -h your-supabase-host -U postgres -d postgres -f server/schema/artist_consent_rls.sql
   ```

5. **Start services**

   ```bash
   # Terminal 1: Frontend
   cd apps/web
   npm run dev

   # Terminal 2: Backend
   cd server
   python main.py

   # Terminal 3: Attribution service
   cd services/attribution
   python main.py
   ```

## API Documentation

### Artist API

**Base URL:** `http://localhost:8001` (dev) | `https://api.yourdomain.com` (prod)

The Artist API provides secure, per-artist access to tracks, royalties, and claims data. All endpoints require authentication via Supabase JWT tokens.

**Security:**

- All endpoints require valid artist JWT token
- Row Level Security (RLS) enforces artist-only access
- Rate limiting: 60 req/min per artist
- PII redaction in logs per PRD §12

#### Authentication

All Artist API requests require a **Bearer token** in the `Authorization` header.

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
     http://localhost:8001/artist/tracks
```

#### Endpoints

**GET /artist/tracks** - Get all tracks owned by the authenticated artist
**GET /artist/royalties** - Get royalty events for artist's tracks
**GET /artist/claims** - Get claims submitted by the artist
**GET /artist/reports** - Generate compliance summary for artist (JSON download)

#### React Hooks

The frontend provides React hooks for easy integration:

```tsx
import {
  useArtistTracks,
  useArtistRoyalties,
  useArtistClaims,
  useArtistReport,
} from '@/lib/hooks/useArtistData';

// Example usage
const { tracks, total, loading, error } = useArtistTracks({
  page: 1,
  pageSize: 50,
});
```

### SDK Integration

```typescript
import { createSDK } from '@ai-music-royalty/sdk';

const sdk = createSDK({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.ai-music-royalty.com',
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

## GDPR Compliance

### Data Protection

The platform is designed with GDPR compliance as a core principle:

- **Data Minimization**: Only necessary data is collected and processed
- **Purpose Limitation**: Data is used only for stated purposes
- **Storage Limitation**: Data is retained only as long as necessary
- **Right to Erasure**: Artists may request deletion of their personal data

### Data Handling

- **Encryption**: All data is encrypted in transit and at rest
- **Access Controls**: Strict access controls and audit logging
- **Regular Audits**: Security audits conducted quarterly
- **Incident Response**: 24-hour incident response procedures

### Data Retention Policy

- **Active Use**: Data retained while license is active
- **Revocation**: Data removed within 30 days of revocation
- **Audit Requirements**: Some data retained for compliance and audit purposes
- **Legal Requirements**: Data retained as required by applicable law

### Artist Rights

Artists have the following rights under GDPR:

- **Right to Access**: View all personal data we hold about you
- **Right to Rectification**: Correct inaccurate personal data
- **Right to Erasure**: Request deletion of personal data
- **Right to Portability**: Export your data in a machine-readable format
- **Right to Object**: Object to processing of personal data
- **Right to Restrict Processing**: Restrict how we process your data

### Data Subject Requests

To exercise your GDPR rights, please contact us at:

- **Email**: privacy@ai-music-royalty.com
- **Dashboard**: Use the artist dashboard for self-service requests
- **Response Time**: We respond to all requests within 30 days

## Legal Framework

### AI Training License

By uploading music to the platform, artists agree to our AI Training License terms:

- **Revenue Split**: 60% artist, 40% platform
- **Consent Mechanism**: Explicit consent required for each track
- **Revocation Rights**: Artists may revoke consent at any time
- **Attribution**: Complete provenance tracking and audit trails

### Compliance Standards

- **EU AI Act**: Full compliance with Article 52 transparency requirements
- **C2PA Standards**: Cryptographic provenance manifests
- **Copyright Law**: Respect for intellectual property rights
- **Data Protection**: GDPR and other applicable privacy laws

## Security

### Technical Safeguards

- **Authentication**: Multi-factor authentication for all users
- **Authorization**: Role-based access control (RBAC)
- **Encryption**: AES-256 encryption for data at rest
- **Network Security**: TLS 1.3 for all communications
- **Audit Logging**: Comprehensive audit trails for all operations

### Security Monitoring

- **Real-time Monitoring**: 24/7 security monitoring
- **Threat Detection**: Automated threat detection and response
- **Vulnerability Management**: Regular security assessments
- **Incident Response**: Documented incident response procedures

### Row Level Security (RLS)

All database queries are filtered by `artist_id` and enforced by Supabase RLS policies:

```sql
-- Artists can only view their own tracks
CREATE POLICY "Artists can view their own tracks" ON tracks
  FOR SELECT USING (artist_id = (SELECT id FROM artists WHERE auth_user_id = auth.uid()));
```

## Development Workflow

1. **Local Development**: Use `npm run dev` for frontend, `python server/main.py` for backend
2. **Testing**: Run `npm test` for frontend tests, `pytest` for backend tests
3. **Deployment**: Follow deployment guides for production deployment

## Documentation Index

- [PRD.md](./markdown/PRD.md) - Product Requirements Document
- [SYSTEM_ARCHITECTURE.md](./markdown/SYSTEM_ARCHITECTURE.md) - Technical architecture
- [DEPLOYMENT_GUIDE.md](./markdown/DEPLOYMENT_GUIDE.md) - Deployment instructions
- [SECURITY.md](./markdown/SECURITY.md) - Security and threat model
- [UI_GUIDE.md](./markdown/UI_GUIDE.md) - UI/UX guidelines
- [ROLES.md](./markdown/ROLES.md) - Engineering role definitions
- [DAILY_TASKS.md](./markdown/DAILY_TASKS.md) - Daily sprint tasks and progress

## Contributing

### Development Setup

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Add tests**
5. **Submit a pull request**

### Code Standards

- **TypeScript**: Strict mode enabled
- **Python**: PEP 8 compliance
- **Testing**: 80%+ test coverage required
- **Documentation**: All public APIs documented

## Support

### Technical Support

- **Email**: support@ai-music-royalty.com
- **Documentation**: [docs.ai-music-royalty.com](https://docs.ai-music-royalty.com)
- **Community**: [Discord](https://discord.gg/ai-music-royalty)

### Legal Support

- **Email**: legal@ai-music-royalty.com
- **Privacy**: privacy@ai-music-royalty.com
- **Compliance**: compliance@ai-music-royalty.com

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### Version 1.0.0 (2025-10-25)

- Initial release
- Provenance SDK with C2PA compliance
- Attribution engine with <5% false positive rate
- Artist portal with consent management
- GDPR compliance framework
- EU AI Act compliance
- Artist API with RLS security
- React hooks for frontend integration

---

**Last Updated:** 2025-10-25  
**Next Review:** 2025-11-25  
**Contact:** support@ai-music-royalty.com
