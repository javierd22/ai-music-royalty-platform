"""
Security utilities for authentication, HMAC verification, and rate limiting
Per Threat Model: T1-T9 mitigations
"""

import hashlib
import hmac
import os
import secrets
import time
from datetime import datetime, timedelta
from typing import Optional, Tuple

import argon2
from fastapi import HTTPException, Request, status

# Argon2 hasher with secure defaults
ph = argon2.PasswordHasher(
    time_cost=2,  # Number of iterations
    memory_cost=65536,  # 64 MB
    parallelism=1,  # Number of parallel threads
    hash_len=32,  # Length of hash
    salt_len=16,  # Length of salt
)

# Configuration
REQUEST_TIMESTAMP_MAX_AGE = 300  # 5 minutes
NONCE_CLEANUP_AGE = 3600  # 1 hour
API_KEY_PREFIX_LENGTH = 12
API_KEY_SECRET_LENGTH = 32


def generate_api_key() -> Tuple[str, str, str]:
    """
    Generate a new API key with prefix, secret, and hash.

    Returns:
        Tuple of (full_key, prefix, hash)
        - full_key: "pk_live_{prefix}.{secret}" - show once to partner
        - prefix: For key identification
        - hash: Argon2 hash to store in database

    Example:
        >>> key, prefix, hash = generate_api_key()
        >>> key
        'pk_live_abc123def456.xyz789uvw012abc345def678ghi901jkl234mno567pqr890'
    """
    # Generate random prefix and secret
    prefix = secrets.token_urlsafe(API_KEY_PREFIX_LENGTH)[:API_KEY_PREFIX_LENGTH]
    secret = secrets.token_urlsafe(API_KEY_SECRET_LENGTH)

    # Full key format: pk_live_{prefix}.{secret}
    full_key = f"pk_live_{prefix}.{secret}"

    # Hash only the secret (prefix is stored plaintext for lookup)
    key_hash = ph.hash(secret)

    return full_key, f"pk_live_{prefix}", key_hash


def verify_api_key(provided_key: str, stored_hash: str) -> bool:
    """
    Verify API key against stored Argon2 hash.

    Args:
        provided_key: Full key from client (pk_live_{prefix}.{secret})
        stored_hash: Argon2 hash from database

    Returns:
        True if valid, False otherwise
    """
    try:
        # Extract secret portion (after the dot)
        if "." not in provided_key:
            return False

        secret = provided_key.split(".")[-1]

        # Verify using Argon2
        ph.verify(stored_hash, secret)
        return True

    except (argon2.exceptions.VerifyMismatchError, argon2.exceptions.InvalidHash):
        return False
    except Exception:
        # Catch-all for unexpected errors (timing attack mitigation)
        return False


def extract_key_prefix(provided_key: str) -> Optional[str]:
    """
    Extract prefix from API key for database lookup.

    Args:
        provided_key: Full key (pk_live_{prefix}.{secret})

    Returns:
        Prefix including pk_live_, or None if invalid format
    """
    try:
        # Split on dot and get prefix part
        parts = provided_key.split(".")
        if len(parts) != 2:
            return None

        prefix_part = parts[0]
        if not prefix_part.startswith("pk_live_"):
            return None

        return prefix_part

    except Exception:
        return None


def compute_request_signature(
    method: str, path: str, body: bytes, timestamp: str, signing_secret: str
) -> str:
    """
    Compute HMAC-SHA256 signature for request verification.

    Per Threat Model T2: Request signing prevents replay and tampering.

    Args:
        method: HTTP method (POST, GET, etc.)
        path: Request path (/sdk/log_use)
        body: Raw request body bytes
        timestamp: ISO timestamp from x-timestamp header
        signing_secret: Per-partner secret derived from API key

    Returns:
        Hex-encoded HMAC signature
    """
    # Construct signing payload
    payload = f"{method}\n{path}\n{timestamp}\n"

    # Append body (even if empty)
    payload_bytes = payload.encode("utf-8") + body

    # Compute HMAC-SHA256
    signature = hmac.new(
        signing_secret.encode("utf-8"), payload_bytes, hashlib.sha256
    ).hexdigest()

    return signature


def verify_request_signature(
    method: str,
    path: str,
    body: bytes,
    timestamp: str,
    provided_signature: str,
    signing_secret: str,
) -> bool:
    """
    Verify HMAC signature matches expected value.

    Per Threat Model T2: Signature verification prevents tampering.

    Args:
        method: HTTP method
        path: Request path
        body: Raw request body
        timestamp: Timestamp from header
        provided_signature: Signature from x-signature header
        signing_secret: Partner's signing secret

    Returns:
        True if signature valid and timestamp fresh
    """
    # Compute expected signature
    expected_signature = compute_request_signature(
        method, path, body, timestamp, signing_secret
    )

    # Constant-time comparison to prevent timing attacks
    signatures_match = hmac.compare_digest(expected_signature, provided_signature)

    if not signatures_match:
        return False

    # Verify timestamp is recent (within 5 minutes)
    try:
        request_time = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        now = datetime.utcnow().replace(tzinfo=request_time.tzinfo)
        age = (now - request_time).total_seconds()

        if abs(age) > REQUEST_TIMESTAMP_MAX_AGE:
            return False

    except (ValueError, AttributeError):
        return False

    return True


