#!/bin/bash
# ============================================================================
# Database Seeding Script
# ============================================================================
# Creates demo data for testing and demonstrations
# Usage: ./scripts/seed.sh
# ============================================================================

set -e

echo "=================================="
echo "🌱 Seeding Database"
echo "=================================="
echo ""

# Check for required environment variables
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set"
  echo "  Set it in .env.local or export it:"
  echo "  export DATABASE_URL='postgresql://...'"
  exit 1
fi

echo "Using database: $DATABASE_URL"
echo ""

# Create seed.sql if it doesn't exist
cat > /tmp/seed.sql << 'EOF'
-- ============================================================================
-- Demo Data Seed Script
-- ============================================================================

-- Insert demo artist/track
INSERT INTO public.tracks (id, title, artist, isrc, created_at, file_path)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Neon Dreams', 'Luna Eclipse', 'USRC12345678', NOW(), '/demo/neon-dreams.mp3'),
  ('660f9411-f39c-52e5-b827-557766551111'::uuid, 'Midnight Groove', 'The Synth Collective', 'USRC87654321', NOW(), '/demo/midnight-groove.mp3')
ON CONFLICT (id) DO NOTHING;

-- Insert demo SDK log
INSERT INTO public.ai_use_logs (id, model_id, track_id, prompt, confidence, created_at)
VALUES 
  ('770fa522-g40d-63f6-c938-668877662222'::uuid, 'suno-v3', '550e8400-e29b-41d4-a716-446655440000'::uuid, 'synthwave 80s neon cityscape', 0.92, NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert demo result (attribution match)
INSERT INTO public.results (id, original_track_id, similarity_score, created_at)
VALUES 
  ('880gb633-h51e-74g7-d049-779988773333'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 0.89, NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert demo royalty event (verified)
INSERT INTO public.royalty_events (id, track_id, match_confidence, payout_weight, status, tx_hash, created_at)
VALUES 
  ('990hc744-i62f-85h8-e150-880099884444'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 0.92, 2.5, 'verified', '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create demo partner
INSERT INTO public.partners (id, name, email, created_at)
VALUES 
  ('aa1id855-j73g-96i9-f261-991100995555'::uuid, 'Demo Music Label', 'demo@label.com', NOW())
ON CONFLICT (id) DO NOTHING;

-- Success message
SELECT 
  (SELECT COUNT(*) FROM public.tracks) as tracks,
  (SELECT COUNT(*) FROM public.ai_use_logs) as sdk_logs,
  (SELECT COUNT(*) FROM public.results) as results,
  (SELECT COUNT(*) FROM public.royalty_events) as events,
  (SELECT COUNT(*) FROM public.partners) as partners;

EOF

echo "Executing seed SQL..."
psql "$DATABASE_URL" < /tmp/seed.sql

echo ""
echo "✅ Database seeded successfully!"
echo ""
echo "Demo data created:"
echo "  - 2 tracks (Neon Dreams, Midnight Groove)"
echo "  - 1 SDK log"
echo "  - 1 attribution result"
echo "  - 1 verified royalty event"
echo "  - 1 demo partner"
echo ""
echo "Visit http://localhost:3000/dashboard to see the data"
echo ""

# Cleanup
rm -f /tmp/seed.sql

exit 0

