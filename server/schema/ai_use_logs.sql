-- AI Partner SDK Use Logs Table
-- Per PRD Section 5.2: AI Partner SDK logs generation events
-- Used for Dual Proof verification with attribution results

CREATE TABLE IF NOT EXISTS ai_use_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  prompt TEXT,
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_ai_use_logs_track_id ON ai_use_logs(track_id);
CREATE INDEX IF NOT EXISTS idx_ai_use_logs_model_id ON ai_use_logs(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_use_logs_created_at ON ai_use_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_use_logs_track_created ON ai_use_logs(track_id, created_at);

-- Create updated_at trigger
CREATE TRIGGER update_ai_use_logs_updated_at
  BEFORE UPDATE ON ai_use_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE ai_use_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (adjust based on auth requirements)
CREATE POLICY "Allow all operations on ai_use_logs" ON ai_use_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE ai_use_logs IS 'Logs from AI partner SDK tracking music generation events';
COMMENT ON COLUMN ai_use_logs.model_id IS 'AI model identifier (e.g., suno-v3, udio-pro)';
COMMENT ON COLUMN ai_use_logs.track_id IS 'Reference track that influenced generation';
COMMENT ON COLUMN ai_use_logs.prompt IS 'Generation prompt from AI partner';
COMMENT ON COLUMN ai_use_logs.confidence IS 'SDK-reported influence confidence (0-1)';
COMMENT ON COLUMN ai_use_logs.metadata IS 'Additional SDK metadata (session_id, output_id, etc.)';
