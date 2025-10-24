"""
Unit tests for the /compare endpoint.

Tests verify PRD compliance for Section 5.3 Attribution Auditor.
"""

import pytest
from fastapi.testclient import TestClient
from server.main import app

client = TestClient(app)


def test_health_check():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["service"] == "attribution-service"


def test_root_endpoint():
    """Test root endpoint returns API information."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert "prd_compliance" in data


def test_compare_missing_file():
    """Test /compare returns error when no file provided."""
    response = client.post("/compare")
    assert response.status_code == 422  # Unprocessable Entity


def test_compare_invalid_file_type():
    """Test /compare rejects non-audio files."""
    files = {"file": ("test.txt", b"not an audio file", "text/plain")}
    response = client.post("/compare", files=files)
    assert response.status_code == 400
    assert "audio" in response.json()["detail"].lower()


def test_compare_empty_file():
    """Test /compare rejects empty files."""
    files = {"file": ("test.mp3", b"", "audio/mpeg")}
    response = client.post("/compare", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


# Note: Full integration tests with real audio files would require
# additional test fixtures and may be run separately
