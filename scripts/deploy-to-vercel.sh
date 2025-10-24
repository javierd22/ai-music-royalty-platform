#!/bin/bash

# AI Music Royalty Attribution Platform - Vercel Deployment Script
# Per PRD Section 11: Next 7-Day Execution

set -e

echo "🚀 Starting Vercel deployment for AI Music Royalty Attribution Platform..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if user is logged in
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel. Please run 'vercel login' first."
    exit 1
fi

# Navigate to web app directory
cd apps/web

echo "📦 Installing dependencies..."
npm install

echo "🔧 Building application..."
npm run build

echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set up environment variables in Vercel dashboard"
echo "2. Verify deployment at the provided URL"
echo "3. Test all functionality"
echo "4. Set up monitoring and alerts"
echo ""
echo "🔗 Environment variables needed:"
echo "- NEXT_PUBLIC_SUPABASE_URL"
echo "- NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "- SUPABASE_SERVICE_ROLE_KEY"
echo "- JWT_SECRET"
echo "- CORS_ALLOW_ORIGINS"
echo "- BACKEND_URL"
echo ""
echo "📖 See docs/deployment/vercel_deployment_guide.md for detailed instructions"
