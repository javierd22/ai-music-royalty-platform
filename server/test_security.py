"""
Security Tests
Per Threat Model: Test authentication, authorization, replay protection, rate limiting, RLS
"""

import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from utils.security import (
    RateLimiter,
    compute_proof_hash,
    compute_request_signature,
    derive_signing_secret,
    extract_key_prefix,
    generate_api_key,
    sanitize_for_logging,
    verify_api_key,
    verify_request_signature,
)


class TestAPIKeyGeneration:
    """Test API key generation and verification"""

    def test_generate_api_key_format(self):
        """Generated keys should have correct format"""
        full_key, prefix, key_hash = generate_api_key()

        # Check format
        assert full_key.startswith("pk_live_")
        assert "." in full_key
        assert prefix.startswith("pk_live_")

        # Check parts
        parts = full_key.split(".")
        assert len(parts) == 2
        assert parts[0] == prefix

    def test_generated_keys_are_unique(self):
        """Each generated key should be unique"""
        key1, _, _ = generate_api_key()
        key2, _, _ = generate_api_key()

        assert key1 != key2

    def test_verify_valid_key(self):
        """Valid key should verify successfully"""
        full_key, prefix, key_hash = generate_api_key()

        assert verify_api_key(full_key, key_hash) is True

    def test_verify_invalid_key(self):
        """Invalid key should fail verification"""
        _, _, key_hash = generate_api_key()
        wrong_key = "pk_live_wrong.wrongsecret"

        assert verify_api_key(wrong_key, key_hash) is False

    def test_verify_tampered_key(self):
        """Tampered key should fail verification"""
        full_key, _, key_hash = generate_api_key()
        tampered_key = full_key[:-5] + "XXXXX"

        assert verify_api_key(tampered_key, key_hash) is False

    def test_extract_key_prefix(self):
        """Should extract prefix from full key"""
        full_key, expected_prefix, _ = generate_api_key()

        prefix = extract_key_prefix(full_key)

        assert prefix == expected_prefix

    def test_extract_prefix_invalid_format(self):
        """Invalid key format should return None"""
        assert extract_key_prefix("invalid_key") is None
        assert extract_key_prefix("pk_live_nodot") is None
        assert extract_key_prefix("wrong_prefix.secret") is None


class TestRequestSigning:
    """Test HMAC request signing and verification"""

    def test_compute_signature(self):
        """Signature should be deterministic"""
        method = "POST"
        path = "/sdk/log_use"
        body = json.dumps({"test": "data"}).encode("utf-8")
        timestamp = "2025-10-17T12:00:00Z"
        secret = "test_secret"

        sig1 = compute_request_signature(method, path, body, timestamp, secret)
        sig2 = compute_request_signature(method, path, body, timestamp, secret)

        assert sig1 == sig2
        assert len(sig1) == 64  # SHA256 hex is 64 chars

    def test_signature_changes_with_body(self):
        """Different body should produce different signature"""
        method = "POST"
        path = "/sdk/log_use"
        timestamp = "2025-10-17T12:00:00Z"
        secret = "test_secret"

        body1 = json.dumps({"test": "data1"}).encode("utf-8")
        body2 = json.dumps({"test": "data2"}).encode("utf-8")

        sig1 = compute_request_signature(method, path, body1, timestamp, secret)
        sig2 = compute_request_signature(method, path, body2, timestamp, secret)

        assert sig1 != sig2

    def test_signature_changes_with_timestamp(self):
        """Different timestamp should produce different signature"""
        method = "POST"
        path = "/sdk/log_use"
        body = json.dumps({"test": "data"}).encode("utf-8")
        secret = "test_secret"

        sig1 = compute_request_signature(method, path, body, "2025-10-17T12:00:00Z", secret)
        sig2 = compute_request_signature(method, path, body, "2025-10-17T13:00:00Z", secret)

        assert sig1 != sig2

    def test_verify_valid_signature(self):
        """Valid signature should verify"""
        method = "POST"
        path = "/sdk/log_use"
        body = json.dumps({"test": "data"}).encode("utf-8")
        timestamp = datetime.utcnow().isoformat() + "Z"
        secret = "test_secret"

        signature = compute_request_signature(method, path, body, timestamp, secret)

        assert verify_request_signature(
            method, path, body, timestamp, signature, secret
        ) is True

    def test_verify_tampered_signature(self):
        """Tampered signature should fail"""
        method = "POST"
        path = "/sdk/log_use"
        body = json.dumps({"test": "data"}).encode("utf-8")
        timestamp = datetime.utcnow().isoformat() + "Z"
        secret = "test_secret"

        signature = compute_request_signature(method, path, body, timestamp, secret)
        tampered_signature = signature[:-5] + "XXXXX"

        assert verify_request_signature(
            method, path, body, timestamp, tampered_signature, secret
        ) is False

    def test_verify_old_timestamp(self):
        """Old timestamp should fail (replay protection)"""
        method = "POST"
        path = "/sdk/log_use"
        body = json.dumps({"test": "data"}).encode("utf-8")
        old_time = (datetime.utcnow() - timedelta(minutes=10)).isoformat() + "Z"
        secret = "test_secret"

        signature = compute_request_signature(method, path, body, old_time, secret)

        # Should fail because timestamp is > 5 minutes old
        assert verify_request_signature(
            method, path, body, old_time, signature, secret
        ) is False

    def test_verify_future_timestamp(self):
        """Future timestamp should fail"""
        method = "POST"
        path = "/sdk/log_use"
        body = json.dumps({"test": "data"}).encode("utf-8")
        future_time = (datetime.utcnow() + timedelta(minutes=10)).isoformat() + "Z"
        secret = "test_secret"

        signature = compute_request_signature(method, path, body, future_time, secret)

        # Should fail because timestamp is in future
        assert verify_request_signature(
            method, path, body, future_time, signature, secret
        ) is False

    def test_derive_signing_secret(self):
        """Signing secret derivation should be deterministic"""
        api_key_secret = "test_secret"
        partner_id = "123e4567-e89b-12d3-a456-426614174000"

        secret1 = derive_signing_secret(api_key_secret, partner_id)
        secret2 = derive_signing_secret(api_key_secret, partner_id)

        assert secret1 == secret2
        assert len(secret1) == 64  # SHA256 hex

    def test_different_partners_different_secrets(self):
        """Different partners should get different signing secrets"""
        api_key_secret = "test_secret"
        partner_id_1 = "123e4567-e89b-12d3-a456-426614174001"
        partner_id_2 = "123e4567-e89b-12d3-a456-426614174002"

        secret1 = derive_signing_secret(api_key_secret, partner_id_1)
        secret2 = derive_signing_secret(api_key_secret, partner_id_2)

        assert secret1 != secret2


