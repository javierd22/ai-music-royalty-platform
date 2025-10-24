"""
Compliance & Auditing API Routes

Per PRD Section 5.5: Public verification and transparency system
Per PRD Section 12: Ethical principles and regulatory compliance

This module provides public-facing compliance verification endpoints:
- Track verification (blockchain proof)
- Event verification (royalty proof)
- Comprehensive compliance reports

All endpoints are rate-limited and audit-logged.
"""

import json
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from server.utils.compliance import (
    check_rate_limit,
    compute_event_proof_hash,
    compute_track_proof_hash,
    generate_compliance_report,
    log_verification_attempt,
    sanitize_report_filters,
    verify_track_on_chain,
)
from server.utils.db import get_supabase_client

router = APIRouter(prefix="/compliance", tags=["Compliance & Auditing"])


# ============================================================================
# RESPONSE MODELS
# ============================================================================

class TrackVerificationResponse(BaseModel):
    """Response model for track verification."""
    
    track_id: str
    title: str
    artist: str
    tx_hash: Optional[str] = None
    verified_on_chain: bool
    timestamp: str
    proof_hash: str
    blockchain_details: Optional[dict] = None


class EventVerificationResponse(BaseModel):
    """Response model for royalty event verification."""
    
    event_id: str
    track_id: str
    amount_cents: int
    confidence: float
    tx_hash: Optional[str] = None
    verified_on_chain: bool
    timestamp: str
    proof_hash: str
    blockchain_details: Optional[dict] = None


class ComplianceReportResponse(BaseModel):
    """Response model for compliance report."""
    
    report_id: str
    generated_at: str
    filters: dict
    summary: dict
    tracks: list
    events: list
    compliance: dict
    signature: str


class ErrorResponse(BaseModel):
    """Structured error response."""
    
    error: str
    detail: str
    request_id: Optional[str] = None
    timestamp: str


# ============================================================================
# TRACK VERIFICATION ENDPOINT
# ============================================================================

@router.get(
    "/verify/track/{track_id}",
    response_model=TrackVerificationResponse,
    summary="Verify Track Provenance",
    description="""
    Verify a track's blockchain registration and authenticity.
    
    Returns proof of track registration including:
    - Track metadata (title, artist)
    - Blockchain transaction hash
    - On-chain verification status
    - Cryptographic proof hash
    
    **Rate Limited:** 100 requests per 5 minutes per IP
    **Public Access:** No authentication required
    **Audit Logged:** All verification attempts are recorded
    
    Per PRD Section 5.5: Public transparency and verification
    """
)
async def verify_track(track_id: str, request: Request):
    """
    Verify track's blockchain registration status.
    
    Args:
        track_id: UUID of the track to verify
        request: FastAPI request object (for IP tracking)
        
    Returns:
        TrackVerificationResponse with verification details
        
    Raises:
        HTTPException 429: Rate limit exceeded
        HTTPException 404: Track not found
        HTTPException 500: Verification error
    """
    supabase = get_supabase_client()
    requester_ip = request.client.host if request.client else "unknown"
    
    # Rate limiting
    within_limit = await check_rate_limit(supabase, requester_ip)
    if not within_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": "300"}
        )
    
    try:
        # Validate UUID
        track_uuid = UUID(track_id)
        
        # Fetch track from database
        result = supabase.table("tracks").select("*").eq("id", str(track_uuid)).execute()
        
        if not result.data or len(result.data) == 0:
            # Log failed verification attempt
            await log_verification_attempt(
                supabase,
                entity_type="track",
                entity_id=track_uuid,
                verified=False,
                verification_details={"error": "Track not found"},
                requester_ip=requester_ip
            )
            
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Track {track_id} not found"
            )
        
        track = result.data[0]
        
        # Verify blockchain status
        blockchain_details = await verify_track_on_chain(track.get("tx_hash"))
        verified_on_chain = blockchain_details.get("verified_on_chain", False)
        
        # Compute proof hash
        proof_hash = compute_track_proof_hash(
            track_uuid,
            track["title"],
            track["artist"],
            track.get("tx_hash")
        )
        
        # Log successful verification attempt
        await log_verification_attempt(
            supabase,
            entity_type="track",
            entity_id=track_uuid,
            verified=verified_on_chain,
            verification_details={
                "tx_hash": track.get("tx_hash"),
                "proof_hash": proof_hash,
                "blockchain_details": blockchain_details
            },
            requester_ip=requester_ip
        )
        
        # Structured logging
        print(json.dumps({
            "event": "track_verification",
            "track_id": str(track_uuid),
            "verified_on_chain": verified_on_chain,
            "requester_ip": requester_ip,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }))
        
        return TrackVerificationResponse(
            track_id=str(track_uuid),
            title=track["title"],
            artist=track["artist"],
            tx_hash=track.get("tx_hash"),
            verified_on_chain=verified_on_chain,
            timestamp=track.get("created_at", datetime.now(timezone.utc).isoformat()),
            proof_hash=proof_hash,
            blockchain_details=blockchain_details if verified_on_chain else None
        )
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid track ID format. Must be a valid UUID."
        )
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        print(f"Track verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Verification service temporarily unavailable"
        )


