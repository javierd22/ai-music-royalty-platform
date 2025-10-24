-- AI Music Royalty Platform Database Schema
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create tracks table
CREATE TABLE IF NOT EXISTS tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create results table
CREATE TABLE IF NOT EXISTS results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  matches JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create royalty_events table
CREATE TABLE IF NOT EXISTS royalty_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  result_id UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  total_amount_cents INTEGER NOT NULL CHECK (total_amount_cents >= 0),
  splits JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title);
CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON tracks(created_at);
CREATE INDEX IF NOT EXISTS idx_results_track_id ON results(track_id);
CREATE INDEX IF NOT EXISTS idx_results_created_at ON results(created_at);
CREATE INDEX IF NOT EXISTS idx_royalty_events_result_id ON royalty_events(result_id);
CREATE INDEX IF NOT EXISTS idx_royalty_events_created_at ON royalty_events(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_results_updated_at
  BEFORE UPDATE ON results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_royalty_events_updated_at
  BEFORE UPDATE ON royalty_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE royalty_events ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your auth requirements)
-- For demo purposes, allowing all operations
CREATE POLICY "Allow all operations on tracks" ON tracks
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on results" ON results
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on royalty_events" ON royalty_events
  FOR ALL USING (true) WITH CHECK (true);

-- Create logs table for attribution service logging
CREATE TABLE IF NOT EXISTS logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for logs table
CREATE INDEX IF NOT EXISTS idx_logs_event_type ON logs(event_type);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);

-- Enable RLS for logs table
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Create policy for logs table (allow all operations for service role)
CREATE POLICY "Allow all operations on logs" ON logs
  FOR ALL USING (true) WITH CHECK (true);

-- Create partner_logs table for SDK logging
CREATE TABLE IF NOT EXISTS partner_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id TEXT NOT NULL,
  track_id UUID NOT NULL REFERENCES tracks(id),
  session_type TEXT NOT NULL CHECK (session_type IN ('train', 'generate')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  raw JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create auditor_matches table for AI detection results
CREATE TABLE IF NOT EXISTS auditor_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES tracks(id),
  output_id TEXT NOT NULL,
  model_id TEXT,
  match_score FLOAT NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
  phrase_seconds INTEGER[],
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update royalty_events table for new structure
ALTER TABLE royalty_events ADD COLUMN IF NOT EXISTS track_id UUID REFERENCES tracks(id);
ALTER TABLE royalty_events ADD COLUMN IF NOT EXISTS model_id TEXT;
ALTER TABLE royalty_events ADD COLUMN IF NOT EXISTS partner_log_id UUID REFERENCES partner_logs(id);
ALTER TABLE royalty_events ADD COLUMN IF NOT EXISTS auditor_match_id UUID REFERENCES auditor_matches(id);
ALTER TABLE royalty_events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE royalty_events ADD COLUMN IF NOT EXISTS payable BOOLEAN DEFAULT false;

-- Create royalty_claims table
CREATE TABLE IF NOT EXISTS royalty_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES tracks(id),
  artist_id UUID,
  distributor_id UUID,
  royalty_event_id UUID NOT NULL REFERENCES royalty_events(id),
  amount_cents INTEGER NOT NULL,
  state TEXT DEFAULT 'ready',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create proof_certificates table
CREATE TABLE IF NOT EXISTS proof_certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  royalty_event_id UUID NOT NULL REFERENCES royalty_events(id),
  public BOOLEAN DEFAULT false,
  verification_hash TEXT NOT NULL,
  onchain_tx TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_partner_logs_track_id ON partner_logs(track_id);
CREATE INDEX IF NOT EXISTS idx_partner_logs_model_id ON partner_logs(model_id);
CREATE INDEX IF NOT EXISTS idx_auditor_matches_track_id ON auditor_matches(track_id);
CREATE INDEX IF NOT EXISTS idx_auditor_matches_model_id ON auditor_matches(model_id);
CREATE INDEX IF NOT EXISTS idx_royalty_events_track_id ON royalty_events(track_id);
CREATE INDEX IF NOT EXISTS idx_royalty_events_status ON royalty_events(status);
CREATE INDEX IF NOT EXISTS idx_royalty_claims_royalty_event_id ON royalty_claims(royalty_event_id);
CREATE INDEX IF NOT EXISTS idx_proof_certificates_royalty_event_id ON proof_certificates(royalty_event_id);

-- Enable RLS for new tables
ALTER TABLE partner_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditor_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE royalty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_certificates ENABLE ROW LEVEL SECURITY;

-- Create policies for new tables
CREATE POLICY "Allow all operations on partner_logs" ON partner_logs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on auditor_matches" ON auditor_matches
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on royalty_claims" ON royalty_claims
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on proof_certificates" ON proof_certificates
  FOR ALL USING (true) WITH CHECK (true);

-- Insert some sample data for testing
INSERT INTO tracks (title, storage_url) VALUES 
  ('demo-track.mp3', 'local://demo/demo-track.mp3');

INSERT INTO results (track_id, matches) VALUES 
  ((SELECT id FROM tracks WHERE title = 'demo-track.mp3'), 
   '[{"trackTitle": "Echoes of You", "artist": "Josh Royal", "similarity": 0.86, "percentInfluence": 0.56}, {"trackTitle": "Midnight Lies", "artist": "Ahna Mac", "similarity": 0.81, "percentInfluence": 0.30}, {"trackTitle": "Amber Skyline", "artist": "Essyonna", "similarity": 0.79, "percentInfluence": 0.14}]');

INSERT INTO royalty_events (result_id, total_amount_cents, splits, track_id) VALUES 
  ((SELECT id FROM results WHERE track_id = (SELECT id FROM tracks WHERE title = 'demo-track.mp3')), 
   100, 
   '[{"trackTitle": "Echoes of You", "artist": "Josh Royal", "percent": 0.56}, {"trackTitle": "Midnight Lies", "artist": "Ahna Mac", "percent": 0.30}, {"trackTitle": "Amber Skyline", "artist": "Essyonna", "percent": 0.14}]',
   (SELECT id FROM tracks WHERE title = 'demo-track.mp3'));
