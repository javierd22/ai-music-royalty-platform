#!/bin/bash

# Post-deployment verification script for Attribution Service
# Usage: ./verify-deployment.sh https://your-service-url.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if URL is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}Error: Please provide the service URL${NC}"
    echo "Usage: ./verify-deployment.sh https://your-service-url.com"
    exit 1
fi

SERVICE_URL=$1

echo -e "${YELLOW}🔍 Verifying Attribution Service at: $SERVICE_URL${NC}"
echo "=================================================="

# Test 1: Health Check
echo -e "\n${YELLOW}1. Testing health endpoint...${NC}"
if curl -sSL "$SERVICE_URL/health" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo "Response:"
    curl -sSL "$SERVICE_URL/health" || echo "Failed to connect"
    exit 1
fi

# Test 2: CORS Headers
echo -e "\n${YELLOW}2. Testing CORS headers...${NC}"
CORS_HEADER=$(curl -sSL -I "$SERVICE_URL/health" | grep -i "access-control-allow-origin" || echo "")
if [ -n "$CORS_HEADER" ]; then
    echo -e "${GREEN}✅ CORS headers present: $CORS_HEADER${NC}"
else
    echo -e "${YELLOW}⚠️  CORS headers not found (may be configured differently)${NC}"
fi

# Test 3: Compare endpoint (without file)
echo -e "\n${YELLOW}3. Testing compare endpoint (expecting 422 for missing file)...${NC}"
HTTP_STATUS=$(curl -sSL -o /dev/null -w "%{http_code}" -X POST "$SERVICE_URL/compare")
if [ "$HTTP_STATUS" = "422" ]; then
    echo -e "${GREEN}✅ Compare endpoint responding correctly (422 for missing file)${NC}"
else
    echo -e "${YELLOW}⚠️  Compare endpoint returned status: $HTTP_STATUS${NC}"
fi

# Test 4: Check if jq is available for JSON formatting
if command -v jq &> /dev/null; then
    echo -e "\n${YELLOW}4. Testing with sample audio file (if available)...${NC}"
    echo -e "${YELLOW}   Note: This requires a test audio file. Create a small WAV file to test:${NC}"
    echo -e "${YELLOW}   curl -sSL -X POST $SERVICE_URL/compare -F \"file=@test.wav\" | jq${NC}"
else
    echo -e "\n${YELLOW}4. Install jq for better JSON formatting:${NC}"
    echo -e "${YELLOW}   curl -sSL -X POST $SERVICE_URL/compare -F \"file=@test.wav\" | jq${NC}"
fi

echo -e "\n${GREEN}🎉 Basic verification complete!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Update your Next.js app's NEXT_PUBLIC_ATTRIB_BASE_URL to: $SERVICE_URL"
echo "2. Test the upload flow in your application"
echo "3. Monitor the service logs for any issues"

echo -e "\n${YELLOW}Common issues and fixes:${NC}"
echo "• CORS origin mismatch: Check ALLOWED_ORIGINS environment variable"
echo "• 413 payload too large: Increase upload size limit in main.py"
echo "• Wrong start command: Ensure using 'uvicorn main:app --host 0.0.0.0 --port \$PORT'"
echo "• Service not starting: Check Python version is 3.11 and all dependencies installed"
