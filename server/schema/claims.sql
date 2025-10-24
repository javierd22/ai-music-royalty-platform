-- Claims Table Migration
-- Per PRD Section 5.1: Artist Platform - Claims Center
-- Allows artists to submit potential AI use claims

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  track_id UUID REFERENCES tracks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  file_url TEXT,
  external_link TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'confirmed', 'rejected', 'resolved')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  investigation_notes TEXT,
  resolved_by UUID REFERENCES artists(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_claims_artist_id ON claims(artist_id);
CREATE INDEX IF NOT EXISTS idx_claims_track_id ON claims(track_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_priority ON claims(priority);
CREATE INDEX IF NOT EXISTS idx_claims_created_at ON claims(created_at);

-- Create updated_at trigger for claims
CREATE TRIGGER update_claims_updated_at
  BEFORE UPDATE ON claims
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Artists can only view and manage their own claims
-- Artists can view their own claims
CREATE POLICY "Artists can view their own claims" ON claims
  FOR SELECT
  USING (
    artist_id = (SELECT id FROM artists WHERE auth_user_id = auth.uid())
  );

-- Artists can create their own claims
CREATE POLICY "Artists can create claims" ON claims
  FOR INSERT
  WITH CHECK (
    artist_id = (SELECT id FROM artists WHERE auth_user_id = auth.uid())
  );

-- Artists can update their own claims (only certain fields)
CREATE POLICY "Artists can update their own claims" ON claims
  FOR UPDATE
  USING (
    artist_id = (SELECT id FROM artists WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    artist_id = (SELECT id FROM artists WHERE auth_user_id = auth.uid())
  );

-- Artists can delete their own claims
CREATE POLICY "Artists can delete their own claims" ON claims
  FOR DELETE
  USING (
    artist_id = (SELECT id FROM artists WHERE auth_user_id = auth.uid())
  );

-- Create claim_evidence table for supporting files/links
CREATE TABLE IF NOT EXISTS claim_evidence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('audio_file', 'video_file', 'screenshot', 'link', 'document', 'other')),
  file_url TEXT,
  external_url TEXT,
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES artists(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for claim_evidence
CREATE INDEX IF NOT EXISTS idx_claim_evidence_claim_id ON claim_evidence(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_evidence_uploaded_by ON claim_evidence(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_claim_evidence_created_at ON claim_evidence(created_at);

-- Enable RLS for claim_evidence
ALTER TABLE claim_evidence ENABLE ROW LEVEL SECURITY;

-- Artists can view evidence for their own claims
CREATE POLICY "Artists can view evidence for their claims" ON claim_evidence
  FOR SELECT
  USING (
    claim_id IN (
      SELECT id FROM claims WHERE artist_id = (SELECT id FROM artists WHERE auth_user_id = auth.uid())
    )
  );

-- Artists can add evidence to their own claims
CREATE POLICY "Artists can add evidence to their claims" ON claim_evidence
  FOR INSERT
  WITH CHECK (
    claim_id IN (
      SELECT id FROM claims WHERE artist_id = (SELECT id FROM artists WHERE auth_user_id = auth.uid())
    )
  );

-- Create claim_comments table for communication
CREATE TABLE IF NOT EXISTS claim_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES artists(id),
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for claim_comments
CREATE INDEX IF NOT EXISTS idx_claim_comments_claim_id ON claim_comments(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_comments_author_id ON claim_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_claim_comments_created_at ON claim_comments(created_at);

-- Create updated_at trigger for claim_comments
CREATE TRIGGER update_claim_comments_updated_at
  BEFORE UPDATE ON claim_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for claim_comments
ALTER TABLE claim_comments ENABLE ROW LEVEL SECURITY;

-- Artists can view comments on their own claims (excluding internal comments)
CREATE POLICY "Artists can view comments on their claims" ON claim_comments
  FOR SELECT
  USING (
    claim_id IN (
      SELECT id FROM claims WHERE artist_id = (SELECT id FROM artists WHERE auth_user_id = auth.uid())
    )
    AND is_internal = false
  );

-- Artists can add comments to their own claims
CREATE POLICY "Artists can add comments to their claims" ON claim_comments
  FOR INSERT
  WITH CHECK (
    claim_id IN (
      SELECT id FROM claims WHERE artist_id = (SELECT id FROM artists WHERE auth_user_id = auth.uid())
    )
    AND author_id = (SELECT id FROM artists WHERE auth_user_id = auth.uid())
  );

