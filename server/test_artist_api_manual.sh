#!/bin/bash
# Manual verification script for Artist API
# Run this after starting the FastAPI server with: uvicorn server.main:app --reload --port 8001

echo "🔍 Artist API Verification Script"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo "1️⃣  Checking if FastAPI server is running..."
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server is not running. Start with: uvicorn server.main:app --reload --port 8001${NC}"
    exit 1
fi

echo ""

# Check Artist API health endpoint
echo "2️⃣  Testing Artist API health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:8001/artist/health)
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Artist API is healthy${NC}"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}❌ Artist API health check failed${NC}"
    exit 1
fi

echo ""

# Check if environment variables are set
echo "3️⃣  Checking environment variables..."
if [ -z "$SUPABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  SUPABASE_URL not set${NC}"
else
    echo -e "${GREEN}✅ SUPABASE_URL is set${NC}"
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -e "${YELLOW}⚠️  SUPABASE_SERVICE_KEY not set${NC}"
else
    echo -e "${GREEN}✅ SUPABASE_SERVICE_KEY is set${NC}"
fi

echo ""

# Test without authentication (should fail)
echo "4️⃣  Testing /artist/tracks without authentication (should fail)..."
UNAUTH_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:8001/artist/tracks)
if [ "$UNAUTH_RESPONSE" == "401" ] || [ "$UNAUTH_RESPONSE" == "403" ]; then
    echo -e "${GREEN}✅ Authentication required (HTTP $UNAUTH_RESPONSE)${NC}"
else
    echo -e "${RED}❌ Expected 401/403, got HTTP $UNAUTH_RESPONSE${NC}"
fi

echo ""

# Check if JWT token is provided
echo "5️⃣  Testing with JWT token..."
if [ -z "$ARTIST_JWT_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  ARTIST_JWT_TOKEN not set. To test authenticated endpoints:${NC}"
    echo ""
    echo "   1. Log in to the frontend (/artist/login)"
    echo "   2. Get JWT token from browser dev tools (Application > Local Storage > Supabase auth)"
    echo "   3. Export the token: export ARTIST_JWT_TOKEN='your-jwt-token-here'"
    echo "   4. Re-run this script"
    echo ""
else
    echo -e "${GREEN}✅ JWT token provided${NC}"
    
    # Test /artist/tracks with auth
    echo ""
    echo "   Testing /artist/tracks with authentication..."
    TRACKS_RESPONSE=$(curl -s -H "Authorization: Bearer $ARTIST_JWT_TOKEN" \
                           http://localhost:8001/artist/tracks)
    
    if echo "$TRACKS_RESPONSE" | grep -q "tracks"; then
        TRACK_COUNT=$(echo "$TRACKS_RESPONSE" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')
        echo -e "${GREEN}✅ /artist/tracks working (total: $TRACK_COUNT tracks)${NC}"
    else
        echo -e "${RED}❌ /artist/tracks failed${NC}"
        echo "   Response: $TRACKS_RESPONSE"
    fi
    
    # Test /artist/royalties with auth
    echo ""
    echo "   Testing /artist/royalties with authentication..."
    ROYALTIES_RESPONSE=$(curl -s -H "Authorization: Bearer $ARTIST_JWT_TOKEN" \
                              http://localhost:8001/artist/royalties)
    
    if echo "$ROYALTIES_RESPONSE" | grep -q "royalties"; then
        ROYALTY_COUNT=$(echo "$ROYALTIES_RESPONSE" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')
        echo -e "${GREEN}✅ /artist/royalties working (total: $ROYALTY_COUNT events)${NC}"
    else
        echo -e "${RED}❌ /artist/royalties failed${NC}"
        echo "   Response: $ROYALTIES_RESPONSE"
    fi
    
    # Test /artist/claims with auth
    echo ""
    echo "   Testing /artist/claims with authentication..."
    CLAIMS_RESPONSE=$(curl -s -H "Authorization: Bearer $ARTIST_JWT_TOKEN" \
                           http://localhost:8001/artist/claims)
    
    if echo "$CLAIMS_RESPONSE" | grep -q "claims"; then
        CLAIM_COUNT=$(echo "$CLAIMS_RESPONSE" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')
        echo -e "${GREEN}✅ /artist/claims working (total: $CLAIM_COUNT claims)${NC}"
    else
        echo -e "${RED}❌ /artist/claims failed${NC}"
        echo "   Response: $CLAIMS_RESPONSE"
    fi
    
    # Test /artist/reports with auth
    echo ""
    echo "   Testing /artist/reports with authentication..."
    REPORTS_RESPONSE=$(curl -s -H "Authorization: Bearer $ARTIST_JWT_TOKEN" \
                            http://localhost:8001/artist/reports)
    
    if echo "$REPORTS_RESPONSE" | grep -q "report"; then
        echo -e "${GREEN}✅ /artist/reports working${NC}"
        echo "   Artist: $(echo "$REPORTS_RESPONSE" | grep -o '"artist_name":"[^"]*"' | cut -d'"' -f4)"
        echo "   Total Tracks: $(echo "$REPORTS_RESPONSE" | grep -o '"total_tracks":[0-9]*' | grep -o '[0-9]*')"
        echo "   Total Earnings: $(echo "$REPORTS_RESPONSE" | grep -o '"total_earnings":[0-9.]*' | grep -o '[0-9.]*')"
    else
        echo -e "${RED}❌ /artist/reports failed${NC}"
        echo "   Response: $REPORTS_RESPONSE"
    fi
fi

echo ""
echo "=================================="
echo "✅ Artist API verification complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Run Supabase migrations: server/schema/artists.sql, server/schema/claims.sql"
echo "   2. Verify RLS policies: server/verify_rls_policies.sql"
echo "   3. Test frontend integration with React hooks"
echo ""

