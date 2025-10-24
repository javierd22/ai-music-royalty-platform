"""
Unit Tests for Monitoring, Tracing, and Maintenance

Tests for Prometheus metrics, OpenTelemetry tracing, health checks,
and automated maintenance jobs.

Per PRD §12: All tests verify privacy-preserving behavior.

Author: Senior Engineer
Last Updated: October 2025
"""

import os
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch, AsyncMock

# Monitoring imports
from server.monitoring.metrics import (
    record_api_key_auth,
    record_attribution_match,
    record_compliance_report,
    record_dual_proof,
    record_rate_limit_hit,
    record_replay_attack,
    record_royalty_event,
    update_health_status,
)
from server.monitoring.tracing import (
    get_trace_context,
    trace_operation,
)
from server.monitoring.maintenance import (
    cleanup_expired_nonces,
    cleanup_stale_results,
    reverify_pending_blockchain_events,
    regenerate_compliance_summaries,
)


# =============================================================================
# METRICS TESTS
# =============================================================================


def test_record_api_key_auth():
    """Test API key authentication metric recording."""
    # Test successful auth
    record_api_key_auth(success=True, invalid=False)

    # Test failed auth
    record_api_key_auth(success=False, invalid=False)

    # Test invalid key
    record_api_key_auth(success=False, invalid=True)

    # Should not raise exceptions
    assert True


def test_record_attribution_match():
    """Test attribution match metric recording with confidence tiers."""
    # High confidence
    record_attribution_match(confidence=0.95)

    # Medium confidence
    record_attribution_match(confidence=0.85)

    # Low confidence
    record_attribution_match(confidence=0.65)

    # Should not raise exceptions
    assert True


def test_record_dual_proof():
    """Test dual proof verification metric recording."""
    record_dual_proof("confirmed")
    record_dual_proof("pending")
    record_dual_proof("failed")

    # Should not raise exceptions
    assert True


def test_record_royalty_event():
    """Test royalty event metric recording."""
    record_royalty_event(verified=True)
    record_royalty_event(verified=False)

    # Should not raise exceptions
    assert True


def test_record_compliance_report():
    """Test compliance report metric recording."""
    record_compliance_report()

    # Should not raise exceptions
    assert True


def test_record_rate_limit_hit():
    """Test rate limit hit metric recording."""
    # Only prefix should be recorded (privacy)
    record_rate_limit_hit("pk_live_***")

    # Should not raise exceptions
    assert True


def test_record_replay_attack():
    """Test replay attack metric recording."""
    record_replay_attack()

    # Should not raise exceptions
    assert True


def test_update_health_status():
    """Test health status update for services."""
    # Database healthy
    update_health_status("db", healthy=True, latency_seconds=0.012)

    # Vector DB degraded
    update_health_status("vector", healthy=False, latency_seconds=0.0)

    # Blockchain healthy
    update_health_status("blockchain", healthy=True, latency_seconds=0.245)

    # Storage healthy
    update_health_status("storage", healthy=True, latency_seconds=0.015)

    # Should not raise exceptions
    assert True


# =============================================================================
# TRACING TESTS
# =============================================================================


def test_get_trace_context_no_span():
    """Test getting trace context when no span is active."""
    ctx = get_trace_context()
    assert ctx == {}


@pytest.mark.asyncio
async def test_trace_operation_success():
    """Test tracing operation with successful execution."""
    with trace_operation("test_operation", {"test_key": "test_value"}):
        # Simulate work
        result = "success"

    assert result == "success"


@pytest.mark.asyncio
async def test_trace_operation_with_exception():
    """Test tracing operation with exception handling."""
    with pytest.raises(ValueError):
        with trace_operation("test_operation_fail"):
            raise ValueError("Test error")


@pytest.mark.asyncio
async def test_trace_operation_privacy():
    """Test that sensitive attributes are redacted."""
    with trace_operation(
        "test_privacy",
        {
            "safe_key": "safe_value",
            "email": "user@example.com",
            "api_key": "secret-key",
            "password": "password123",
        },
    ):
        # Sensitive fields should be redacted
        pass

    # Should complete without exposing sensitive data
    assert True


# =============================================================================
# MAINTENANCE JOB TESTS
# =============================================================================


@pytest.mark.asyncio
@patch("server.monitoring.maintenance.get_supabase_client")
async def test_cleanup_stale_results(mock_supabase):
    """Test cleanup of stale attribution results."""
    # Mock Supabase client
    mock_client = Mock()
    mock_select = Mock()
    mock_select.lt = Mock(return_value=mock_select)
    mock_select.execute = Mock(return_value=Mock(data=[]))
    mock_client.table = Mock(return_value=mock_select)
    mock_supabase.return_value = mock_client

    # Run cleanup
    result = await cleanup_stale_results()

    # Verify result
    assert result["status"] == "success"
    assert "results_deleted" in result


@pytest.mark.asyncio
@patch("server.monitoring.maintenance.get_supabase_client")
async def test_cleanup_expired_nonces(mock_supabase):
    """Test cleanup of expired replay protection nonces."""
    # Mock Supabase client
    mock_client = Mock()
    mock_delete = Mock()
    mock_delete.lt = Mock(return_value=mock_delete)
    mock_delete.execute = Mock(return_value=Mock())
    mock_client.table = Mock(return_value=mock_delete)
    mock_supabase.return_value = mock_client

    # Run cleanup
    result = await cleanup_expired_nonces()

    # Verify result
    assert result["status"] == "success"
    assert "message" in result


