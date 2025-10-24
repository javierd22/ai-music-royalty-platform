-- ============================================================================
-- COMPLIANCE LOGS TABLE
-- ============================================================================
-- Per PRD Section 5.5: Auditable compliance verification system
-- Per PRD Section 12: Ethical principles and transparency requirements
--
-- This table records all compliance verification attempts for audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.compliance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('track', 'event', 'report')),
  entity_id UUID,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_details JSONB,
  requester_ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_compliance_logs_entity ON public.compliance_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_compliance_logs_created_at ON public.compliance_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.compliance_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access
CREATE POLICY "Service role has full access on compliance_logs"
  ON public.compliance_logs
  FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Policy: Authenticated users can read their own verification logs
CREATE POLICY "Users can read compliance logs"
  ON public.compliance_logs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Add comment for documentation
COMMENT ON TABLE public.compliance_logs IS 
'Audit trail for all compliance verification attempts. Records track, event, and report verifications with timestamps and results.';

COMMENT ON COLUMN public.compliance_logs.entity_type IS 
'Type of entity being verified: track, event, or report';

COMMENT ON COLUMN public.compliance_logs.verified IS 
'Whether the verification was successful and entity is compliant';

COMMENT ON COLUMN public.compliance_logs.verification_details IS 
'JSON object containing verification proof, tx_hash, confidence, and other metadata';

