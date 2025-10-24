#!/bin/bash

# Start the main FastAPI service with proper Python path
export PYTHONPATH="/Users/rubendevries/ai-music-royalty-platform:$PYTHONPATH"

echo "Starting FastAPI service on port 8001..."
echo "PYTHONPATH: $PYTHONPATH"

cd /Users/rubendevries/ai-music-royalty-platform
PYTHONPATH=/Users/rubendevries/ai-music-royalty-platform python server/main.py
