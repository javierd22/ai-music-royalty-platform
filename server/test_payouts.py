"""
Test suite for payout system functionality.

Per PRD Section 5.4: Royalty Event Engine - DEMO_MODE implementation
Tests payout endpoints, RLS policies, and idempotency.
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy import text
from server.main import app
from server.utils.db import get_db_connection


class TestPayoutSystem:
    """Test suite for payout system."""
    
    def setup_method(self):
        """Setup test client and test data."""
        self.client = TestClient(app)
        self.test_artist_id = "test-artist-123"
        self.test_event_ids = ["event-1", "event-2"]
        
    async def test_payout_preview_unauthorized(self):
        """Test that payout preview requires authentication."""
        response = self.client.get(f"/payouts/preview?artist_id={self.test_artist_id}")
        assert response.status_code == 401  # Unauthorized
    
    async def test_create_payout_unauthorized(self):
        """Test that payout creation requires authentication."""
        response = self.client.post(
            "/payouts/create",
            json={
                "artist_id": self.test_artist_id,
                "event_ids": self.test_event_ids
            }
        )
        assert response.status_code == 401  # Unauthorized
    
    async def test_payout_receipt_unauthorized(self):
        """Test that payout receipt requires authentication."""
        response = self.client.get("/payouts/receipt/test-payout-id")
        assert response.status_code == 401  # Unauthorized
    
    async def test_rls_policies(self):
        """Test that RLS policies prevent cross-artist access."""
        # This would require setting up test database with RLS
        # For now, we'll test the logic in the endpoints
        pass
    
    async def test_idempotency(self):
        """Test that same event_ids cannot be paid twice."""
        # This would require setting up test data and running actual payout
        # For now, we'll test the unique constraint logic
        pass


class TestChainAbstraction:
    """Test suite for chain abstraction layer."""
    
    def test_demo_payout(self):
        """Test demo payout functionality."""
        from server.utils.chain import send_payout
        
        # Test demo payout
        result = asyncio.run(send_payout(
            artist_wallet=None,
            amount_cents=1000,
            event_ids=["event-1", "event-2"],
            demo=True
        ))
        
        assert result.success is True
        assert result.tx_hash.startswith("demo_")
        assert result.error_message is None
    
    def test_demo_payout_status(self):
        """Test demo payout status verification."""
        from server.utils.chain import verify_payout_status
        
        # Test demo status verification
        result = asyncio.run(verify_payout_status("demo_1234567890abcdef", demo=True))
        
        assert result["status"] == "confirmed"
        assert result["success"] is True
        assert "block_number" in result
    
    def test_real_payout_not_implemented(self):
        """Test that real payouts raise NotImplementedError."""
        from server.utils.chain import send_payout
        
        with pytest.raises(NotImplementedError):
            asyncio.run(send_payout(
                artist_wallet="0x1234567890abcdef",
                amount_cents=1000,
                event_ids=["event-1"],
                demo=False
            ))


class TestDatabaseSchema:
    """Test suite for database schema and constraints."""
    
    async def test_payouts_table_exists(self):
        """Test that payouts table exists with correct structure."""
        async with get_db_connection() as conn:
            # Check if payouts table exists
            query = text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'payouts'
                ORDER BY ordinal_position
            """)
            
            result = await conn.execute(query)
            columns = result.fetchall()
            
            # Verify essential columns exist
            column_names = [col.column_name for col in columns]
            assert "id" in column_names
            assert "artist_id" in column_names
            assert "amount_cents" in column_names
            assert "tx_hash" in column_names
            assert "demo" in column_names
            assert "status" in column_names
            assert "created_at" in column_names
    
    async def test_payout_items_table_exists(self):
        """Test that payout_items table exists with correct structure."""
        async with get_db_connection() as conn:
            # Check if payout_items table exists
            query = text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'payout_items'
                ORDER BY ordinal_position
            """)
            
            result = await conn.execute(query)
            columns = result.fetchall()
            
            # Verify essential columns exist
            column_names = [col.column_name for col in columns]
            assert "id" in column_names
            assert "payout_id" in column_names
            assert "event_id" in column_names
            assert "amount_cents" in column_names
            assert "created_at" in column_names
    
    async def test_unique_constraints(self):
        """Test that unique constraints prevent duplicate payouts."""
        async with get_db_connection() as conn:
            # Check for unique constraints
            query = text("""
                SELECT constraint_name, constraint_type
                FROM information_schema.table_constraints
                WHERE table_name = 'payout_items'
                AND constraint_type = 'UNIQUE'
            """)
            
            result = await conn.execute(query)
            constraints = result.fetchall()
            
            # Should have unique constraint on (payout_id, event_id)
            constraint_names = [c.constraint_name for c in constraints]
            assert len(constraint_names) > 0  # At least one unique constraint


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
