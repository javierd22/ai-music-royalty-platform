-- Row Level Security Policies for Artist Consent and Data Protection
-- Per PRD Section 5.1: Artist Platform with RLS enforcement
-- Per PRD Section 12: Ethical & Legal Design Principles

-- ============================================================================
-- ARTIST CONSENT POLICIES
-- ============================================================================

-- Enable RLS on tracks table
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Policy: Artists can only see their own tracks
CREATE POLICY "Artists can view own tracks" ON tracks
  FOR SELECT USING (auth.uid() = artist_id);

-- Policy: Artists can insert their own tracks
CREATE POLICY "Artists can insert own tracks" ON tracks
  FOR INSERT WITH CHECK (auth.uid() = artist_id);

-- Policy: Artists can update their own tracks
CREATE POLICY "Artists can update own tracks" ON tracks
  FOR UPDATE USING (auth.uid() = artist_id);

-- Policy: Artists can delete their own tracks
CREATE POLICY "Artists can delete own tracks" ON tracks
  FOR DELETE USING (auth.uid() = artist_id);

-- ============================================================================
-- AI USE LOGS POLICIES
-- ============================================================================

-- Enable RLS on ai_use_logs table
ALTER TABLE ai_use_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Artists can view logs for their tracks
CREATE POLICY "Artists can view logs for own tracks" ON ai_use_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tracks 
      WHERE tracks.id = ai_use_logs.track_id 
      AND tracks.artist_id = auth.uid()
    )
  );

-- Policy: System can insert logs (service role)
CREATE POLICY "System can insert logs" ON ai_use_logs
  FOR INSERT WITH CHECK (true);

-- Policy: System can update logs (service role)
CREATE POLICY "System can update logs" ON ai_use_logs
  FOR UPDATE WITH CHECK (true);

-- ============================================================================
-- GENERATION LOGS POLICIES
-- ============================================================================

-- Enable RLS on generation_logs table
ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Artists can view generation logs for their tracks
CREATE POLICY "Artists can view generation logs for own tracks" ON generation_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tracks 
      WHERE tracks.id = generation_logs.track_id 
      AND tracks.artist_id = auth.uid()
    )
  );

-- Policy: System can insert generation logs (service role)
CREATE POLICY "System can insert generation logs" ON generation_logs
  FOR INSERT WITH CHECK (true);

-- Policy: System can update generation logs (service role)
CREATE POLICY "System can update generation logs" ON generation_logs
  FOR UPDATE WITH CHECK (true);

-- ============================================================================
-- ATTRIBUTION RESULTS POLICIES
-- ============================================================================

-- Enable RLS on attribution_results table
ALTER TABLE attribution_results ENABLE ROW LEVEL SECURITY;

-- Policy: Artists can view attribution results for their tracks
CREATE POLICY "Artists can view attribution results for own tracks" ON attribution_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tracks 
      WHERE tracks.id = attribution_results.matched_track_id 
      AND tracks.artist_id = auth.uid()
    )
  );

-- Policy: System can insert attribution results (service role)
CREATE POLICY "System can insert attribution results" ON attribution_results
  FOR INSERT WITH CHECK (true);

-- Policy: System can update attribution results (service role)
CREATE POLICY "System can update attribution results" ON attribution_results
  FOR UPDATE WITH CHECK (true);

-- ============================================================================
-- ROYALTY EVENTS POLICIES
-- ============================================================================

-- Enable RLS on royalty_events table
ALTER TABLE royalty_events ENABLE ROW LEVEL SECURITY;

-- Policy: Artists can view royalty events for their tracks
CREATE POLICY "Artists can view royalty events for own tracks" ON royalty_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tracks 
      WHERE tracks.id = royalty_events.track_id 
      AND tracks.artist_id = auth.uid()
    )
  );

-- Policy: System can insert royalty events (service role)
CREATE POLICY "System can insert royalty events" ON royalty_events
  FOR INSERT WITH CHECK (true);

-- Policy: System can update royalty events (service role)
CREATE POLICY "System can update royalty events" ON royalty_events
  FOR UPDATE WITH CHECK (true);

-- ============================================================================
-- CONSENT AUDIT POLICIES
-- ============================================================================

-- Create consent_audit table for tracking consent changes
CREATE TABLE IF NOT EXISTS consent_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('consent_given', 'consent_revoked', 'consent_modified')),
  previous_consent BOOLEAN,
  new_consent BOOLEAN,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on consent_audit table
ALTER TABLE consent_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Artists can view consent audit for their tracks
CREATE POLICY "Artists can view consent audit for own tracks" ON consent_audit
  FOR SELECT USING (auth.uid() = artist_id);

-- Policy: System can insert consent audit records (service role)
CREATE POLICY "System can insert consent audit" ON consent_audit
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- USAGE STATISTICS POLICIES
-- ============================================================================

-- Create usage_stats view for dashboard
CREATE OR REPLACE VIEW usage_stats AS
SELECT 
  t.artist_id,
  t.id as track_id,
  t.title,
  t.consent,
  COUNT(gl.id) as generation_count,
  COUNT(ar.id) as attribution_count,
  COALESCE(SUM(re.amount), 0) as total_royalties,
  t.created_at as track_created_at
