# Environment Variables Setup Guide

## Required Environment Variables

Set these in your deployment platform (Railway, Fly.io, Render, etc.):

### Essential (Required)

```bash
SUPABASE_URL=https://ckzrzrppehclehxcthkh.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key_here
```

### Optional (Can be empty for now)

```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
CHAIN_RPC_URL=https://mainnet.infura.io/v3/your_project_id
CHAIN_SENDER_PK=your_private_key_here
PROOF_LEDGER_ADDR=0x1234567890123456789012345678901234567890
PROOF_LEDGER_ABI=[{"inputs":[],"name":"example","outputs":[],"type":"function"}]
```

## Local Development

### 1. Set Environment Variables

```bash
export SUPABASE_URL="https://ckzrzrppehclehxcthkh.supabase.co"
export SUPABASE_SERVICE_KEY="your_service_role_key_here"
```

### 2. Install Dependencies

```bash
cd attrib-service
pip install -r requirements.txt
```

### 3. Start Server

```bash
python main.py
```

### 4. Test Health Endpoint

```bash
curl http://localhost:8000/health
```

## API Testing

### Test Track ID

First, you need a valid track UUID from your database. You can get one by:

1. Going to your Supabase dashboard
2. Navigate to the `tracks` table
3. Copy a track ID

### 1. Create Partner Log

```bash
curl -X POST "http://localhost:8000/sdk/log" \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "suno-x",
    "track_id": "YOUR_TRACK_UUID",
    "session_type": "generate",
    "started_at": "2025-10-16T10:00:00Z",
    "ended_at": "2025-10-16T10:00:30Z",
    "raw": {"note":"simulated"}
  }'
```

### 2. Create Auditor Match

```bash
curl -X POST "http://localhost:8000/auditor/match" \
  -H "Content-Type: application/json" \
  -d '{
    "track_id": "YOUR_TRACK_UUID",
    "output_id": "out-001",
    "model_id": "suno-x",
    "match_score": 0.92,
    "phrase_seconds": [12,18,45,53]
  }'
```

### 3. Fuse into Royalty Event

```bash
curl -X POST "http://localhost:8000/fusion/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "partner_log_id": "PARTNER_LOG_UUID",
    "auditor_match_id": "AUDITOR_MATCH_UUID"
  }'
```

### 4. Create Claim

```bash
curl -X POST "http://localhost:8000/claims/create" \
  -H "Content-Type: application/json" \
  -d '{
    "royalty_event_id": "ROYALTY_EVENT_UUID",
    "amount_cents": 125
  }'
```

### 5. Create Proof Certificate

```bash
curl -X POST "http://localhost:8000/proof/certificate" \
  -H "Content-Type: application/json" \
  -d '{
    "royalty_event_id": "ROYALTY_EVENT_UUID",
    "make_public": true
  }'
```

## Database Schema Required

Make sure your Supabase database has these tables:

- `partner_logs`
- `auditor_matches`
- `royalty_events`
- `royalty_claims`
- `proof_certificates`

## Deployment Platforms

### Railway

1. Connect your GitHub repo
2. Set environment variables in Railway dashboard
3. Deploy from main branch

### Fly.io

1. Create `fly.toml` configuration
2. Set secrets: `fly secrets set SUPABASE_URL=...`
3. Deploy: `fly deploy`

### Render

1. Create new Web Service
2. Connect GitHub repo
3. Set environment variables
4. Deploy
