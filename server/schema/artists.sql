-- Artists Table Migration
-- Per PRD Section 5.1: Artist Platform
-- Stores artist identity and authentication data

-- Create artists table
CREATE TABLE IF NOT EXISTS artists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  wallet TEXT UNIQUE,
  email_verified BOOLEAN DEFAULT false,
  verification_code TEXT,
  verification_expires_at TIMESTAMP WITH TIME ZONE,
  auth_user_id UUID, -- Reference to Supabase Auth user if using Supabase Auth
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add artist ownership to tracks table
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS artist_id UUID REFERENCES artists(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_artists_email ON artists(email);
CREATE INDEX IF NOT EXISTS idx_artists_wallet ON artists(wallet);
CREATE INDEX IF NOT EXISTS idx_artists_auth_user_id ON artists(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_tracks_artist_id ON tracks(artist_id);

-- Create updated_at trigger for artists
CREATE TRIGGER update_artists_updated_at
  BEFORE UPDATE ON artists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Artists can only read and update their own data
-- Artists can view their own profile
CREATE POLICY "Artists can view their own profile" ON artists
  FOR SELECT
  USING (
    auth.uid() = auth_user_id
    OR id = (SELECT id FROM artists WHERE auth_user_id = auth.uid())
  );

-- Artists can update their own profile
CREATE POLICY "Artists can update their own profile" ON artists
  FOR UPDATE
  USING (
    auth.uid() = auth_user_id
    OR id = (SELECT id FROM artists WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = auth_user_id
    OR id = (SELECT id FROM artists WHERE auth_user_id = auth.uid())
  );

-- Allow artists to be created during registration (public access)
CREATE POLICY "Allow artist registration" ON artists
  FOR INSERT
  WITH CHECK (true);

-- Update tracks RLS policy to allow artists to view their own tracks
DROP POLICY IF EXISTS "Allow all operations on tracks" ON tracks;

-- Artists can view their own tracks
CREATE POLICY "Artists can view their own tracks" ON tracks
  FOR SELECT
  USING (
    artist_id = (SELECT id FROM artists WHERE auth_user_id = auth.uid())
    OR true -- Keep permissive for now, adjust based on requirements
  );

-- Artists can insert their own tracks
CREATE POLICY "Artists can insert their own tracks" ON tracks
  FOR INSERT
  WITH CHECK (
    artist_id = (SELECT id FROM artists WHERE auth_user_id = auth.uid())
    OR true -- Keep permissive for now
  );

-- Artists can update their own tracks
CREATE POLICY "Artists can update their own tracks" ON tracks
  FOR UPDATE
  USING (
    artist_id = (SELECT id FROM artists WHERE auth_user_id = auth.uid())
    OR true -- Keep permissive for now
  )
  WITH CHECK (
    artist_id = (SELECT id FROM artists WHERE auth_user_id = auth.uid())
    OR true -- Keep permissive for now
  );

-- Create artist_sessions table for session management (if not using Supabase Auth)
CREATE TABLE IF NOT EXISTS artist_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artist_sessions_artist_id ON artist_sessions(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_sessions_token ON artist_sessions(token);
CREATE INDEX IF NOT EXISTS idx_artist_sessions_expires_at ON artist_sessions(expires_at);

-- Enable RLS for sessions
ALTER TABLE artist_sessions ENABLE ROW LEVEL SECURITY;

-- Sessions can only be read by the owning artist
CREATE POLICY "Artists can view their own sessions" ON artist_sessions
  FOR SELECT
  USING (
    artist_id = (SELECT id FROM artists WHERE auth_user_id = auth.uid())
  );

-- Allow session creation during login
CREATE POLICY "Allow session creation" ON artist_sessions
  FOR INSERT
  WITH CHECK (true);

-- Allow session deletion for logout
CREATE POLICY "Artists can delete their own sessions" ON artist_sessions
  FOR DELETE
  USING (
    artist_id = (SELECT id FROM artists WHERE auth_user_id = auth.uid())
  );

