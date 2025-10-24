#!/usr/bin/env bash
# Production startup script for FastAPI
# Compatible with Render, Railway, Fly.io

set -e

echo "🚀 Starting AI Music Attribution API..."
echo "📍 Environment: ${ENVIRONMENT:-production}"
echo "🔧 Port: ${PORT:-8000}"

# Run database migrations if needed (uncomment when migrations are ready)
# echo "📦 Running migrations..."
# python -m alembic upgrade head

# Start uvicorn with production settings
exec uvicorn main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --workers "${WORKERS:-2}" \
  --proxy-headers \
  --forwarded-allow-ips='*' \
  --no-access-log

