-- Payouts System Tables
-- Per PRD Section 5.4: Royalty Event Engine - DEMO_MODE implementation
-- Enables end-to-end payout flow without blockchain integration

-- Main payouts table
CREATE TABLE IF NOT EXISTS payouts (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Artist reference
    artist_id UUID NOT NULL,
    
    -- Payout details
    amount_cents INTEGER NOT NULL,              -- Total amount in cents (USD)
    tx_hash TEXT,                               -- Transaction hash (demo: "demo_<uuid>")
    demo BOOLEAN DEFAULT TRUE,                  -- Flag for demo mode vs real blockchain
    
    -- Status tracking
    status VARCHAR DEFAULT 'pending',           -- pending, completed, failed
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB,                             -- Additional payout data
    
    -- Audit trail
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Payout items table (individual royalty events in a payout)
CREATE TABLE IF NOT EXISTS payout_items (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES royalty_events(id) ON DELETE CASCADE,
    
    -- Item details
    amount_cents INTEGER NOT NULL,              -- Amount for this specific event
    
    -- Audit trail
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure unique event per payout (idempotency)
    UNIQUE(payout_id, event_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_payouts_artist_id ON payouts(artist_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at);
CREATE INDEX IF NOT EXISTS idx_payout_items_payout_id ON payout_items(payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_items_event_id ON payout_items(event_id);

-- Comments
COMMENT ON TABLE payouts IS 'Payout records for artists - DEMO_MODE implementation';
COMMENT ON TABLE payout_items IS 'Individual royalty events included in payouts';
COMMENT ON COLUMN payouts.amount_cents IS 'Total payout amount in cents (USD)';
COMMENT ON COLUMN payouts.tx_hash IS 'Transaction hash (demo: "demo_<uuid>", real: blockchain tx)';
COMMENT ON COLUMN payouts.demo IS 'Flag indicating demo mode vs real blockchain payout';
COMMENT ON COLUMN payout_items.amount_cents IS 'Amount for this specific royalty event in cents';

-- Row Level Security (RLS) Policies
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_items ENABLE ROW LEVEL SECURITY;

-- Artists can only read their own payouts
CREATE POLICY "Artists can view own payouts" ON payouts
    FOR SELECT USING (auth.uid() = artist_id);

-- Artists can only read payout items for their own payouts
CREATE POLICY "Artists can view own payout items" ON payout_items
    FOR SELECT USING (
        payout_id IN (
            SELECT id FROM payouts WHERE artist_id = auth.uid()
        )
    );

-- Only service role can insert payouts (via server API)
CREATE POLICY "Service role can insert payouts" ON payouts
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Only service role can insert payout items
CREATE POLICY "Service role can insert payout items" ON payout_items
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Only service role can update payouts
CREATE POLICY "Service role can update payouts" ON payouts
    FOR UPDATE USING (auth.role() = 'service_role');

-- Add unique constraint to prevent duplicate payouts for same events
-- This will be enforced at the application level as well
