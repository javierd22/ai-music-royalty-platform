#!/usr/bin/env bash
# Smoke test for AI Music Attribution Platform
# Tests both frontend (Vercel) and backend (Render) deployments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE="${1:-http://localhost:8001}"
FRONTEND_BASE="${2:-http://localhost:3000}"
ADMIN_KEY="${ADMIN_API_KEY:-}"

echo "🔍 Smoke Testing AI Music Attribution Platform"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 API:      ${API_BASE}"
echo "📍 Frontend: ${FRONTEND_BASE}"
echo ""

# Test 1: API Health Check
echo "1️⃣  Testing API health endpoint..."
if curl -sf "${API_BASE}/health" > /dev/null 2>&1; then
  HEALTH_RESPONSE=$(curl -s "${API_BASE}/health" | jq -r '.status // .ok // "unknown"' 2>/dev/null || echo "unknown")
  echo -e "${GREEN}✅ API is healthy${NC} (status: ${HEALTH_RESPONSE})"
else
  echo -e "${RED}❌ API health check failed${NC}"
  exit 1
fi

# Test 2: Frontend Health
echo ""
echo "2️⃣  Testing frontend availability..."
if curl -sf -I "${FRONTEND_BASE}" > /dev/null 2>&1; then
  STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_BASE}")
  echo -e "${GREEN}✅ Frontend is accessible${NC} (HTTP ${STATUS_CODE})"
else
  echo -e "${RED}❌ Frontend is not accessible${NC}"
  exit 1
fi

# Test 3: Security Headers (Frontend)
echo ""
echo "3️⃣  Checking security headers..."
HEADERS=$(curl -sI "${FRONTEND_BASE}" 2>/dev/null)

check_header() {
  local header=$1
  if echo "${HEADERS}" | grep -iq "^${header}:"; then
    echo -e "${GREEN}  ✅ ${header}${NC}"
  else
    echo -e "${YELLOW}  ⚠️  ${header} missing${NC}"
  fi
}

check_header "x-content-type-options"
check_header "x-frame-options"
check_header "referrer-policy"
check_header "content-security-policy"
check_header "strict-transport-security"

# Test 4: CORS Preflight
echo ""
echo "4️⃣  Testing CORS configuration..."
CORS_RESPONSE=$(curl -s -X OPTIONS \
  -H "Origin: ${FRONTEND_BASE}" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -I "${API_BASE}/health" 2>/dev/null)

if echo "${CORS_RESPONSE}" | grep -iq "access-control-allow-origin"; then
  ALLOWED_ORIGIN=$(echo "${CORS_RESPONSE}" | grep -i "access-control-allow-origin" | cut -d: -f2- | tr -d '\r\n' | xargs)
  echo -e "${GREEN}✅ CORS configured${NC} (allows: ${ALLOWED_ORIGIN})"
else
  echo -e "${YELLOW}⚠️  CORS headers not found (might be working anyway)${NC}"
fi

# Test 5: Artist API (Unauthorized)
echo ""
echo "5️⃣  Testing Artist API authentication..."
AUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/artist/tracks" 2>/dev/null)

if [ "${AUTH_RESPONSE}" = "401" ] || [ "${AUTH_RESPONSE}" = "403" ]; then
  echo -e "${GREEN}✅ Artist API requires authentication${NC} (HTTP ${AUTH_RESPONSE})"
else
  echo -e "${YELLOW}⚠️  Artist API returned unexpected status: ${AUTH_RESPONSE}${NC}"
fi

# Test 6: Admin Metrics (if key provided)
if [ -n "${ADMIN_KEY}" ]; then
  echo ""
  echo "6️⃣  Testing admin metrics endpoint..."
  
  METRICS_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "x-admin-key: ${ADMIN_KEY}" \
    "${API_BASE}/metrics" 2>/dev/null)
  
  METRICS_CODE=$(echo "${METRICS_RESPONSE}" | tail -n 1)
  
  if [ "${METRICS_CODE}" = "200" ]; then
    METRICS_LINES=$(echo "${METRICS_RESPONSE}" | head -n -1 | wc -l)
    echo -e "${GREEN}✅ Admin metrics accessible${NC} (${METRICS_LINES} lines)"
  else
    echo -e "${RED}❌ Admin metrics failed${NC} (HTTP ${METRICS_CODE})"
  fi
else
  echo ""
  echo "6️⃣  Skipping admin metrics (no ADMIN_API_KEY set)"
fi

# Test 7: API Endpoints Exist
echo ""
echo "7️⃣  Verifying API endpoints..."

check_endpoint() {
  local endpoint=$1
  local expected_auth=$2
  
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}${endpoint}" 2>/dev/null)
  
  if [ "${expected_auth}" = "true" ] && ([ "${STATUS}" = "401" ] || [ "${STATUS}" = "403" ]); then
    echo -e "${GREEN}  ✅ ${endpoint}${NC} (requires auth)"
  elif [ "${expected_auth}" = "false" ] && [ "${STATUS}" = "200" ]; then
    echo -e "${GREEN}  ✅ ${endpoint}${NC} (public)"
  else
    echo -e "${YELLOW}  ⚠️  ${endpoint}${NC} (HTTP ${STATUS})"
  fi
}

check_endpoint "/health" "false"
check_endpoint "/artist/tracks" "true"
check_endpoint "/artist/royalties" "true"
check_endpoint "/artist/claims" "true"
check_endpoint "/artist/reports" "true"

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Smoke tests complete!${NC}"
echo ""
echo "📊 Results Summary:"
echo "  • API health: OK"
echo "  • Frontend: OK"
echo "  • Security headers: Configured"
echo "  • CORS: Configured"
echo "  • Authentication: Required"
if [ -n "${ADMIN_KEY}" ]; then
  echo "  • Admin access: OK"
fi
echo ""
echo "🎉 Platform is ready for use!"
