#!/bin/bash

# Test script for Royalties API
# Usage: ./test_api.sh [BASE_URL]

BASE_URL=${1:-"http://localhost:8000"}
TRACK_ID="test-track-uuid-123"

echo "🧪 Testing Royalties API at $BASE_URL"
echo "=================================="

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s "$BASE_URL/health" | jq '.' || echo "Health check failed"

echo -e "\n2. Testing partner log creation..."
PARTNER_LOG_RESPONSE=$(curl -s -X POST "$BASE_URL/sdk/log" \
  -H "Content-Type: application/json" \
  -d "{
    \"model_id\": \"suno-x\",
    \"track_id\": \"$TRACK_ID\",
    \"session_type\": \"generate\",
    \"started_at\": \"2025-10-16T10:00:00Z\",
    \"ended_at\": \"2025-10-16T10:00:30Z\",
    \"raw\": {\"note\":\"simulated\"}
  }")

echo "$PARTNER_LOG_RESPONSE" | jq '.' || echo "Partner log creation failed"
PARTNER_LOG_ID=$(echo "$PARTNER_LOG_RESPONSE" | jq -r '.partner_log_id // empty')

echo -e "\n3. Testing auditor match creation..."
AUDITOR_MATCH_RESPONSE=$(curl -s -X POST "$BASE_URL/auditor/match" \
  -H "Content-Type: application/json" \
  -d "{
    \"track_id\": \"$TRACK_ID\",
    \"output_id\": \"out-001\",
    \"model_id\": \"suno-x\",
    \"match_score\": 0.92,
    \"phrase_seconds\": [12,18,45,53]
  }")

echo "$AUDITOR_MATCH_RESPONSE" | jq '.' || echo "Auditor match creation failed"
AUDITOR_MATCH_ID=$(echo "$AUDITOR_MATCH_RESPONSE" | jq -r '.auditor_match_id // empty')

if [ -n "$PARTNER_LOG_ID" ] && [ -n "$AUDITOR_MATCH_ID" ]; then
  echo -e "\n4. Testing fusion verification..."
  FUSION_RESPONSE=$(curl -s -X POST "$BASE_URL/fusion/verify" \
    -H "Content-Type: application/json" \
    -d "{
      \"partner_log_id\": \"$PARTNER_LOG_ID\",
      \"auditor_match_id\": \"$AUDITOR_MATCH_ID\"
    }")
  
  echo "$FUSION_RESPONSE" | jq '.' || echo "Fusion verification failed"
  ROYALTY_EVENT_ID=$(echo "$FUSION_RESPONSE" | jq -r '.royalty_event_id // empty')
  
  if [ -n "$ROYALTY_EVENT_ID" ]; then
    echo -e "\n5. Testing claim creation..."
    CLAIM_RESPONSE=$(curl -s -X POST "$BASE_URL/claims/create" \
      -H "Content-Type: application/json" \
      -d "{
        \"royalty_event_id\": \"$ROYALTY_EVENT_ID\",
        \"amount_cents\": 125
      }")
    
    echo "$CLAIM_RESPONSE" | jq '.' || echo "Claim creation failed"
    
    echo -e "\n6. Testing proof certificate creation..."
    PROOF_RESPONSE=$(curl -s -X POST "$BASE_URL/proof/certificate" \
      -H "Content-Type: application/json" \
      -d "{
        \"royalty_event_id\": \"$ROYALTY_EVENT_ID\",
        \"make_public\": true
      }")
    
    echo "$PROOF_RESPONSE" | jq '.' || echo "Proof certificate creation failed"
  else
    echo "❌ No royalty event ID returned, skipping remaining tests"
  fi
else
  echo "❌ Missing partner log or auditor match ID, skipping fusion test"
fi

echo -e "\n✅ API testing complete!"