def derive_signing_secret(api_key_secret: str, partner_id: str) -> str:
    """
    Derive signing secret from API key secret and partner ID.

    Per Threat Model T3: Separate signing secret from authentication key.

    Args:
        api_key_secret: Secret portion of API key
        partner_id: Partner UUID

    Returns:
        Hex-encoded signing secret
    """
    # Use HKDF-like derivation with SHA256
    material = f"{api_key_secret}:{partner_id}:signing".encode("utf-8")
    secret = hashlib.sha256(material).hexdigest()
    return secret


def compute_proof_hash(sdk_log_id: str, result_id: str, verified_at: datetime) -> str:
    """
    Compute hash of dual proof for audit trail.

    Per Threat Model T6: Proof hash enables tamper detection.

    Args:
        sdk_log_id: SDK log UUID
        result_id: Result UUID
        verified_at: Verification timestamp

    Returns:
        SHA256 hash (hex)
    """
    payload = f"{sdk_log_id}|{result_id}|{verified_at.isoformat()}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class RateLimiter:
    """
    Token bucket rate limiter (in-memory or Redis-backed).

    Per Threat Model T4: Rate limiting prevents DoS.

    Implements token bucket algorithm:
    - Bucket capacity: max_tokens
    - Refill rate: refill_rate tokens per second
    - Each request consumes 1 token
    """

    def __init__(self, max_tokens: int = 60, refill_rate: float = 1.0, use_redis: bool = False):
        """
        Initialize rate limiter.

        Args:
            max_tokens: Maximum tokens in bucket (default: 60)
            refill_rate: Tokens added per second (default: 1.0)
            use_redis: Use Redis for distributed limiting (default: False)
        """
        self.max_tokens = max_tokens
        self.refill_rate = refill_rate
        self.use_redis = use_redis

        if use_redis:
            try:
                import redis

                redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
                self.redis_client = redis.from_url(redis_url, decode_responses=True)
            except ImportError:
                print("Warning: redis-py not installed, falling back to in-memory")
                self.use_redis = False
                self.buckets = {}
        else:
            # In-memory storage: {partner_id: (tokens, last_refill_time)}
            self.buckets = {}

    def _get_bucket_redis(self, partner_id: str) -> Tuple[float, float]:
        """Get bucket state from Redis"""
        key = f"ratelimit:{partner_id}"
        pipe = self.redis_client.pipeline()
        pipe.hget(key, "tokens")
        pipe.hget(key, "last_refill")
        results = pipe.execute()

        if results[0] is None:
            return self.max_tokens, time.time()

        return float(results[0]), float(results[1])

    def _set_bucket_redis(self, partner_id: str, tokens: float, last_refill: float):
        """Set bucket state in Redis"""
        key = f"ratelimit:{partner_id}"
        pipe = self.redis_client.pipeline()
        pipe.hset(key, "tokens", tokens)
        pipe.hset(key, "last_refill", last_refill)
        pipe.expire(key, 3600)  # Expire after 1 hour of inactivity
        pipe.execute()

    def check_rate_limit(self, partner_id: str) -> Tuple[bool, dict]:
        """
        Check if request is within rate limit.

        Args:
            partner_id: Partner UUID

        Returns:
            Tuple of (allowed, info)
            - allowed: True if request should be allowed
            - info: Dict with remaining tokens, retry_after seconds, etc.
        """
        now = time.time()

        if self.use_redis:
            tokens, last_refill = self._get_bucket_redis(partner_id)
        else:
            if partner_id not in self.buckets:
                self.buckets[partner_id] = (self.max_tokens, now)
            tokens, last_refill = self.buckets[partner_id]

        # Calculate tokens to add based on time elapsed
        time_elapsed = now - last_refill
        tokens_to_add = time_elapsed * self.refill_rate
        tokens = min(self.max_tokens, tokens + tokens_to_add)

        # Check if we can consume a token
        if tokens >= 1.0:
            # Allow request, consume token
            tokens -= 1.0
            allowed = True
            retry_after = 0
        else:
            # Rate limit exceeded
            allowed = False
            # Calculate when next token available
            retry_after = (1.0 - tokens) / self.refill_rate

        # Update bucket
        if self.use_redis:
            self._set_bucket_redis(partner_id, tokens, now)
        else:
            self.buckets[partner_id] = (tokens, now)

        info = {
            "remaining": int(tokens),
            "limit": self.max_tokens,
            "retry_after": retry_after,
        }

        return allowed, info


# Global rate limiter instance
rate_limiter = RateLimiter(
    max_tokens=int(os.getenv("RATE_LIMIT_TOKENS", "60")),
    refill_rate=float(os.getenv("RATE_LIMIT_REFILL_RATE", "1.0")),
    use_redis=os.getenv("REDIS_URL") is not None,
)


def sanitize_for_logging(data: dict, max_length: int = 100) -> dict:
    """
    Sanitize data for structured logging.

    Per Threat Model T7, T9: Remove PII and truncate long fields.

    Args:
        data: Dictionary to sanitize
        max_length: Max string length before truncation

    Returns:
        Sanitized copy of data
    """
    sanitized = {}

    for key, value in data.items():
        # Skip sensitive fields
        if key in ("api_key", "secret", "password", "token", "key_hash"):
            sanitized[key] = "[REDACTED]"
        # Truncate long strings
        elif isinstance(value, str) and len(value) > max_length:
            sanitized[key] = value[:max_length] + "..."
        # Keep other values
        else:
            sanitized[key] = value

    return sanitized

