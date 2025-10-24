-- Royalty Events Table (Enhanced)
-- Stores verified royalty events when dual proof is confirmed
-- Per PRD Section 5.4: Royalty Event Engine

CREATE TABLE IF NOT EXISTS royalty_events (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Track reference
    track_id VARCHAR NOT NULL,
    
    -- Dual proof references (PRD Section 5.4: SDK log + auditor detection)
    result_id UUID,                          -- Reference to results.id (auditor detection)
    ai_use_log_id UUID,                      -- Reference to ai_use_logs.id (SDK log)
    
    -- Event details
    event_type VARCHAR NOT NULL DEFAULT 'dual_proof_verified',  -- Event type
    
    -- Match quality
    similarity FLOAT NOT NULL,               -- Similarity score from vector match
    match_confidence FLOAT,                  -- Combined confidence score
    
    -- Payout calculation (PRD Section 5.4)
    payout_weight FLOAT NOT NULL,            -- Weight for payout calculation
    amount FLOAT NOT NULL,                   -- Calculated payout amount (USD)
    
    -- Status tracking
    status VARCHAR DEFAULT 'pending',        -- pending, approved, paid, disputed
    
    -- Verification
    verified_at TIMESTAMP DEFAULT NOW(),     -- When dual proof was verified
    approved_at TIMESTAMP,                   -- When event was approved for payment
    paid_at TIMESTAMP,                       -- When payment was processed
    
    -- Metadata
    metadata JSONB,                          -- Additional event data
    
    -- Audit trail
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_royalty_events_track_id ON royalty_events(track_id);
CREATE INDEX IF NOT EXISTS idx_royalty_events_result_id ON royalty_events(result_id);
CREATE INDEX IF NOT EXISTS idx_royalty_events_ai_use_log_id ON royalty_events(ai_use_log_id);
CREATE INDEX IF NOT EXISTS idx_royalty_events_status ON royalty_events(status);
CREATE INDEX IF NOT EXISTS idx_royalty_events_verified_at ON royalty_events(verified_at);
CREATE INDEX IF NOT EXISTS idx_royalty_events_created_at ON royalty_events(created_at);

-- Comments
COMMENT ON TABLE royalty_events IS 'Verified royalty events with dual proof (SDK log + auditor detection)';
COMMENT ON COLUMN royalty_events.result_id IS 'Reference to results.id (auditor detection proof)';
COMMENT ON COLUMN royalty_events.ai_use_log_id IS 'Reference to ai_use_logs.id (SDK log proof)';
COMMENT ON COLUMN royalty_events.match_confidence IS 'Combined confidence from SDK and auditor';
COMMENT ON COLUMN royalty_events.payout_weight IS 'Weight based on similarity, duration, model type';
COMMENT ON COLUMN royalty_events.verified_at IS 'Timestamp when dual proof was verified by auditor';
