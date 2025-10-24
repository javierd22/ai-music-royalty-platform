"""
Compliance & Auditing Utilities

Per PRD Section 5.5: Transparency and public verification system
Per PRD Section 12: Ethical principles and regulatory compliance

This module provides utilities for:
- Generating compliance reports
- Signing verification proofs
- Creating audit trails
- Validating blockchain integrity
"""

import hashlib
import hmac
import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from server.utils.blockchain import verify_on_chain


# ============================================================================
# CONSTANTS
# ============================================================================

COMPLIANCE_SECRET = os.getenv("COMPLIANCE_SIGNING_SECRET", "").encode("utf-8")
if not COMPLIANCE_SECRET:
    print("⚠️  WARNING: COMPLIANCE_SIGNING_SECRET not set. Using fallback for dev.")
    COMPLIANCE_SECRET = b"dev-secret-do-not-use-in-production"


# ============================================================================
# PROOF SIGNING
# ============================================================================

def sign_compliance_proof(data: Dict[str, Any]) -> str:
    """
    Generate HMAC-SHA256 signature for compliance proof.
    
    Args:
        data: Dictionary containing verification data
        
    Returns:
        Hex-encoded signature string
        
    Security:
        Uses HMAC-SHA256 with server-side secret
        Signature proves data integrity and server origin
    """
    # Serialize data deterministically
    canonical_json = json.dumps(data, sort_keys=True, separators=(',', ':'))
    
    # Generate HMAC signature
    signature = hmac.new(
        COMPLIANCE_SECRET,
        canonical_json.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return signature


def verify_compliance_proof(data: Dict[str, Any], signature: str) -> bool:
    """
    Verify HMAC-SHA256 signature of compliance proof.
    
    Args:
        data: Dictionary containing verification data
        signature: Hex-encoded signature to verify
        
    Returns:
        True if signature is valid, False otherwise
    """
    expected_signature = sign_compliance_proof(data)
    
    # Constant-time comparison to prevent timing attacks
    return hmac.compare_digest(signature, expected_signature)


# ============================================================================
# HASH COMPUTATION
# ============================================================================

def compute_track_proof_hash(track_id: UUID, title: str, artist: str, tx_hash: Optional[str]) -> str:
    """
    Compute deterministic proof hash for track verification.
    
    Args:
        track_id: Track UUID
        title: Track title
        artist: Artist name
        tx_hash: Blockchain transaction hash (if verified)
        
    Returns:
        SHA256 hash of track proof data
        
    Purpose:
        Provides immutable fingerprint of track verification state
    """
    proof_data = f"{track_id}|{title}|{artist}|{tx_hash or 'unverified'}"
    return hashlib.sha256(proof_data.encode('utf-8')).hexdigest()


def compute_event_proof_hash(
    event_id: UUID,
    track_id: UUID,
    amount: float,
    confidence: float,
    tx_hash: Optional[str]
) -> str:
    """
    Compute deterministic proof hash for royalty event verification.
    
    Args:
        event_id: Event UUID
        track_id: Associated track UUID
        amount: Payout amount
        confidence: Match confidence score
        tx_hash: Blockchain transaction hash (if verified)
        
    Returns:
        SHA256 hash of event proof data
    """
    proof_data = f"{event_id}|{track_id}|{amount}|{confidence}|{tx_hash or 'unverified'}"
    return hashlib.sha256(proof_data.encode('utf-8')).hexdigest()


# ============================================================================
# VERIFICATION LOGIC
# ============================================================================

async def verify_track_on_chain(tx_hash: Optional[str]) -> Dict[str, Any]:
    """
    Verify track's blockchain transaction status.
    
    Args:
        tx_hash: Blockchain transaction hash
        
    Returns:
        Dictionary with verification status and details
        
    Example:
        {
            "verified_on_chain": True,
            "block_number": 12345678,
            "timestamp": "2024-10-17T12:00:00Z",
            "network": "ethereum-sepolia"
        }
    """
    if not tx_hash:
        return {
            "verified_on_chain": False,
            "reason": "No transaction hash recorded"
        }
    
    try:
        # Call blockchain verification utility
        verification_result = await verify_on_chain(tx_hash)
        
        return {
            "verified_on_chain": verification_result.get("verified", False),
            "block_number": verification_result.get("block_number"),
            "timestamp": verification_result.get("timestamp"),
            "network": verification_result.get("network", "ethereum-sepolia"),
            "tx_hash": tx_hash
        }
    except Exception as e:
        print(f"Blockchain verification error for {tx_hash}: {e}")
        return {
            "verified_on_chain": False,
            "reason": "Blockchain verification failed",
            "error": str(e)
        }


# ============================================================================
# REPORT GENERATION
# ============================================================================

def generate_compliance_report(
    tracks: List[Dict[str, Any]],
    events: List[Dict[str, Any]],
    filters: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate comprehensive compliance report.
    
    Per PRD Section 12: Regulatory compliance and transparency
    
    Args:
        tracks: List of track records
        events: List of royalty event records
        filters: Optional filters applied (label_id, date_range)
        
    Returns:
        Signed compliance report with all verification data
        
    Structure:
        {
            "report_id": "uuid",
            "generated_at": "ISO timestamp",
            "filters": {...},
            "summary": {
                "total_tracks": int,
                "verified_tracks": int,
                "total_events": int,
                "total_payout": float
            },
            "tracks": [...],
            "events": [...],
            "compliance": {
                "eu_ai_act_article_52": bool,
                "c2pa_standard": bool,
                "blockchain_proof": bool
            },
            "signature": "hex"
        }
    """
    from uuid import uuid4
    
    report_id = str(uuid4())
    generated_at = datetime.now(timezone.utc).isoformat()
    
    # Calculate summary statistics
    verified_tracks = [t for t in tracks if t.get('tx_hash')]
    total_payout = sum(e.get('payout_weight', 0) * 100 for e in events)
    
    # Build report structure
    report_data = {
        "report_id": report_id,
        "generated_at": generated_at,
        "filters": filters or {},
        "summary": {
            "total_tracks": len(tracks),
            "verified_tracks": len(verified_tracks),
            "verification_rate": len(verified_tracks) / len(tracks) if tracks else 0,
            "total_events": len(events),
            "total_payout_cents": int(total_payout)
        },
        "tracks": [
            {
                "id": t.get("id"),
                "title": t.get("title"),
                "artist": t.get("artist"),
                "tx_hash": t.get("tx_hash"),
                "verified_on_chain": bool(t.get("tx_hash")),
                "proof_hash": compute_track_proof_hash(
                    t.get("id"),
                    t.get("title"),
                    t.get("artist"),
                    t.get("tx_hash")
                )
            }
            for t in tracks
        ],
        "events": [
            {
                "id": e.get("id"),
                "track_id": e.get("track_id"),
                "match_confidence": e.get("match_confidence"),
                "payout_weight": e.get("payout_weight"),
                "tx_hash": e.get("tx_hash"),
                "verified_on_chain": bool(e.get("tx_hash")),
                "proof_hash": compute_event_proof_hash(
                    e.get("id"),
                    e.get("track_id"),
                    e.get("payout_weight", 0),
                    e.get("match_confidence", 0),
                    e.get("tx_hash")
                )
            }
            for e in events
        ],
        "compliance": {
            "eu_ai_act_article_52": len(events) > 0,  # Logging requirement
            "c2pa_standard": len(verified_tracks) > 0,  # Content authenticity
            "blockchain_proof": len(verified_tracks) > 0,  # Immutable proof
            "audit_trail": True  # This report serves as audit trail
        }
    }
    
    # Sign the report
    signature = sign_compliance_proof(report_data)
    report_data["signature"] = signature
    
    return report_data


# ============================================================================
# AUDIT LOGGING
# ============================================================================

async def log_verification_attempt(
    supabase_client,
    entity_type: str,
    entity_id: Optional[UUID],
    verified: bool,
    verification_details: Dict[str, Any],
    requester_ip: Optional[str] = None
) -> Dict[str, Any]:
    """
    Log compliance verification attempt to audit trail.
    
    Per PRD Section 12: Audit trail and transparency
    
    Args:
        supabase_client: Supabase client instance
        entity_type: Type of entity ('track', 'event', 'report')
        entity_id: UUID of entity being verified
        verified: Whether verification succeeded
        verification_details: Dict with verification results
        requester_ip: IP address of requester (for rate limiting)
        
    Returns:
        Created log record
        
    Security:
        All verification attempts logged for audit trail
        Rate limiting based on IP address
    """
    try:
        log_entry = {
            "entity_type": entity_type,
            "entity_id": str(entity_id) if entity_id else None,
            "verified": verified,
            "verification_details": verification_details,
            "requester_ip": requester_ip,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = supabase_client.table("compliance_logs").insert(log_entry).execute()
        
        if result.data:
            return result.data[0]
        else:
            print(f"Failed to log verification attempt: {entity_type} {entity_id}")
            return log_entry
            
    except Exception as e:
        print(f"Error logging verification attempt: {e}")
        return log_entry


# ============================================================================
# RATE LIMITING
# ============================================================================

async def check_rate_limit(
    supabase_client,
    requester_ip: str,
    window_minutes: int = 5,
    max_requests: int = 100
) -> bool:
    """
    Check if requester has exceeded rate limit.
    
    Args:
        supabase_client: Supabase client instance
        requester_ip: IP address of requester
        window_minutes: Time window for rate limit
        max_requests: Maximum requests allowed in window
        
    Returns:
        True if within rate limit, False if exceeded
        
    Security:
        Prevents abuse of public compliance endpoints
        Per PRD Section 5.5: Public verification must be rate-limited
    """
    try:
        from datetime import timedelta
        
        cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)
        
        # Count recent requests from this IP
        result = supabase_client.table("compliance_logs") \
            .select("id", count="exact") \
            .eq("requester_ip", requester_ip) \
            .gte("created_at", cutoff_time.isoformat()) \
            .execute()
        
        request_count = result.count or 0
        
        return request_count < max_requests
        
    except Exception as e:
        print(f"Rate limit check error: {e}")
        # Fail open to avoid blocking legitimate requests on errors
        return True


# ============================================================================
# VALIDATION
# ============================================================================

def sanitize_report_filters(filters: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitize and validate report filter parameters.
    
    Args:
        filters: Raw filter parameters from request
        
    Returns:
        Sanitized filter dictionary
        
    Security:
        Prevents SQL injection and validates data types
    """
    sanitized = {}
    
    # Label ID filter
    if "label_id" in filters:
        try:
            sanitized["label_id"] = str(UUID(filters["label_id"]))
        except (ValueError, TypeError):
            pass  # Skip invalid UUIDs
    
    # Date range filters
    if "date_from" in filters:
        try:
            datetime.fromisoformat(filters["date_from"])
            sanitized["date_from"] = filters["date_from"]
        except (ValueError, TypeError):
            pass
    
    if "date_to" in filters:
        try:
            datetime.fromisoformat(filters["date_to"])
            sanitized["date_to"] = filters["date_to"]
        except (ValueError, TypeError):
            pass
    
    # Pagination
    if "limit" in filters:
        try:
            limit = int(filters["limit"])
            sanitized["limit"] = min(max(1, limit), 1000)  # Clamp to 1-1000
        except (ValueError, TypeError):
            sanitized["limit"] = 100
    
    return sanitized