class TestRateLimiter:
    """Test rate limiting"""

    def test_rate_limiter_allows_within_limit(self):
        """Requests within limit should be allowed"""
        limiter = RateLimiter(max_tokens=10, refill_rate=1.0)
        partner_id = str(uuid4())

        # First 10 requests should succeed
        for _ in range(10):
            allowed, info = limiter.check_rate_limit(partner_id)
            assert allowed is True

    def test_rate_limiter_blocks_over_limit(self):
        """Requests over limit should be blocked"""
        limiter = RateLimiter(max_tokens=5, refill_rate=1.0)
        partner_id = str(uuid4())

        # Use up all tokens
        for _ in range(5):
            limiter.check_rate_limit(partner_id)

        # Next request should be blocked
        allowed, info = limiter.check_rate_limit(partner_id)
        assert allowed is False
        assert info["retry_after"] > 0

    def test_rate_limiter_refills_over_time(self):
        """Tokens should refill over time"""
        import time

        limiter = RateLimiter(max_tokens=2, refill_rate=10.0)  # Fast refill for test
        partner_id = str(uuid4())

        # Use up all tokens
        limiter.check_rate_limit(partner_id)
        limiter.check_rate_limit(partner_id)

        # Should be blocked
        allowed, _ = limiter.check_rate_limit(partner_id)
        assert allowed is False

        # Wait for refill (0.1 seconds = 1 token at rate 10/sec)
        time.sleep(0.15)

        # Should be allowed again
        allowed, _ = limiter.check_rate_limit(partner_id)
        assert allowed is True

    def test_rate_limiter_per_partner(self):
        """Rate limits should be per partner"""
        limiter = RateLimiter(max_tokens=2, refill_rate=1.0)
        partner_1 = str(uuid4())
        partner_2 = str(uuid4())

        # Partner 1 uses all tokens
        limiter.check_rate_limit(partner_1)
        limiter.check_rate_limit(partner_1)
        allowed, _ = limiter.check_rate_limit(partner_1)
        assert allowed is False

        # Partner 2 should still have tokens
        allowed, _ = limiter.check_rate_limit(partner_2)
        assert allowed is True


