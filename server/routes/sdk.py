"""
AI Partner SDK Endpoints
Per PRD Section 5.2: AI Partner SDK integration

Provides endpoints for AI partners to log track usage via SDK.

SECURITY:
- All endpoints require API key authentication (x-api-key header)
- POST endpoints require HMAC signature (x-signature, x-timestamp, x-nonce)
- Rate limited to 60 requests/minute per partner
- Body size limited to 10MB
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, validator

from server.middleware.auth import get_authenticated_partner, get_authenticated_partner_no_sig
from server.utils.db import get_supabase_client
from server.utils.security import compute_proof_hash, sanitize_for_logging

router = APIRouter(prefix="/sdk", tags=["SDK"])


class LogUseRequest(BaseModel):
    """
    Request body for logging AI SDK usage
    
    Per Threat Model T7: Input validation with strict limits
    """

    model_id: str = Field(
        ...,
        description="AI model identifier (e.g., suno-v3)",
        min_length=1,
        max_length=100,
    )
    track_id: UUID = Field(..., description="UUID of the reference track")
    prompt: Optional[str] = Field(
        None, description="Generation prompt", max_length=1000
    )
    confidence: Optional[float] = Field(
        None, ge=0.0, le=1.0, description="SDK-reported influence confidence (0-1)"
    )
    metadata: Optional[dict] = Field(
        default_factory=dict, description="Additional metadata"
    )

    @validator("model_id")
    def validate_model_id(cls, v):
        """Validate model_id contains only safe characters"""
        if not v.replace("-", "").replace("_", "").replace(".", "").isalnum():
            raise ValueError("model_id must contain only alphanumeric, dash, underscore, dot")
        return v

    @validator("prompt")
    def validate_prompt(cls, v):
        """Sanitize prompt for safe storage and display"""
        if v is None:
            return None
        # Remove control characters
        return "".join(char for char in v if ord(char) >= 32 or char in "\n\t")

    @validator("metadata")
    def validate_metadata(cls, v):
        """Limit metadata size"""
        if v and len(str(v)) > 1000:
            raise ValueError("metadata too large (max 1000 chars)")
        return v


class LogUseResponse(BaseModel):
    """Response for successful SDK log creation"""

    id: str
    model_id: str
    track_id: str
    prompt: Optional[str]
    confidence: Optional[float]
    metadata: dict
    created_at: str


@router.post("/log_use", response_model=LogUseResponse, status_code=status.HTTP_201_CREATED)
async def log_use(
    request: LogUseRequest,
    partner: dict = Depends(get_authenticated_partner),
):
    """
    Log AI SDK track usage event

    **Authentication required:** API key + HMAC signature

    Creates a use slip record that can be cross-validated with
    attribution auditor results for dual proof verification.

    Per PRD Section 5.2: SDK logs generation events with
    { modelID, prompt, trackID, timestamp, confidence }

    Per Threat Model:
    - T1: Partner_id attached to every log (audit trail)
    - T3: API key authentication required
    - T2: HMAC signature prevents tampering
    - T7: Input validation and sanitization

    Example (see docs for signature generation):
    ```bash
    curl -X POST http://localhost:8001/sdk/log_use \\
      -H "x-api-key: pk_live_abc123.secret_xyz" \\
      -H "x-timestamp: 2025-10-17T12:00:00Z" \\
      -H "x-nonce: $(uuidgen)" \\
      -H "x-signature: <computed_hmac>" \\
      -H "Content-Type: application/json" \\
      -d '{
        "model_id": "suno-v3",
        "track_id": "550e8400-e29b-41d4-a716-446655440000",
        "prompt": "Generate lo-fi hip hop beat",
        "confidence": 0.87
      }'
    ```
    """
    import json

    supabase = get_supabase_client()
    partner_id = partner["partner_id"]

    # Validate track exists
    track_check = (
        supabase.table("tracks")
        .select("id")
        .eq("id", str(request.track_id))
        .execute()
    )

    if not track_check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Track {request.track_id} not found",
        )

    # Insert SDK log with partner_id
    log_data = {
        "partner_id": str(partner_id),
        "model_id": request.model_id,
        "track_id": str(request.track_id),
        "prompt": request.prompt,
        "confidence": request.confidence,
    }

    try:
        result = supabase.table("ai_use_logs").insert(log_data).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create SDK log",
            )

        log = result.data[0]

        # Structured logging (sanitized)
        print(
            json.dumps(
                {
                    "event": "sdk_log_created",
                    "log_id": log["id"],
                    "partner_id": str(partner_id),
                    "model_id": request.model_id,
                    "track_id": str(request.track_id),
                    "has_prompt": request.prompt is not None,
                    "confidence": request.confidence,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )
        )

        return LogUseResponse(
            id=log["id"],
            model_id=log["model_id"],
            track_id=log["track_id"],
            prompt=log["prompt"],
            confidence=log["confidence"],
            metadata=log.get("metadata", {}),
            created_at=log["created_at"],
        )

    except Exception as e:
        # Log error without sensitive details
        print(
            json.dumps(
                {
                    "event": "sdk_log_error",
                    "partner_id": str(partner_id),
                    "error": "Failed to insert log",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create SDK log",
        )


@router.get("/log_use")
async def get_logs(
    partner: dict = Depends(get_authenticated_partner_no_sig),
    track_id: Optional[str] = None,
    model_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """
    Retrieve SDK use logs with optional filters

    **Authentication required:** API key (no signature for GET)

    Per Threat Model T5: Partners can only read their own logs (RLS enforced)

    Query parameters:
    - track_id: Filter by track UUID
    - model_id: Filter by AI model identifier
    - limit: Maximum number of results (default: 50, max: 100)
    - offset: Pagination offset (default: 0)

    Example:
    ```bash
    curl -X GET "http://localhost:8001/sdk/log_use?limit=10" \\
      -H "x-api-key: pk_live_abc123.secret_xyz"
    ```
    """
    # Enforce pagination limit
    limit = min(limit, 100)

    supabase = get_supabase_client()
    partner_id = partner["partner_id"]

    # Query with partner_id filter (RLS also enforces this)
    query = supabase.table("ai_use_logs").select("*").eq("partner_id", str(partner_id))

    if track_id:
        query = query.eq("track_id", track_id)
    if model_id:
        query = query.eq("model_id", model_id)

    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)

    result = query.execute()

    return {"logs": result.data or [], "count": len(result.data or [])}


@router.get("/log_use/{log_id}")
async def get_log_by_id(
    log_id: UUID,
    partner: dict = Depends(get_authenticated_partner_no_sig),
):
    """
    Get a specific SDK log by ID

    **Authentication required:** API key

    Per Threat Model T5: Partners can only read their own logs
    """
    supabase = get_supabase_client()
    partner_id = partner["partner_id"]

    result = (
        supabase.table("ai_use_logs")
        .select("*")
        .eq("id", str(log_id))
        .eq("partner_id", str(partner_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SDK log {log_id} not found or access denied",
        )

    return result.data[0]

