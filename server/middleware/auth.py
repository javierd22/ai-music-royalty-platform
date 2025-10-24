"""
Authentication Middleware
Per Threat Model T2, T3, T4: API key auth, HMAC verification, replay protection, rate limiting
"""

import json
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import Table, MetaData, insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from server.utils.db import get_db
from server.utils.security import (
    derive_signing_secret,
    extract_key_prefix,
    rate_limiter,
    sanitize_for_logging,
    verify_api_key,
    verify_request_signature,
)


class AuthenticationError(HTTPException):
    """Custom exception for authentication failures"""

    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class RateLimitError(HTTPException):
    """Custom exception for rate limiting"""

    def __init__(self, detail: str, retry_after: float):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            headers={"Retry-After": str(int(retry_after))},
        )


async def authenticate_partner_request(
    request: Request, db: AsyncSession, require_signature: bool = True
) -> dict:
    """
    Authenticate partner API request with key, signature, and replay protection.

    Per Threat Model:
    - T3: API key authentication with Argon2 verification
    - T2: HMAC signature verification prevents tampering
    - T2: Timestamp and nonce prevent replay attacks
    - T4: Rate limiting prevents DoS

    Args:
        request: FastAPI request object
        db: Database session
        require_signature: Whether to enforce HMAC signature (default: True)

    Returns:
        Dict with partner_id, key_id, scopes

    Raises:
        AuthenticationError: If authentication fails
        RateLimitError: If rate limit exceeded
    """
    # Extract headers
    api_key = request.headers.get("x-api-key")
    timestamp = request.headers.get("x-timestamp")
    signature = request.headers.get("x-signature")
    nonce = request.headers.get("x-nonce")

    # Validate required headers
    if not api_key:
        raise AuthenticationError("Missing x-api-key header")

    if require_signature:
        if not timestamp:
            raise AuthenticationError("Missing x-timestamp header")
        if not signature:
            raise AuthenticationError("Missing x-signature header")
        if not nonce:
            raise AuthenticationError("Missing x-nonce header")

    # Extract key prefix for lookup
    key_prefix = extract_key_prefix(api_key)
    if not key_prefix:
        raise AuthenticationError("Invalid API key format")

    # Lookup key in database
    from server.routes.keys import get_partner_by_key_prefix

    key_info = await get_partner_by_key_prefix(db, key_prefix)
    if not key_info:
        raise AuthenticationError("Invalid or inactive API key")

    # Verify API key hash
    if not verify_api_key(api_key, key_info["key_hash"]):
        raise AuthenticationError("Invalid API key")

    partner_id = str(key_info["partner_id"])
    key_id = key_info["key_id"]
    scopes = key_info["scopes"]

    # Check rate limit
    allowed, rate_info = rate_limiter.check_rate_limit(partner_id)
    if not allowed:
        raise RateLimitError(
            f"Rate limit exceeded. Try again in {int(rate_info['retry_after'])} seconds.",
            rate_info["retry_after"],
        )

    # Verify signature if required
    if require_signature:
        # Read request body
        body = await request.body()

        # Derive signing secret from API key
        api_key_secret = api_key.split(".")[-1]
        signing_secret = derive_signing_secret(api_key_secret, partner_id)

        # Verify HMAC signature
        if not verify_request_signature(
            request.method, str(request.url.path), body, timestamp, signature, signing_secret
        ):
            raise AuthenticationError("Invalid signature or timestamp")

        # Check nonce for replay protection
        if not await check_and_store_nonce(db, partner_id, nonce, str(request.url.path)):
            raise AuthenticationError("Nonce already used (replay attack prevented)")

    # Update last_used_at timestamp
    from server.routes.keys import update_key_last_used

    await update_key_last_used(db, key_id)

    # Log successful authentication (sanitized)
    print(
        json.dumps(
            {
                "event": "partner_authenticated",
                "partner_id": partner_id,
                "key_prefix": key_prefix,
                "path": str(request.url.path),
                "method": request.method,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )
    )

    return {
        "partner_id": UUID(partner_id),
        "key_id": key_id,
        "scopes": scopes,
    }


async def check_and_store_nonce(
    db: AsyncSession, partner_id: str, nonce: str, request_path: str
) -> bool:
    """
    Check if nonce already used, store if new.

    Per Threat Model T2: Nonce prevents replay attacks.

    Args:
        db: Database session
        partner_id: Partner UUID
        nonce: Unique nonce from request
        request_path: API path for audit

    Returns:
        True if nonce is new (stored successfully), False if already used
    """
    metadata = MetaData()
    nonces_table = Table("request_nonces", metadata, autoload_with=db.bind)

    try:
        # Check if nonce exists
        result = await db.execute(
            select(nonces_table).where(
                nonces_table.c.partner_id == UUID(partner_id),
                nonces_table.c.nonce == nonce,
            )
        )
        existing = result.first()

        if existing:
            # Nonce already used - replay attack
            return False

        # Store new nonce
        await db.execute(
            insert(nonces_table).values(
                partner_id=UUID(partner_id),
                nonce=nonce,
                request_path=request_path,
                created_at=datetime.now(timezone.utc),
            )
        )
        await db.commit()
        return True

    except Exception as e:
        print(f"Error checking nonce: {e}")
        return False


def require_scope(required_scope: str):
    """
    Dependency to require specific scope on authenticated partner.

    Example:
        @router.post("/endpoint", dependencies=[Depends(require_scope("log:write"))])
    """

    async def _check_scope(partner: dict):
        if required_scope not in partner.get("scopes", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required scope: {required_scope}",
            )
        return partner

    return _check_scope


# ============================================================================
# MIDDLEWARE FOR ALL REQUESTS
# ============================================================================


async def security_middleware(request: Request, call_next):
    """
    Global security middleware for all requests.

    - Adds request ID
    - Logs requests (sanitized)
    - Enforces body size limits
    - Sets security headers
    """
    import secrets

    # Generate request ID
    request_id = secrets.token_hex(8)
    request.state.request_id = request_id

    # Check body size limit (10 MB default)
    max_body_size = 10 * 1024 * 1024  # 10 MB
    content_length = request.headers.get("content-length")

    if content_length and int(content_length) > max_body_size:
        return JSONResponse(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            content={"detail": "Request body too large (max 10MB)"},
        )

    # Process request
    try:
        response = await call_next(request)

        # Add security headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        return response

    except Exception as e:
        # Log error (sanitized)
        print(
            json.dumps(
                {
                    "event": "request_error",
                    "request_id": request_id,
                    "path": str(request.url.path),
                    "error": str(e),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )
        )
        raise


# ============================================================================
# DEPENDENCY FOR PROTECTED ENDPOINTS
# ============================================================================


async def get_authenticated_partner(request: Request) -> dict:
    """
    FastAPI dependency to get authenticated partner.

    Use in endpoints that require authentication:

    Example:
        @router.post("/sdk/log_use")
        async def log_use(
            partner: dict = Depends(get_authenticated_partner),
            db: AsyncSession = Depends(get_db)
        ):
            partner_id = partner["partner_id"]
            ...
    """
    # Get database session
    async for db in get_db():
        try:
            partner = await authenticate_partner_request(
                request, db, require_signature=True
            )
            return partner
        finally:
            await db.close()


async def get_authenticated_partner_no_sig(request: Request) -> dict:
    """
    FastAPI dependency for GET requests (no signature required).

    For read-only endpoints, signature can be optional.
    """
    async for db in get_db():
        try:
            partner = await authenticate_partner_request(
                request, db, require_signature=False
            )
            return partner
        finally:
            await db.close()


# ============================================================================
# CLEANUP TASK
# ============================================================================


async def cleanup_old_nonces():
    """
    Background task to cleanup old nonces (older than 1 hour).

    Per Threat Model T2: Prevent nonce table from growing unbounded.

    Run this via cron or FastAPI background task.
    """
    from datetime import timedelta

    async for db in get_db():
        try:
            metadata = MetaData()
            nonces_table = Table("request_nonces", metadata, autoload_with=db.bind)

            cutoff = datetime.now(timezone.utc) - timedelta(hours=1)

            result = await db.execute(
                nonces_table.delete().where(nonces_table.c.created_at < cutoff)
            )

            deleted_count = result.rowcount
            await db.commit()

            print(
                json.dumps(
                    {
                        "event": "nonces_cleaned",
                        "deleted_count": deleted_count,
                        "cutoff": cutoff.isoformat(),
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                )
            )

        finally:
            await db.close()


# ============================================================================
# ARTIST AUTHENTICATION (for Artist API)
# ============================================================================


async def verify_artist_token(request: Request) -> str:
    """
    Verify Supabase JWT token and extract artist_id.

    Per PRD §5.1: Artist Platform with secure authentication
    Per PRD §12: Compliance - auth-only route protection

    Args:
        request: FastAPI request object

    Returns:
        artist_id: Artist UUID from JWT

    Raises:
        AuthenticationError: If token is invalid or missing
    """
    import os
    
    # Extract Authorization header
    auth_header = request.headers.get("authorization")
    if not auth_header:
        raise AuthenticationError("Missing authorization header")

    # Extract Bearer token
    if not auth_header.startswith("Bearer "):
        raise AuthenticationError("Invalid authorization header format")

    token = auth_header[7:]  # Remove "Bearer " prefix

    try:
        # Verify JWT with Supabase
        from supabase import create_client

        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

        if not supabase_url or not supabase_key:
            raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")

        supabase = create_client(supabase_url, supabase_key)

        # Verify token and get user
        user = supabase.auth.get_user(token)
        
        if not user or not user.user:
            raise AuthenticationError("Invalid or expired token")

        user_id = user.user.id

        # Get artist profile from user_id
        artist_response = (
            supabase.table("artists")
            .select("id")
            .eq("auth_user_id", user_id)
            .single()
            .execute()
        )

        if not artist_response.data:
            raise AuthenticationError("Artist profile not found")

        artist_id = artist_response.data["id"]

        # Log successful authentication (sanitized)
        print(
            json.dumps(
                {
                    "event": "artist_authenticated",
                    "artist_id": artist_id[:8] + "***",  # Redact
                    "path": str(request.url.path),
                    "method": request.method,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )
        )

        return artist_id

    except Exception as e:
        print(f"Artist authentication error: {e}")
        raise AuthenticationError("Invalid or expired token")


# ============================================================================
# ADMIN USER AUTHENTICATION
# ============================================================================


async def get_admin_user(request: Request) -> dict:
    """
    Verify admin user from request.
    
    For admin-only endpoints (monitoring, maintenance).
    """
    # For now, use environment variable check
    # In production, integrate with proper admin auth system
    admin_key = request.headers.get("x-admin-key")
    expected_key = os.getenv("ADMIN_API_KEY")
    
    if not admin_key or admin_key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return {"role": "admin"}