# ============================================================================
# EVENT VERIFICATION ENDPOINT
# ============================================================================

@router.get(
    "/verify/event/{event_id}",
    response_model=EventVerificationResponse,
    summary="Verify Royalty Event",
    description="""
    Verify a royalty event's authenticity and blockchain proof.
    
    Returns proof of royalty event including:
    - Event metadata (track, amount, confidence)
    - Blockchain transaction hash
    - On-chain verification status
    - Cryptographic proof hash
    
    **Rate Limited:** 100 requests per 5 minutes per IP
    **Public Access:** No authentication required
    **Audit Logged:** All verification attempts are recorded
    
    Per PRD Section 5.4: Royalty event verification
    """
)
async def verify_event(event_id: str, request: Request):
    """
    Verify royalty event's blockchain registration status.
    
    Args:
        event_id: UUID of the event to verify
        request: FastAPI request object (for IP tracking)
        
    Returns:
        EventVerificationResponse with verification details
        
    Raises:
        HTTPException 429: Rate limit exceeded
        HTTPException 404: Event not found
        HTTPException 500: Verification error
    """
    supabase = get_supabase_client()
    requester_ip = request.client.host if request.client else "unknown"
    
    # Rate limiting
    within_limit = await check_rate_limit(supabase, requester_ip)
    if not within_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": "300"}
        )
    
    try:
        # Validate UUID
        event_uuid = UUID(event_id)
        
        # Fetch event from database
        result = supabase.table("royalty_events").select("*").eq("id", str(event_uuid)).execute()
        
        if not result.data or len(result.data) == 0:
            # Log failed verification attempt
            await log_verification_attempt(
                supabase,
                entity_type="event",
                entity_id=event_uuid,
                verified=False,
                verification_details={"error": "Event not found"},
                requester_ip=requester_ip
            )
            
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Royalty event {event_id} not found"
            )
        
        event = result.data[0]
        
        # Verify blockchain status
        blockchain_details = await verify_track_on_chain(event.get("tx_hash"))
        verified_on_chain = blockchain_details.get("verified_on_chain", False)
        
        # Compute proof hash
        payout_weight = event.get("payout_weight", 0)
        amount_cents = int(payout_weight * 100)
        confidence = event.get("match_confidence", 0)
        
        proof_hash = compute_event_proof_hash(
            event_uuid,
            UUID(event["track_id"]),
            amount_cents,
            confidence,
            event.get("tx_hash")
        )
        
        # Log successful verification attempt
        await log_verification_attempt(
            supabase,
            entity_type="event",
            entity_id=event_uuid,
            verified=verified_on_chain,
            verification_details={
                "tx_hash": event.get("tx_hash"),
                "proof_hash": proof_hash,
                "blockchain_details": blockchain_details
            },
            requester_ip=requester_ip
        )
        
        # Structured logging
        print(json.dumps({
            "event": "event_verification",
            "event_id": str(event_uuid),
            "track_id": event["track_id"],
            "verified_on_chain": verified_on_chain,
            "requester_ip": requester_ip,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }))
        
        return EventVerificationResponse(
            event_id=str(event_uuid),
            track_id=event["track_id"],
            amount_cents=amount_cents,
            confidence=confidence,
            tx_hash=event.get("tx_hash"),
            verified_on_chain=verified_on_chain,
            timestamp=event.get("created_at", datetime.now(timezone.utc).isoformat()),
            proof_hash=proof_hash,
            blockchain_details=blockchain_details if verified_on_chain else None
        )
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid event ID format. Must be a valid UUID."
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Event verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Verification service temporarily unavailable"
        )


