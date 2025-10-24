-- Generation Logs Table
-- Per PRD Section 5.2: AI Partner SDK logs generation events
-- Used for C2PA manifest storage and dual proof verification

CREATE TABLE IF NOT EXISTS generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generator_id TEXT NOT NULL,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  manifest_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attribution Results Table
-- Per PRD Section 5.3: Attribution Auditor results
-- Links generation logs to matched tracks with confidence scores

CREATE TABLE IF NOT EXISTS attribution_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL REFERENCES generation_logs(id) ON DELETE CASCADE,
  matched_track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_generation_logs_generator_id ON generation_logs(generator_id);
CREATE INDEX IF NOT EXISTS idx_generation_logs_track_id ON generation_logs(track_id);
CREATE INDEX IF NOT EXISTS idx_generation_logs_start_time ON generation_logs(start_time);
CREATE INDEX IF NOT EXISTS idx_attribution_results_generation_id ON attribution_results(generation_id);
CREATE INDEX IF NOT EXISTS idx_attribution_results_matched_track_id ON attribution_results(matched_track_id);
CREATE INDEX IF NOT EXISTS idx_attribution_results_confidence ON attribution_results(confidence);
CREATE INDEX IF NOT EXISTS idx_attribution_results_verified ON attribution_results(verified);

-- Create updated_at triggers
CREATE TRIGGER update_generation_logs_updated_at
  BEFORE UPDATE ON generation_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attribution_results_updated_at
  BEFORE UPDATE ON attribution_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribution_results ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on auth requirements)
CREATE POLICY "Allow all operations on generation_logs" ON generation_logs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on attribution_results" ON attribution_results
  FOR ALL USING (true) WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE generation_logs IS 'C2PA-compatible generation event logs from AI partners';
COMMENT ON COLUMN generation_logs.generator_id IS 'AI generator identifier (e.g., suno-v3, udio-pro)';
COMMENT ON COLUMN generation_logs.track_id IS 'Reference track that influenced generation';
COMMENT ON COLUMN generation_logs.manifest_url IS 'URL to C2PA provenance manifest';
COMMENT ON TABLE attribution_results IS 'Attribution auditor detection results with confidence scores';
COMMENT ON COLUMN attribution_results.generation_id IS 'Reference to generation_logs record';
COMMENT ON COLUMN attribution_results.matched_track_id IS 'Track that was detected as similar';
COMMENT ON COLUMN attribution_results.confidence IS 'Similarity confidence score (0-1)';
COMMENT ON COLUMN attribution_results.verified IS 'Whether dual proof verification passed';
