"""
Unit tests for dual proof logic
"""

import os
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest

from server.utils.dual_proof import (
    get_dual_proof_status_for_result,
    get_dual_proof_status_for_sdk_log,
    get_dual_proof_status_for_track,
)


@pytest.fixture
def mock_supabase():
    """Mock Supabase client"""
    with patch("server.utils.dual_proof.get_supabase_client") as mock:
        client = MagicMock()
        mock.return_value = client
        yield client


def test_dual_proof_none_below_threshold(mock_supabase):
    """Test that dual proof is None when similarity is below threshold"""
    # Mock result with low similarity
    mock_result = {
        "id": "result-123",
        "track_id": "track-123",
        "similarity": 0.75,  # Below 0.85 threshold
        "created_at": datetime.utcnow().isoformat(),
    }

    mock_supabase.table().select().eq().single().execute.return_value = MagicMock(
        data=mock_result, error=None
    )

    result = get_dual_proof_status_for_result("result-123")

    assert result["status"] == "none"
    assert result["similarity"] == 0.75


def test_dual_proof_pending_with_sdk_log(mock_supabase):
    """Test that dual proof is Pending when SDK log exists within window"""
    now = datetime.utcnow()

    # Mock result above threshold
    mock_result = {
        "id": "result-123",
        "track_id": "track-123",
        "similarity": 0.88,
        "created_at": now.isoformat(),
    }

    # Mock SDK log within window
    mock_sdk_log = {
        "id": "log-123",
        "track_id": "track-123",
        "confidence": 0.92,
        "created_at": (now + timedelta(minutes=5)).isoformat(),
    }

    # Setup mock calls
    mock_supabase.table().select().eq().single().execute.return_value = MagicMock(
        data=mock_result, error=None
    )

    # No royalty event
    mock_supabase.table().select().eq().eq().execute.return_value = MagicMock(
        data=[], error=None
    )

    # SDK log found
    mock_supabase.table().select().eq().gte().lte().execute.return_value = MagicMock(
        data=[mock_sdk_log], error=None
    )

    result = get_dual_proof_status_for_result("result-123")

    assert result["status"] == "pending"
    assert result["sdkLogId"] == "log-123"
    assert result["resultId"] == "result-123"
    assert result["royaltyEventId"] is None


def test_dual_proof_confirmed_with_royalty_event(mock_supabase):
    """Test that dual proof is Confirmed when royalty event exists"""
    now = datetime.utcnow()

    # Mock result
    mock_result = {
        "id": "result-123",
        "track_id": "track-123",
        "similarity": 0.90,
        "created_at": now.isoformat(),
    }

    # Mock royalty event
    mock_event = {
        "id": "event-123",
        "ai_use_log_id": "log-123",
    }

    # Mock SDK log
    mock_sdk_log = {
        "id": "log-123",
        "confidence": 0.89,
    }

    # Setup mock calls
    mock_supabase.table().select().eq().single().execute.side_effect = [
        MagicMock(data=mock_result, error=None),
        MagicMock(data=mock_sdk_log, error=None),
    ]

    # Royalty event found
    mock_supabase.table().select().eq().eq().execute.return_value = MagicMock(
        data=[mock_event], error=None
    )

    result = get_dual_proof_status_for_result("result-123")

    assert result["status"] == "confirmed"
    assert result["sdkLogId"] == "log-123"
    assert result["resultId"] == "result-123"
    assert result["royaltyEventId"] == "event-123"


def test_dual_proof_window_configuration():
    """Test that window configuration is read from environment"""
    with patch.dict(os.environ, {"DUAL_PROOF_WINDOW_MINUTES": "15"}):
        # Re-import to pick up new env var
        import importlib

        from server.utils import dual_proof

        importlib.reload(dual_proof)

        assert dual_proof.DUAL_PROOF_WINDOW_MINUTES == 15


def test_dual_proof_threshold_configuration():
    """Test that threshold configuration is read from environment"""
    with patch.dict(os.environ, {"DUAL_PROOF_THRESHOLD": "0.90"}):
        # Re-import to pick up new env var
        import importlib

        from server.utils import dual_proof

        importlib.reload(dual_proof)

        assert dual_proof.DUAL_PROOF_THRESHOLD == 0.90


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

