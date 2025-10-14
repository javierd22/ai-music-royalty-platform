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

-- Insert some sample data for testing
INSERT INTO tracks (title, storage_url) VALUES 
  ('demo-track.mp3', 'local://demo/demo-track.mp3');

INSERT INTO results (track_id, matches) VALUES 
  ((SELECT id FROM tracks WHERE title = 'demo-track.mp3'), 
   '[{"trackTitle": "Echoes of You", "artist": "Josh Royal", "similarity": 0.86, "percentInfluence": 0.56}, {"trackTitle": "Midnight Lies", "artist": "Ahna Mac", "similarity": 0.81, "percentInfluence": 0.30}, {"trackTitle": "Amber Skyline", "artist": "Essyonna", "similarity": 0.79, "percentInfluence": 0.14}]');

INSERT INTO royalty_events (result_id, total_amount_cents, splits) VALUES 
  ((SELECT id FROM results WHERE track_id = (SELECT id FROM tracks WHERE title = 'demo-track.mp3')), 
   100, 
   '[{"trackTitle": "Echoes of You", "artist": "Josh Royal", "percent": 0.56}, {"trackTitle": "Midnight Lies", "artist": "Ahna Mac", "percent": 0.30}, {"trackTitle": "Amber Skyline", "artist": "Essyonna", "percent": 0.14}]');
