#!/bin/bash

# Test script for Artist Identity & Dashboard module
# Verifies that all required files exist and have correct structure

set -e

echo "🧪 Testing Artist Identity & Dashboard Module"
echo "================================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test file existence
test_file_exists() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1 exists"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗${NC} $1 is missing"
    ((TESTS_FAILED++))
  fi
}

# Function to test directory existence
test_dir_exists() {
  if [ -d "$1" ]; then
    echo -e "${GREEN}✓${NC} $1 directory exists"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗${NC} $1 directory is missing"
    ((TESTS_FAILED++))
  fi
}

# Function to test string in file
test_string_in_file() {
  if grep -q "$2" "$1"; then
    echo -e "${GREEN}✓${NC} $1 contains '$2'"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗${NC} $1 missing '$2'"
    ((TESTS_FAILED++))
  fi
}

echo "📁 Testing Database Migrations..."
test_file_exists "server/schema/artists.sql"
test_file_exists "server/schema/claims.sql"
test_string_in_file "server/schema/artists.sql" "CREATE TABLE IF NOT EXISTS artists"
test_string_in_file "server/schema/claims.sql" "CREATE TABLE IF NOT EXISTS claims"
echo ""

echo "🔐 Testing Auth Helpers..."
test_file_exists "src/lib/supabase/auth.ts"
test_string_in_file "src/lib/supabase/auth.ts" "registerArtist"
test_string_in_file "src/lib/supabase/auth.ts" "loginArtist"
test_string_in_file "src/lib/supabase/auth.ts" "getCurrentArtist"
echo ""

echo "📄 Testing Frontend Pages..."
test_dir_exists "src/app/artist"
test_file_exists "src/app/artist/register/page.tsx"
test_file_exists "src/app/artist/login/page.tsx"
test_file_exists "src/app/artist/dashboard/page.tsx"
test_file_exists "src/app/artist/claims/page.tsx"
test_string_in_file "src/app/artist/register/page.tsx" "Artist Registration"
test_string_in_file "src/app/artist/login/page.tsx" "Artist Login"
test_string_in_file "src/app/artist/dashboard/page.tsx" "Artist Dashboard"
test_string_in_file "src/app/artist/claims/page.tsx" "Claims Center"
echo ""

echo "🎨 Testing Reusable Components..."
test_file_exists "src/components/TrackCard.tsx"
test_file_exists "src/components/ClaimForm.tsx"
test_file_exists "src/components/ProofBadge.tsx"
test_string_in_file "src/components/TrackCard.tsx" "TrackCard"
test_string_in_file "src/components/ClaimForm.tsx" "ClaimForm"
test_string_in_file "src/components/ProofBadge.tsx" "ProofBadge"
echo ""

echo "🛠️ Testing API Routes..."
test_file_exists "src/app/api/claims/create/route.ts"
test_string_in_file "src/app/api/claims/create/route.ts" "POST"
echo ""

echo "📚 Testing API Client Library..."
test_file_exists "src/lib/api/claims.ts"
test_string_in_file "src/lib/api/claims.ts" "createClaim"
test_string_in_file "src/lib/api/claims.ts" "getClaims"
echo ""

echo "🔒 Testing Middleware..."
test_file_exists "src/middleware.ts"
test_string_in_file "src/middleware.ts" "middleware"
test_string_in_file "src/middleware.ts" "auth"
echo ""

echo "📖 Testing Documentation..."
test_file_exists "ARTIST_IDENTITY_IMPLEMENTATION.md"
echo ""

echo "================================================"
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  echo ""
  echo "✅ Artist Identity & Dashboard module is ready for deployment"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  echo ""
  echo "❌ Please review the failed tests above"
  exit 1
fi

