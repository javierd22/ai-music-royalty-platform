-- Security Schema: Partners, API Keys, Request Nonces
-- Per Threat Model: Authentication, Authorization, Replay Protection

-- ============================================================================
-- PARTNERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  email TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE partners IS 'AI partner organizations that log track usage via SDK';
COMMENT ON COLUMN partners.name IS 'Partner organization name (e.g., "Suno AI", "Udio")';
COMMENT ON COLUMN partners.metadata IS 'Additional partner info (website, contact, etc.)';

CREATE INDEX IF NOT EXISTS idx_partners_name ON partners(name);
CREATE INDEX IF NOT EXISTS idx_partners_is_active ON partners(is_active);

-- ============================================================================
-- API KEYS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  key_prefix TEXT NOT NULL UNIQUE,
  key_hash TEXT NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['log:write', 'log:read'],
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

COMMENT ON TABLE api_keys IS 'API keys for partner authentication (argon2 hashed)';
COMMENT ON COLUMN api_keys.key_prefix IS 'Visible prefix for key identification (e.g., "pk_live_abc123")';
COMMENT ON COLUMN api_keys.key_hash IS 'Argon2id hash of the secret portion';
COMMENT ON COLUMN api_keys.scopes IS 'Permissions array: log:write, log:read, etc.';
COMMENT ON COLUMN api_keys.last_used_at IS 'Timestamp of most recent API request';

CREATE INDEX IF NOT EXISTS idx_api_keys_partner_id ON api_keys(partner_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- ============================================================================
-- REQUEST NONCES TABLE (Replay Protection)
-- ============================================================================

CREATE TABLE IF NOT EXISTS request_nonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  nonce TEXT NOT NULL,
  request_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partner_id, nonce)
);

COMMENT ON TABLE request_nonces IS 'Stores nonces to prevent replay attacks (cleaned up after 1 hour)';
COMMENT ON COLUMN request_nonces.nonce IS 'Unique nonce from x-nonce header';
COMMENT ON COLUMN request_nonces.request_path IS 'API path for audit trail';

CREATE INDEX IF NOT EXISTS idx_request_nonces_partner_nonce ON request_nonces(partner_id, nonce);
CREATE INDEX IF NOT EXISTS idx_request_nonces_created_at ON request_nonces(created_at);

-- ============================================================================
-- DUAL PROOF AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS dual_proof_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  sdk_log_id UUID NOT NULL REFERENCES ai_use_logs(id) ON DELETE CASCADE,
  result_id UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  royalty_event_id UUID REFERENCES royalty_events(id) ON DELETE SET NULL,
  proof_hash TEXT NOT NULL,
  similarity FLOAT NOT NULL,
  sdk_confidence FLOAT,
  time_delta_seconds INTEGER NOT NULL,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

COMMENT ON TABLE dual_proof_audit IS 'Immutable audit trail of dual proof verifications';
COMMENT ON COLUMN dual_proof_audit.proof_hash IS 'SHA256 hash of (sdk_log_id || result_id || verified_at) for tamper detection';
COMMENT ON COLUMN dual_proof_audit.time_delta_seconds IS 'Time between SDK log and result creation';

CREATE INDEX IF NOT EXISTS idx_dual_proof_audit_partner_id ON dual_proof_audit(partner_id);
CREATE INDEX IF NOT EXISTS idx_dual_proof_audit_sdk_log_id ON dual_proof_audit(sdk_log_id);
CREATE INDEX IF NOT EXISTS idx_dual_proof_audit_result_id ON dual_proof_audit(result_id);
CREATE INDEX IF NOT EXISTS idx_dual_proof_audit_verified_at ON dual_proof_audit(verified_at);

-- ============================================================================
-- UPDATE EXISTING TABLES
-- ============================================================================

-- Add partner_id to ai_use_logs
ALTER TABLE ai_use_logs ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_ai_use_logs_partner_id ON ai_use_logs(partner_id);

-- Add user_id to results and royalty_events for artist scoping
ALTER TABLE results ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE royalty_events ADD COLUMN IF NOT EXISTS user_id UUID;

CREATE INDEX IF NOT EXISTS idx_results_user_id ON results(user_id);
CREATE INDEX IF NOT EXISTS idx_royalty_events_user_id ON royalty_events(user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger for updated_at on partners
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on api_keys
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CLEANUP FUNCTION FOR OLD NONCES
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_nonces()
RETURNS void AS $$
BEGIN
  DELETE FROM request_nonces 
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_nonces() IS 'Delete nonces older than 1 hour (run via cron)';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE dual_proof_audit ENABLE ROW LEVEL SECURITY;

-- Partners: Partners can read their own record
CREATE POLICY "Partners can read own record" ON partners
  FOR SELECT
  USING (id = current_setting('app.current_partner_id', true)::uuid);

-- API Keys: Partners can read their own keys
CREATE POLICY "Partners can read own API keys" ON api_keys
  FOR SELECT
  USING (partner_id = current_setting('app.current_partner_id', true)::uuid);

-- Request Nonces: Partners can insert their own nonces
CREATE POLICY "Partners can insert own nonces" ON request_nonces
  FOR INSERT
  WITH CHECK (partner_id = current_setting('app.current_partner_id', true)::uuid);

-- Dual Proof Audit: Partners can read their own audit logs
CREATE POLICY "Partners can read own audit logs" ON dual_proof_audit
  FOR SELECT
  USING (partner_id = current_setting('app.current_partner_id', true)::uuid);

-- AI Use Logs: Partners can only insert/read their own logs
CREATE POLICY "Partners can insert own logs" ON ai_use_logs
  FOR INSERT
  WITH CHECK (partner_id = current_setting('app.current_partner_id', true)::uuid);

CREATE POLICY "Partners can read own logs" ON ai_use_logs
  FOR SELECT
  USING (partner_id = current_setting('app.current_partner_id', true)::uuid);

-- Results: Artists can read/write their own results
CREATE POLICY "Artists can manage own results" ON results
  FOR ALL
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Royalty Events: Artists can read their own events
-- Partners can read events that reference their SDK logs
CREATE POLICY "Artists can read own royalty events" ON royalty_events
  FOR SELECT
  USING (
    user_id = auth.uid() OR 
    ai_use_log_id IN (
      SELECT id FROM ai_use_logs 
      WHERE partner_id = current_setting('app.current_partner_id', true)::uuid
    )
  );

-- Service role bypass (for server-side operations)
CREATE POLICY "Service role has full access to partners" ON partners
  FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Service role has full access to api_keys" ON api_keys
  FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Service role has full access to request_nonces" ON request_nonces
  FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Service role has full access to dual_proof_audit" ON dual_proof_audit
  FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Service role has full access to ai_use_logs" ON ai_use_logs
  FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- ============================================================================
-- SAMPLE DATA (Development Only)
-- ============================================================================

-- Insert sample partner (commented out for production)
-- INSERT INTO partners (name, email) VALUES ('Demo Partner', 'demo@example.com');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('partners', 'api_keys', 'ai_use_logs');

-- List all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, policyname;