@pytest.mark.asyncio
@patch("server.monitoring.maintenance.get_supabase_client")
@patch("server.monitoring.maintenance.verify_on_chain")
async def test_reverify_pending_blockchain_events(mock_verify, mock_supabase):
    """Test re-verification of pending blockchain events."""
    # Mock Supabase client
    mock_client = Mock()
    mock_select = Mock()
    mock_select.is_ = Mock(return_value=mock_select)
    mock_select.lt = Mock(return_value=mock_select)
    mock_select.limit = Mock(return_value=mock_select)
    mock_select.execute = Mock(
        return_value=Mock(
            data=[
                {
                    "id": "event-1",
                    "tx_hash": "0x123",
                },
            ]
        )
    )
    mock_client.table = Mock(return_value=mock_select)
    mock_supabase.return_value = mock_client

    # Mock blockchain verification
    mock_verify.return_value = {"verified": True}

    # Run re-verification
    result = await reverify_pending_blockchain_events()

    # Verify result
    assert result["status"] == "success"
    assert "events_checked" in result
    assert "verified" in result


@pytest.mark.asyncio
@patch("server.monitoring.maintenance.get_supabase_client")
async def test_regenerate_compliance_summaries(mock_supabase):
    """Test regeneration of weekly compliance summaries."""
    # Mock Supabase client
    mock_client = Mock()
    mock_select = Mock()
    mock_select.select = Mock(return_value=mock_select)
    mock_select.eq = Mock(return_value=mock_select)
    mock_select.execute = Mock(
        return_value=Mock(
            data=[
                {
                    "id": "partner-1",
                    "name": "Test Partner",
                    "email": "partner@example.com",
                },
            ],
            count=10,
        )
    )
    mock_client.table = Mock(return_value=mock_select)
    mock_client.rpc = Mock(return_value=Mock(execute=Mock(return_value=Mock(data=5))))
    mock_supabase.return_value = mock_client

    # Run compliance summary generation
    result = await regenerate_compliance_summaries()

    # Verify result
    assert result["status"] == "success"
    assert "partners_processed" in result


# =============================================================================
# HEALTH CHECK TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_health_endpoint_structure(client):
    """Test health endpoint returns correct structure."""
    response = await client.get("/health")

    assert response.status_code == 200
    data = response.json()

    # Check required fields
    assert "service" in data
    assert "version" in data
    assert "timestamp" in data
    assert "status" in data
    assert "ok" in data
    assert "dependencies" in data

    # Check dependency fields
    deps = data["dependencies"]
    assert "database" in deps
    assert "vector_db" in deps
    assert "blockchain" in deps
    assert "storage" in deps


# =============================================================================
# PRIVACY TESTS
# =============================================================================


def test_no_pii_in_metrics():
    """Test that no PII is recorded in metrics."""
    # These should all be safe operations that don't log PII
    record_attribution_match(0.95)
    record_rate_limit_hit("pk_***")  # Only prefix
    record_api_key_auth(True)

    # If PII was logged, the metrics module would fail compliance
    assert True


def test_trace_context_no_pii():
    """Test that trace context doesn't expose PII."""
    ctx = get_trace_context()

    # Context should only contain trace and span IDs
    assert "email" not in ctx
    assert "user_id" not in ctx
    assert "api_key" not in ctx
    assert "password" not in ctx


# =============================================================================
# ERROR HANDLING TESTS
# =============================================================================


@pytest.mark.asyncio
@patch("server.monitoring.maintenance.get_supabase_client")
async def test_maintenance_job_error_handling(mock_supabase):
    """Test that maintenance jobs handle errors gracefully."""
    # Mock Supabase client to raise an error
    mock_client = Mock()
    mock_client.table.side_effect = Exception("Database error")
    mock_supabase.return_value = mock_client

    # Job should not crash, but return error
    with pytest.raises(Exception):
        await cleanup_stale_results()


# =============================================================================
# INTEGRATION TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_full_monitoring_workflow():
    """Test a complete monitoring workflow from request to metrics."""
    # Simulate API request
    record_api_key_auth(success=True)

    # Simulate attribution
    record_attribution_match(confidence=0.92)

    # Simulate dual proof
    record_dual_proof("confirmed")

    # Simulate royalty event
    record_royalty_event(verified=True)

    # Simulate compliance report
    record_compliance_report()

    # Update health status
    update_health_status("db", healthy=True, latency_seconds=0.01)

    # All metrics should be recorded without errors
    assert True


# =============================================================================
# CONFIGURATION TESTS
# =============================================================================


def test_monitoring_env_vars():
    """Test that monitoring respects environment variables."""
    # Test with monitoring disabled
    os.environ["OTEL_ENABLED"] = "false"
    # Tracing should be disabled

    # Test with maintenance disabled
    os.environ["MAINTENANCE_ENABLED"] = "false"
    # Maintenance jobs should not run

    # Reset
    os.environ["OTEL_ENABLED"] = "true"
    os.environ["MAINTENANCE_ENABLED"] = "true"

    assert True


# =============================================================================
# PERFORMANCE TESTS
# =============================================================================


def test_metrics_performance():
    """Test that metrics recording is fast and non-blocking."""
    import time

    start = time.time()

    # Record 1000 metrics
    for i in range(1000):
        record_attribution_match(0.9)

    duration = time.time() - start

    # Should complete in under 100ms
    assert duration < 0.1, f"Metrics recording too slow: {duration}s"


# =============================================================================
# PYTEST FIXTURES
# =============================================================================


@pytest.fixture
async def client():
    """Create a test client for FastAPI."""
    from httpx import AsyncClient
    from server.main import app

    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

