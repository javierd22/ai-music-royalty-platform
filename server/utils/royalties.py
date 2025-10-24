"""
Royalty event creation and management utilities.

Per PRD Section 5.4: Royalty Event Engine
- Generates royalty events only when SDK log + auditor detection agree
- Calculates payout weight based on similarity %, duration, and model type
- Records event in royalty_events table with immutable IDs
"""

from __future__ import annotations
import os
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel

from server.utils.db import get_supabase_client


class DualProofMatch(BaseModel):
    """Represents a verified match with dual proof."""
    track_id: str
    result_id: str
    ai_use_log_id: str
    similarity: float
    sdk_confidence: float
    track_title: str
    artist: str
    model_id: str


class VerifiedRoyaltyEvent(BaseModel):
    """Verified royalty event with dual proof."""
    id: str
    track_id: str
    result_id: str
    ai_use_log_id: str
    event_type: str
    similarity: float
    match_confidence: float
    payout_weight: float
    amount: float
    status: str
    verified_at: str
    metadata: Dict[str, Any]


def calculate_payout_weight(
    similarity: float,
    sdk_confidence: float,
    duration_seconds: Optional[float] = None,
    model_tier: Optional[str] = None
) -> float:
    """
    Calculate payout weight based on multiple factors.
    
    Per PRD Section 5.4: Calculates payout weight based on:
    - similarity % (from vector match)
    - duration (track length)
    - model type (AI model quality/tier)
    
    Args:
        similarity: Similarity score from vector match (0.0-1.0)
        sdk_confidence: Confidence from SDK log (0.0-1.0)
        duration_seconds: Track duration in seconds (optional)
        model_tier: AI model tier ('free', 'standard', 'premium', optional)
    
    Returns:
        float: Payout weight (0.0-1.0)
    
    Formula:
        base_weight = (similarity * 0.6) + (sdk_confidence * 0.4)
        duration_multiplier = min(duration_seconds / 180, 1.0) if duration else 1.0
        model_multiplier = {free: 0.8, standard: 1.0, premium: 1.2}
        payout_weight = base_weight * duration_multiplier * model_multiplier
    """
    # Base weight: weighted average of similarity and SDK confidence
    base_weight = (similarity * 0.6) + (sdk_confidence * 0.4)
    
    # Duration multiplier (tracks under 3 minutes get reduced weight)
    duration_multiplier = 1.0
    if duration_seconds is not None:
        # Full weight for tracks >= 3 minutes, proportional for shorter tracks
        duration_multiplier = min(duration_seconds / 180.0, 1.0)
    
    # Model tier multiplier
    model_multipliers = {
        'free': 0.8,      # Lower weight for free tier models
        'standard': 1.0,  # Standard weight
        'premium': 1.2    # Higher weight for premium models
    }
    model_multiplier = model_multipliers.get(model_tier, 1.0)
    
    # Calculate final payout weight
    payout_weight = base_weight * duration_multiplier * model_multiplier
    
    # Clamp to [0.0, 1.0]
    return max(0.0, min(1.0, payout_weight))


def calculate_payout_amount(
    payout_weight: float,
    base_rate: Optional[float] = None
) -> float:
    """
    Calculate payout amount based on weight and base rate.
    
    Args:
        payout_weight: Payout weight (0.0-1.0)
        base_rate: Base rate in USD (default from env var)
    
    Returns:
        float: Payout amount in USD
    """
    if base_rate is None:
        base_rate = float(os.getenv("ROYALTY_BASE_RATE", "10.0"))
    
    return round(payout_weight * base_rate, 2)


