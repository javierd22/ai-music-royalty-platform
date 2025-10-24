"""
Dual Proof Logic
Per PRD Section 5.4: Royalty Event Engine

Dual Proof verification requires:
1. SDK log from AI partner (ai_use_logs)
2. Attribution auditor detection (results)

Status values:
- confirmed: Royalty event exists linking both proofs
- pending: SDK log and result align but no royalty event yet
- none: No dual proof alignment found
"""

import os
from datetime import datetime, timedelta
from typing import Literal, Optional, TypedDict

from ..utils.db import get_supabase_client

DualProofStatus = Literal["confirmed", "pending", "none"]

# Configuration from environment
DUAL_PROOF_WINDOW_MINUTES = int(os.getenv("DUAL_PROOF_WINDOW_MINUTES", "10"))
DUAL_PROOF_THRESHOLD = float(os.getenv("DUAL_PROOF_THRESHOLD", "0.85"))


class DualProofResult(TypedDict):
    status: DualProofStatus
    sdk_log_id: Optional[str]
    result_id: Optional[str]
    royalty_event_id: Optional[str]
    similarity: Optional[float]
    sdk_confidence: Optional[float]


def get_dual_proof_status_for_result(result_id: str) -> DualProofResult:
    """
    Determine dual proof status for a specific attribution result

    Checks if:
    1. There's an SDK log for the same track within the time window
    2. The result similarity meets threshold
    3. A royalty event exists linking both
    """
    supabase = get_supabase_client()

    # Get the result
    result_query = supabase.table("results").select("*").eq("id", result_id).execute()

    if not result_query.data:
        return {
            "status": "none",
            "sdk_log_id": None,
            "result_id": result_id,
            "royalty_event_id": None,
            "similarity": None,
            "sdk_confidence": None,
        }

    result = result_query.data[0]
    track_id = result["track_id"]
    created_at = datetime.fromisoformat(result["created_at"].replace("Z", "+00:00"))
    similarity = result.get("similarity", 0)

    # Check if similarity meets threshold
    if similarity < DUAL_PROOF_THRESHOLD:
        return {
            "status": "none",
            "sdk_log_id": None,
            "result_id": result_id,
            "royalty_event_id": None,
            "similarity": similarity,
            "sdk_confidence": None,
        }

    # Check for royalty event first (confirmed status)
    royalty_check = (
        supabase.table("royalty_events")
        .select("id, ai_use_log_id")
        .eq("result_id", result_id)
        .eq("track_id", track_id)
        .execute()
    )

    if royalty_check.data:
        event = royalty_check.data[0]
        sdk_log_id = event.get("ai_use_log_id")

        # Get SDK confidence if available
        sdk_confidence = None
        if sdk_log_id:
            sdk_log = (
                supabase.table("ai_use_logs").select("confidence").eq("id", sdk_log_id).execute()
            )
            if sdk_log.data:
                sdk_confidence = sdk_log.data[0].get("confidence")

        return {
            "status": "confirmed",
            "sdk_log_id": sdk_log_id,
            "result_id": result_id,
            "royalty_event_id": event["id"],
            "similarity": similarity,
            "sdk_confidence": sdk_confidence,
        }

    # Check for SDK log within time window (pending status)
    window_start = created_at - timedelta(minutes=DUAL_PROOF_WINDOW_MINUTES)
    window_end = created_at + timedelta(minutes=DUAL_PROOF_WINDOW_MINUTES)

    sdk_logs = (
        supabase.table("ai_use_logs")
        .select("*")
        .eq("track_id", track_id)
        .gte("created_at", window_start.isoformat())
        .lte("created_at", window_end.isoformat())
        .execute()
    )

    if sdk_logs.data:
        # Use the closest SDK log
        log = sdk_logs.data[0]
        return {
            "status": "pending",
            "sdk_log_id": log["id"],
            "result_id": result_id,
            "royalty_event_id": None,
            "similarity": similarity,
            "sdk_confidence": log.get("confidence"),
        }

    return {
        "status": "none",
        "sdk_log_id": None,
        "result_id": result_id,
        "royalty_event_id": None,
        "similarity": similarity,
        "sdk_confidence": None,
    }


def get_dual_proof_status_for_track(
    track_id: str, timestamp: Optional[datetime] = None
) -> DualProofResult:
    """
    Determine dual proof status for a track at a given timestamp

    If no timestamp provided, uses current time.
    """
    if timestamp is None:
        timestamp = datetime.utcnow()

    supabase = get_supabase_client()

    # Find results for this track near the timestamp
    window_start = timestamp - timedelta(minutes=DUAL_PROOF_WINDOW_MINUTES)
    window_end = timestamp + timedelta(minutes=DUAL_PROOF_WINDOW_MINUTES)

    results = (
        supabase.table("results")
        .select("*")
        .eq("track_id", track_id)
        .gte("created_at", window_start.isoformat())
        .lte("created_at", window_end.isoformat())
        .gte("similarity", DUAL_PROOF_THRESHOLD)
        .execute()
    )

    if not results.data:
        return {
            "status": "none",
            "sdk_log_id": None,
            "result_id": None,
            "royalty_event_id": None,
            "similarity": None,
            "sdk_confidence": None,
        }

    # Check most recent result for dual proof
    result = results.data[0]
    return get_dual_proof_status_for_result(result["id"])


def get_dual_proof_status_for_sdk_log(log_id: str) -> DualProofResult:
    """
    Determine dual proof status for a specific SDK log

    Checks if there's a matching attribution result and royalty event.
    """
    supabase = get_supabase_client()

    # Get the SDK log
    log_query = supabase.table("ai_use_logs").select("*").eq("id", log_id).execute()

    if not log_query.data:
        return {
            "status": "none",
            "sdk_log_id": log_id,
            "result_id": None,
            "royalty_event_id": None,
            "similarity": None,
            "sdk_confidence": None,
        }

    log = log_query.data[0]
    track_id = log["track_id"]
    created_at = datetime.fromisoformat(log["created_at"].replace("Z", "+00:00"))
    sdk_confidence = log.get("confidence")

    # Check for royalty event first
    royalty_check = (
        supabase.table("royalty_events")
        .select("id, result_id, similarity")
        .eq("ai_use_log_id", log_id)
        .eq("track_id", track_id)
        .execute()
    )

    if royalty_check.data:
        event = royalty_check.data[0]
        return {
            "status": "confirmed",
            "sdk_log_id": log_id,
            "result_id": event.get("result_id"),
            "royalty_event_id": event["id"],
            "similarity": event.get("similarity"),
            "sdk_confidence": sdk_confidence,
        }

    # Check for matching result within time window
    window_start = created_at - timedelta(minutes=DUAL_PROOF_WINDOW_MINUTES)
    window_end = created_at + timedelta(minutes=DUAL_PROOF_WINDOW_MINUTES)

    results = (
        supabase.table("results")
        .select("*")
        .eq("track_id", track_id)
        .gte("created_at", window_start.isoformat())
        .lte("created_at", window_end.isoformat())
        .gte("similarity", DUAL_PROOF_THRESHOLD)
        .execute()
    )

    if results.data:
        result = results.data[0]
        return {
            "status": "pending",
            "sdk_log_id": log_id,
            "result_id": result["id"],
            "royalty_event_id": None,
            "similarity": result.get("similarity"),
            "sdk_confidence": sdk_confidence,
        }

    return {
        "status": "none",
        "sdk_log_id": log_id,
        "result_id": None,
        "royalty_event_id": None,
        "similarity": None,
        "sdk_confidence": sdk_confidence,
    }