class TestProofHash:
    """Test dual proof audit hashing"""

    def test_compute_proof_hash(self):
        """Proof hash should be deterministic"""
        sdk_log_id = "123e4567-e89b-12d3-a456-426614174000"
        result_id = "223e4567-e89b-12d3-a456-426614174000"
        verified_at = datetime(2025, 10, 17, 12, 0, 0, tzinfo=timezone.utc)

        hash1 = compute_proof_hash(sdk_log_id, result_id, verified_at)
        hash2 = compute_proof_hash(sdk_log_id, result_id, verified_at)

        assert hash1 == hash2
        assert len(hash1) == 64  # SHA256 hex

    def test_proof_hash_changes_with_input(self):
        """Different inputs should produce different hashes"""
        verified_at = datetime(2025, 10, 17, 12, 0, 0, tzinfo=timezone.utc)

        hash1 = compute_proof_hash(
            "123e4567-e89b-12d3-a456-426614174001",
            "223e4567-e89b-12d3-a456-426614174000",
            verified_at,
        )
        hash2 = compute_proof_hash(
            "123e4567-e89b-12d3-a456-426614174002",
            "223e4567-e89b-12d3-a456-426614174000",
            verified_at,
        )

        assert hash1 != hash2


class TestSanitizeLogging:
    """Test log sanitization"""

    def test_sanitize_removes_sensitive_fields(self):
        """Sensitive fields should be redacted"""
        data = {
            "api_key": "pk_live_abc123.secret_xyz",
            "password": "super_secret",
            "model_id": "suno-v3",
        }

        sanitized = sanitize_for_logging(data)

        assert sanitized["api_key"] == "[REDACTED]"
        assert sanitized["password"] == "[REDACTED]"
        assert sanitized["model_id"] == "suno-v3"

    def test_sanitize_truncates_long_strings(self):
        """Long strings should be truncated"""
        long_string = "x" * 200
        data = {"prompt": long_string, "model_id": "test"}

        sanitized = sanitize_for_logging(data, max_length=100)

        assert len(sanitized["prompt"]) == 103  # 100 + "..."
        assert sanitized["prompt"].endswith("...")
        assert sanitized["model_id"] == "test"


class TestReplayProtection:
    """Test replay attack prevention"""

    def test_timestamp_window_validation(self):
        """Only recent timestamps should be accepted"""
        # Current time (should pass)
        now = datetime.utcnow().isoformat() + "Z"
        method, path, body, secret = "POST", "/test", b"", "secret"

        sig_now = compute_request_signature(method, path, body, now, secret)
        assert verify_request_signature(method, path, body, now, sig_now, secret) is True

        # Old time (should fail)
        old_time = (datetime.utcnow() - timedelta(minutes=10)).isoformat() + "Z"
        sig_old = compute_request_signature(method, path, body, old_time, secret)
        assert verify_request_signature(method, path, body, old_time, sig_old, secret) is False


class TestInputValidation:
    """Test input validation security"""

    def test_model_id_validation(self):
        """Model ID should only allow safe characters"""
        from pydantic import ValidationError
        from routes.sdk import LogUseRequest

        # Valid model IDs
        valid_models = ["suno-v3", "udio_v1.5", "stable-audio.1"]
        for model in valid_models:
            request = LogUseRequest(
                model_id=model,
                track_id=uuid4(),
                prompt="test",
                confidence=0.9,
            )
            assert request.model_id == model

        # Invalid model IDs
        invalid_models = ["<script>alert(1)</script>", "'; DROP TABLE--", "model\nid"]
        for model in invalid_models:
            with pytest.raises(ValidationError):
                LogUseRequest(
                    model_id=model,
                    track_id=uuid4(),
                    prompt="test",
                    confidence=0.9,
                )

    def test_prompt_sanitization(self):
        """Prompt should have control characters removed"""
        from routes.sdk import LogUseRequest

        # Control characters should be removed
        request = LogUseRequest(
            model_id="test",
            track_id=uuid4(),
            prompt="test\x00\x01\x02\x1fprompt",
            confidence=0.9,
        )
        assert "\x00" not in request.prompt
        assert "\x01" not in request.prompt

    def test_prompt_length_limit(self):
        """Prompt should be limited to 1000 chars"""
        from pydantic import ValidationError
        from routes.sdk import LogUseRequest

        # 1000 chars should pass
        request = LogUseRequest(
            model_id="test",
            track_id=uuid4(),
            prompt="x" * 1000,
            confidence=0.9,
        )
        assert len(request.prompt) == 1000

        # 1001 chars should fail
        with pytest.raises(ValidationError):
            LogUseRequest(
                model_id="test",
                track_id=uuid4(),
                prompt="x" * 1001,
                confidence=0.9,
            )

    def test_confidence_range_validation(self):
        """Confidence should be between 0 and 1"""
        from pydantic import ValidationError
        from routes.sdk import LogUseRequest

        # Valid confidence values
        for conf in [0.0, 0.5, 1.0]:
            request = LogUseRequest(
                model_id="test",
                track_id=uuid4(),
                confidence=conf,
            )
            assert request.confidence == conf

        # Invalid confidence values
        for conf in [-0.1, 1.1, 999]:
            with pytest.raises(ValidationError):
                LogUseRequest(
                    model_id="test",
                    track_id=uuid4(),
                    confidence=conf,
                )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

