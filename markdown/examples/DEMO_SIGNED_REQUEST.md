# Demo: Correctly Signed POST /sdk/log_use Request

This document demonstrates the exact steps to create a correctly signed request to the Partner SDK API, including signature generation with full example values.

## Prerequisites

1. **Partner and API Key Created:**

```bash
# 1. Create partner
curl -X POST http://localhost:8001/keys/partners \
  -H "Content-Type: application/json" \
  -d '{"name": "Demo Partner", "email": "demo@example.com"}'

# Response (save partner_id):
# {
#   "id": "550e8400-e29b-41d4-a716-446655440000",
#   "name": "Demo Partner",
#   ...
# }

# 2. Create API key
curl -X POST http://localhost:8001/keys/create \
  -H "Content-Type: application/json" \
  -d '{
    "partner_id": "550e8400-e29b-41d4-a716-446655440000",
    "scopes": ["log:write", "log:read"]
  }'

# Response (SAVE THE full_key - shown once only!):
# {
#   "id": "...",
#   "full_key": "pk_live_abc123def456.xyz789uvw012abc345def678ghi901jkl234mno567pqr890",
#   "key_prefix": "pk_live_abc123def456",
#   ...
# }
```

2. **Track Exists in Database:**

```sql
-- Create a test track in Supabase SQL Editor
INSERT INTO tracks (id, title, artist, file_path, duration, created_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Test Track',
  'Test Artist',
  'test.mp3',
  180,
  NOW()
);
```

## Signature Generation Steps

### Step 1: Prepare Request Components

```python
method = "POST"
path = "/sdk/log_use"
body = {
    "model_id": "suno-v3",
    "track_id": "550e8400-e29b-41d4-a716-446655440000",
    "prompt": "Generate lo-fi hip hop beat",
    "confidence": 0.87
}
timestamp = "2025-10-17T14:30:00Z"  # Current UTC time
nonce = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"  # Unique UUID
```

### Step 2: Extract Secret from API Key

```python
api_key = "pk_live_abc123def456.xyz789uvw012abc345def678ghi901jkl234mno567pqr890"
secret = api_key.split(".")[-1]  # "xyz789uvw012abc345def678ghi901jkl234mno567pqr890"
```

### Step 3: Construct Signing Payload

```python
import json

# Serialize body (no spaces, sorted keys)
body_json = json.dumps(body, separators=(',', ':'))
# Result: '{"confidence":0.87,"model_id":"suno-v3","prompt":"Generate lo-fi hip hop beat","track_id":"550e8400-e29b-41d4-a716-446655440000"}'

# Build payload
payload = f"{method}\n{path}\n{timestamp}\n{body_json}"

# Result:
# POST
# /sdk/log_use
# 2025-10-17T14:30:00Z
# {"confidence":0.87,"model_id":"suno-v3","prompt":"Generate lo-fi hip hop beat","track_id":"550e8400-e29b-41d4-a716-446655440000"}
```

### Step 4: Compute HMAC-SHA256 Signature

```python
import hmac
import hashlib

signature = hmac.new(
    secret.encode('utf-8'),
    payload.encode('utf-8'),
    hashlib.sha256
).hexdigest()

# Result (example): "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
```

### Step 5: Send Request

```bash
curl -X POST http://localhost:8001/sdk/log_use \
  -H "Content-Type: application/json" \
  -H "x-api-key: pk_live_abc123def456.xyz789uvw012abc345def678ghi901jkl234mno567pqr890" \
  -H "x-timestamp: 2025-10-17T14:30:00Z" \
  -H "x-nonce: a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "x-signature: a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456" \
  -d '{
    "model_id": "suno-v3",
    "track_id": "550e8400-e29b-41d4-a716-446655440000",
    "prompt": "Generate lo-fi hip hop beat",
    "confidence": 0.87
  }'
```

## Expected Response

**Success (201 Created):**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "model_id": "suno-v3",
  "track_id": "550e8400-e29b-41d4-a716-446655440000",
  "prompt": "Generate lo-fi hip hop beat",
  "confidence": 0.87,
  "metadata": {},
  "created_at": "2025-10-17T14:30:01.123456Z"
}
```

## Complete Python Script

```python
#!/usr/bin/env python3
import hashlib
import hmac
import json
from datetime import datetime
from uuid import uuid4
import requests

# Configuration
API_URL = "http://localhost:8001"
API_KEY = "pk_live_abc123def456.xyz789uvw012abc345def678ghi901jkl234mno567pqr890"
TRACK_ID = "550e8400-e29b-41d4-a716-446655440000"

# Request details
method = "POST"
path = "/sdk/log_use"
body = {
    "model_id": "suno-v3",
    "track_id": TRACK_ID,
    "prompt": "Generate lo-fi hip hop beat",
    "confidence": 0.87,
}

# Generate timestamp and nonce
timestamp = datetime.utcnow().isoformat() + "Z"
nonce = str(uuid4())

# Extract secret
secret = API_KEY.split(".")[-1]

# Compute signature
body_json = json.dumps(body, separators=(",", ":"))
payload = f"{method}\n{path}\n{timestamp}\n{body_json}"
signature = hmac.new(
    secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256
).hexdigest()

# Send request
response = requests.post(
    f"{API_URL}{path}",
    headers={
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "x-timestamp": timestamp,
        "x-nonce": nonce,
        "x-signature": signature,
    },
    json=body,
)

print(f"Status: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")
```

Or use the provided demo script:

```bash
python server/demo_signed_request.py \
  --api-url http://localhost:8001 \
  --api-key "pk_live_abc123def456.xyz789uvw012abc345def678ghi901jkl234mno567pqr890" \
  --track-id "550e8400-e29b-41d4-a716-446655440000"
```

## Troubleshooting

### Error: 401 Unauthorized - "Invalid signature or timestamp"

**Cause:** Signature mismatch or timestamp too old

**Solutions:**

1. Ensure timestamp is current (within 5 minutes)
2. Verify body JSON serialization matches exactly (no extra spaces)
3. Check secret is extracted correctly from API key
4. Confirm payload construction: `method\npath\ntimestamp\nbody`

### Error: 401 Unauthorized - "Nonce already used"

**Cause:** Replay attack detected

**Solutions:**

1. Generate a new UUID for each request
2. Don't reuse nonces from previous requests
3. Check server logs for nonce cleanup (should run hourly)

### Error: 404 Not Found - "Track not found"

**Cause:** Track UUID doesn't exist in database

**Solutions:**

1. Verify track exists: `SELECT id FROM tracks WHERE id = 'YOUR_TRACK_ID'`
2. Create track or use existing track UUID

### Error: 429 Too Many Requests

**Cause:** Rate limit exceeded (60 requests/minute)

**Solutions:**

1. Wait for retry_after seconds (check `Retry-After` header)
2. Reduce request frequency
3. If legitimate high volume, contact admin to increase limit

## Security Notes

- **Never commit API keys to version control**
- **Rotate keys every 90 days minimum**
- **Monitor `last_used_at` timestamps for unusual activity**
- **Revoke keys immediately if compromised:** `DELETE /keys/revoke/{key_id}`
- **Use HTTPS in production** (TLS encrypts API key in transit)

## Next Steps

1. View created log in dashboard: http://localhost:3000/dashboard/logs
2. Check for dual proof status (if attribution result exists)
3. Verify audit trail in `ai_use_logs` table
4. Review structured logs for security events

## References

- Threat Model: `THREAT_MODEL.md`
- Security Documentation: `README.md` - Security section
- Verification Checklist: `SECURITY_VERIFICATION.md`
- Full RLS Policies: `server/schema/security.sql`
