#!/bin/bash
#
# Attribution Auditor CLI Runner
# 
# Usage:
#   ./run_auditor.sh                    # Run continuously
#   ./run_auditor.sh --once             # Run once and exit
#   ./run_auditor.sh --dry-run          # Dry run mode
#   ./run_auditor.sh --once --dry-run   # Dry run once
#

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if .env file exists and load it
if [ -f ".env" ]; then
    echo "📝 Loading environment from .env file..."
    set -a
    source .env
    set +a
fi

# Run the auditor
echo "🚀 Starting Attribution Auditor..."
echo ""

python jobs/auditor.py "$@"