def create_verified_royalty_event(
    dual_proof: DualProofMatch,
    duration_seconds: Optional[float] = None,
    model_tier: Optional[str] = None
) -> Optional[VerifiedRoyaltyEvent]:
    """
    Create a verified royalty event with dual proof.
    
    Per PRD Section 5.4: Generates royalty events only when SDK log + auditor detection agree.
    Per PRD Section 3: Issue royalty events only when both proofs align.
    
    This is the core function that creates verified royalty events after the auditor
    confirms that both SDK log and vector match exist and align.
    
    Args:
        dual_proof: DualProofMatch object with verified match data
        duration_seconds: Optional track duration for payout calculation
        model_tier: Optional AI model tier for payout calculation
    
    Returns:
        VerifiedRoyaltyEvent if created successfully, None otherwise
    
    Database record created in royalty_events:
        - id: UUID
        - track_id: Reference to track
        - result_id: Reference to results table (auditor proof)
        - ai_use_log_id: Reference to ai_use_logs table (SDK proof)
        - event_type: 'dual_proof_verified'
        - similarity: From vector match
        - match_confidence: Combined confidence score
        - payout_weight: Calculated weight
        - amount: Calculated payout amount
        - status: 'pending'
        - verified_at: Current timestamp
        - metadata: Additional context
    """
    try:
        client = get_supabase_client()
        
        # Calculate match confidence (weighted average)
        match_confidence = (dual_proof.similarity * 0.6) + (dual_proof.sdk_confidence * 0.4)
        
        # Calculate payout weight
        payout_weight = calculate_payout_weight(
            similarity=dual_proof.similarity,
            sdk_confidence=dual_proof.sdk_confidence,
            duration_seconds=duration_seconds,
            model_tier=model_tier
        )
        
        # Calculate payout amount
        amount = calculate_payout_amount(payout_weight)
        
        # Create event record
        event_id = str(uuid.uuid4())
        event_record = {
            "id": event_id,
            "track_id": dual_proof.track_id,
            "result_id": dual_proof.result_id,
            "ai_use_log_id": dual_proof.ai_use_log_id,
            "event_type": "dual_proof_verified",
            "similarity": dual_proof.similarity,
            "match_confidence": round(match_confidence, 3),
            "payout_weight": round(payout_weight, 3),
            "amount": amount,
            "status": "pending",
            "verified_at": datetime.utcnow().isoformat(),
            "metadata": {
                "track_title": dual_proof.track_title,
                "artist": dual_proof.artist,
                "model_id": dual_proof.model_id,
                "sdk_confidence": dual_proof.sdk_confidence,
                "duration_seconds": duration_seconds,
                "model_tier": model_tier,
                "verification_note": "Dual proof verified by auditor job"
            }
        }
        
        # Insert into Supabase
        response = client.table("royalty_events").insert(event_record).execute()
        
        if response.data:
            data = response.data[0]
            print(f"✅ Verified royalty event created: {event_id}")
            print(f"   Track: {dual_proof.track_title} by {dual_proof.artist}")
            print(f"   Similarity: {dual_proof.similarity:.3f}, Confidence: {match_confidence:.3f}")
            print(f"   Payout: ${amount:.2f} (weight: {payout_weight:.3f})")
            
            return VerifiedRoyaltyEvent(
                id=data["id"],
                track_id=data["track_id"],
                result_id=data["result_id"],
                ai_use_log_id=data["ai_use_log_id"],
                event_type=data["event_type"],
                similarity=data["similarity"],
                match_confidence=data["match_confidence"],
                payout_weight=data["payout_weight"],
                amount=data["amount"],
                status=data["status"],
                verified_at=data["verified_at"],
                metadata=data.get("metadata", {})
            )
        
        return None
    
    except Exception as e:
        print(f"❌ Error creating verified royalty event: {str(e)}")
        return None


def get_pending_royalty_events(limit: int = 100) -> list:
    """
    Get pending royalty events for payment processing.
    
    Args:
        limit: Maximum number of events to return
    
    Returns:
        list: Pending royalty events
    """
    try:
        client = get_supabase_client()
        
        response = client.table("royalty_events") \
            .select("*") \
            .eq("status", "pending") \
            .order("verified_at", desc=False) \
            .limit(limit) \
            .execute()
        
        return response.data
    
    except Exception as e:
        print(f"Error fetching pending royalty events: {str(e)}")
        return []


def update_royalty_event_status(
    event_id: str,
    status: str,
    metadata_update: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Update royalty event status.
    
    Args:
        event_id: Event ID to update
        status: New status ('pending', 'approved', 'paid', 'disputed')
        metadata_update: Optional metadata to merge
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        client = get_supabase_client()
        
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Update timestamp based on status
        if status == "approved":
            update_data["approved_at"] = datetime.utcnow().isoformat()
        elif status == "paid":
            update_data["paid_at"] = datetime.utcnow().isoformat()
        
        # Merge metadata if provided
        if metadata_update:
            # Fetch current metadata first
            current = client.table("royalty_events").select("metadata").eq("id", event_id).execute()
            if current.data:
                current_metadata = current.data[0].get("metadata", {})
                current_metadata.update(metadata_update)
                update_data["metadata"] = current_metadata
        
        # Update the record
        response = client.table("royalty_events") \
            .update(update_data) \
            .eq("id", event_id) \
            .execute()
        
        return len(response.data) > 0
    
    except Exception as e:
        print(f"Error updating royalty event status: {str(e)}")
        return False