FROM tracks t
LEFT JOIN generation_logs gl ON t.id = gl.track_id
LEFT JOIN attribution_results ar ON t.id = ar.matched_track_id
LEFT JOIN royalty_events re ON t.id = re.track_id
GROUP BY t.artist_id, t.id, t.title, t.consent, t.created_at;

-- Enable RLS on usage_stats view
ALTER VIEW usage_stats SET (security_invoker = true);

-- ============================================================================
-- CONSENT TRIGGERS
-- ============================================================================

-- Function to log consent changes
CREATE OR REPLACE FUNCTION log_consent_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log consent changes
  IF OLD.consent IS DISTINCT FROM NEW.consent THEN
    INSERT INTO consent_audit (
      track_id,
      artist_id,
      action,
      previous_consent,
      new_consent,
      metadata,
      created_by
    ) VALUES (
      NEW.id,
      NEW.artist_id,
      CASE 
        WHEN OLD.consent IS NULL AND NEW.consent = true THEN 'consent_given'
        WHEN OLD.consent = true AND NEW.consent = false THEN 'consent_revoked'
        ELSE 'consent_modified'
      END,
      OLD.consent,
      NEW.consent,
      jsonb_build_object(
        'timestamp', NOW(),
        'ip_address', current_setting('request.headers', true)::json->>'x-forwarded-for',
        'user_agent', current_setting('request.headers', true)::json->>'user-agent'
      ),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for consent changes
CREATE TRIGGER track_consent_audit
  AFTER UPDATE ON tracks
  FOR EACH ROW
  EXECUTE FUNCTION log_consent_change();

-- ============================================================================
-- GDPR COMPLIANCE FUNCTIONS
-- ============================================================================

-- Function to get artist data for GDPR requests
CREATE OR REPLACE FUNCTION get_artist_data(artist_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Only allow artists to access their own data
  IF auth.uid() != artist_uuid THEN
    RAISE EXCEPTION 'Access denied: You can only access your own data';
  END IF;
  
  SELECT jsonb_build_object(
    'artist_id', artist_uuid,
    'tracks', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'track_id', id,
          'title', title,
          'consent', consent,
          'created_at', created_at
        )
      )
      FROM tracks 
      WHERE artist_id = artist_uuid
    ),
    'generation_logs', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'log_id', id,
          'track_id', track_id,
          'model_id', model_id,
          'created_at', created_at
        )
      )
      FROM ai_use_logs 
      WHERE track_id IN (
        SELECT id FROM tracks WHERE artist_id = artist_uuid
      )
    ),
    'attribution_results', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'result_id', id,
          'track_id', matched_track_id,
          'confidence', confidence,
          'created_at', created_at
        )
      )
      FROM attribution_results 
      WHERE matched_track_id IN (
        SELECT id FROM tracks WHERE artist_id = artist_uuid
      )
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete artist data for GDPR requests
CREATE OR REPLACE FUNCTION delete_artist_data(artist_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Only allow artists to delete their own data
  IF auth.uid() != artist_uuid THEN
    RAISE EXCEPTION 'Access denied: You can only delete your own data';
  END IF;
  
  -- Delete in order to respect foreign key constraints
  DELETE FROM consent_audit WHERE artist_id = artist_uuid;
  DELETE FROM royalty_events WHERE track_id IN (SELECT id FROM tracks WHERE artist_id = artist_uuid);
  DELETE FROM attribution_results WHERE matched_track_id IN (SELECT id FROM tracks WHERE artist_id = artist_uuid);
  DELETE FROM generation_logs WHERE track_id IN (SELECT id FROM tracks WHERE artist_id = artist_uuid);
  DELETE FROM ai_use_logs WHERE track_id IN (SELECT id FROM tracks WHERE artist_id = artist_uuid);
  DELETE FROM tracks WHERE artist_id = artist_uuid;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tracks_artist_id ON tracks(artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_consent ON tracks(consent);
CREATE INDEX IF NOT EXISTS idx_ai_use_logs_track_id ON ai_use_logs(track_id);
CREATE INDEX IF NOT EXISTS idx_generation_logs_track_id ON generation_logs(track_id);
CREATE INDEX IF NOT EXISTS idx_attribution_results_matched_track_id ON attribution_results(matched_track_id);
CREATE INDEX IF NOT EXISTS idx_royalty_events_track_id ON royalty_events(track_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_artist_id ON consent_audit(artist_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_track_id ON consent_audit(track_id);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE consent_audit IS 'Audit trail for consent changes per GDPR requirements';
COMMENT ON VIEW usage_stats IS 'Aggregated usage statistics for artist dashboard';
COMMENT ON FUNCTION get_artist_data IS 'GDPR data access function for artists';
COMMENT ON FUNCTION delete_artist_data IS 'GDPR data deletion function for artists';
COMMENT ON FUNCTION log_consent_change IS 'Trigger function to log consent changes for audit';
