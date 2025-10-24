-- Partners table for API key management
-- Per PRD Section 5.2: Partner Platform - authentication and access control

CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  api_key_hash TEXT NOT NULL UNIQUE,
  api_key_prefix TEXT NOT NULL, -- First 8 chars for identification
  is_active BOOLEAN DEFAULT TRUE,
  rate_limit_per_minute INTEGER DEFAULT 60,
  allowed_ips TEXT[], -- IP allowlist for additional security
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

-- Partner usage logs for monitoring and rate limiting
CREATE TABLE IF NOT EXISTS partner_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partner API key rotation tracking
CREATE TABLE IF NOT EXISTS partner_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  rotated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_partners_api_key_hash ON partners(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_partners_api_key_prefix ON partners(api_key_prefix);
CREATE INDEX IF NOT EXISTS idx_partners_is_active ON partners(is_active);
CREATE INDEX IF NOT EXISTS idx_partner_usage_logs_partner_id ON partner_usage_logs(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_usage_logs_created_at ON partner_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_partner_api_keys_partner_id ON partner_api_keys(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_api_keys_is_active ON partner_api_keys(is_active);

-- RLS policies for partner data
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_api_keys ENABLE ROW LEVEL SECURITY;

-- Partners can only view their own data
CREATE POLICY "Partners can view their own data" ON partners
  FOR SELECT USING (auth.uid() = created_by);

-- Admin users can manage all partners
CREATE POLICY "Admins can manage all partners" ON partners
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.uid() = id 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Usage logs are read-only for partners
CREATE POLICY "Partners can view their usage logs" ON partner_usage_logs
  FOR SELECT USING (
    partner_id IN (
      SELECT id FROM partners WHERE created_by = auth.uid()
    )
  );

-- API keys are read-only for partners
CREATE POLICY "Partners can view their API keys" ON partner_api_keys
  FOR SELECT USING (
    partner_id IN (
      SELECT id FROM partners WHERE created_by = auth.uid()
    )
  );

-- Functions for API key management
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
BEGIN
  RETURN 'ak_' || encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION hash_api_key(api_key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(api_key, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to validate API key and get partner info
CREATE OR REPLACE FUNCTION validate_partner_api_key(api_key TEXT)
RETURNS TABLE(
  partner_id UUID,
  partner_name TEXT,
  rate_limit INTEGER,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.rate_limit_per_minute,
    p.is_active
  FROM partners p
  WHERE p.api_key_hash = hash_api_key(api_key)
    AND p.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to log partner usage
CREATE OR REPLACE FUNCTION log_partner_usage(
  p_partner_id UUID,
  p_endpoint TEXT,
  p_method TEXT,
  p_status_code INTEGER,
  p_response_time_ms INTEGER,
  p_ip_address INET,
  p_user_agent TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO partner_usage_logs (
    partner_id,
    endpoint,
    method,
    status_code,
    response_time_ms,
    ip_address,
    user_agent
  ) VALUES (
    p_partner_id,
    p_endpoint,
    p_method,
    p_status_code,
    p_response_time_ms,
    p_ip_address,
    p_user_agent
  );
  
  -- Update last_used_at for the partner
  UPDATE partners 
  SET last_used_at = NOW() 
  WHERE id = p_partner_id;
END;
$$ LANGUAGE plpgsql;