# ============================================================================
# COMPLIANCE REPORT ENDPOINT
# ============================================================================

@router.get(
    "/report",
    response_model=ComplianceReportResponse,
    summary="Generate Compliance Report",
    description="""
    Generate a comprehensive, cryptographically signed compliance report.
    
    Optional filters:
    - `label_id`: Filter tracks by label/partner UUID
    - `date_from`: Start date (ISO 8601)
    - `date_to`: End date (ISO 8601)
    - `limit`: Maximum records per category (default 100, max 1000)
    
    The report includes:
    - All tracks with verification status
    - All royalty events with proof hashes
    - Compliance checklist (EU AI Act, C2PA, blockchain)
    - HMAC signature for tamper detection
    
    **Rate Limited:** 100 requests per 5 minutes per IP
    **Public Access:** No authentication required
    **Audit Logged:** All report generations are recorded
    
    Per PRD Section 12: Regulatory compliance and transparency
    """
)
async def generate_report(
    request: Request,
    label_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 100
):
    """
    Generate comprehensive compliance report with optional filters.
    
    Args:
        request: FastAPI request object
        label_id: Optional label/partner UUID filter
        date_from: Optional start date filter (ISO 8601)
        date_to: Optional end date filter (ISO 8601)
        limit: Maximum records per category (1-1000)
        
    Returns:
        ComplianceReportResponse with signed report data
        
    Raises:
        HTTPException 429: Rate limit exceeded
        HTTPException 400: Invalid filters
        HTTPException 500: Report generation error
    """
    supabase = get_supabase_client()
    requester_ip = request.client.host if request.client else "unknown"
    
    # Rate limiting
    within_limit = await check_rate_limit(supabase, requester_ip)
    if not within_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": "300"}
        )
    
    try:
        # Sanitize filters
        raw_filters = {
            "label_id": label_id,
            "date_from": date_from,
            "date_to": date_to,
            "limit": limit
        }
        filters = sanitize_report_filters(raw_filters)
        
        # Fetch tracks
        tracks_query = supabase.table("tracks").select("*")
        
        if "date_from" in filters:
            tracks_query = tracks_query.gte("created_at", filters["date_from"])
        if "date_to" in filters:
            tracks_query = tracks_query.lte("created_at", filters["date_to"])
        
        tracks_query = tracks_query.limit(filters.get("limit", 100))
        tracks_result = tracks_query.execute()
        tracks = tracks_result.data or []
        
        # Fetch royalty events
        events_query = supabase.table("royalty_events").select("*")
        
        if "date_from" in filters:
            events_query = events_query.gte("created_at", filters["date_from"])
        if "date_to" in filters:
            events_query = events_query.lte("created_at", filters["date_to"])
        
        events_query = events_query.limit(filters.get("limit", 100))
        events_result = events_query.execute()
        events = events_result.data or []
        
        # Generate signed report
        report = generate_compliance_report(tracks, events, filters)
        
        # Log report generation
        await log_verification_attempt(
            supabase,
            entity_type="report",
            entity_id=None,
            verified=True,
            verification_details={
                "report_id": report["report_id"],
                "filters": filters,
                "summary": report["summary"]
            },
            requester_ip=requester_ip
        )
        
        # Structured logging
        print(json.dumps({
            "event": "compliance_report_generated",
            "report_id": report["report_id"],
            "total_tracks": report["summary"]["total_tracks"],
            "total_events": report["summary"]["total_events"],
            "requester_ip": requester_ip,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }))
        
        return ComplianceReportResponse(**report)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Report generation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Report generation service temporarily unavailable"
        )


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get(
    "/health",
    summary="Compliance API Health Check",
    description="Check if compliance verification service is operational"
)
async def health_check():
    """
    Health check endpoint for compliance API.
    
    Returns:
        Status information without sensitive data
    """
    return {
        "status": "operational",
        "service": "Compliance & Auditing API",
        "version": "1.0.0",
        "endpoints": {
            "track_verification": "/compliance/verify/track/{track_id}",
            "event_verification": "/compliance/verify/event/{event_id}",
            "compliance_report": "/compliance/report"
        },
        "rate_limit": "100 requests per 5 minutes",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

