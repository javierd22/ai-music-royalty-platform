"""
Supabase database utilities for results and royalty events.

This module handles:
- Inserting attribution results into Supabase
- Triggering royalty events for high-similarity matches
- Database connection and error handling

Per PRD Section 5.3: Reports matches back to Supabase `results` table.
Per PRD Section 5.4: Generates royalty events when SDK log + auditor detection agree.
"""

from __future__ import annotations
import os
import uuid
from datetime import datetime
from typing import AsyncGenerator, List, Dict, Any, Optional
from pydantic import BaseModel


class Match(BaseModel):
    """Match result from attribution comparison."""
    track_id: str
    track_title: str
    artist: str
    similarity: float
    percent_influence: float


class ResultRecord(BaseModel):
    """Database record for results table."""
    id: str
    track_id: str
    source_file: str
    similarity: float
    percent_influence: float
    created_at: str
    metadata: Dict[str, Any] = {}


class RoyaltyEvent(BaseModel):
    """Database record for royalty_events table."""
    id: str
    track_id: str
    event_type: str
    similarity: float
    amount: float
    created_at: str
    metadata: Dict[str, Any] = {}


def get_supabase_client():
    """
    Initialize and return Supabase client.
    
    Requires environment variables:
    - SUPABASE_URL: Supabase project URL
    - SUPABASE_KEY: Supabase service role key (not anon key)
    
    Returns:
        Supabase client instance
    
    Raises:
        ValueError: If required environment variables are missing
    """
    try:
        from supabase import create_client, Client
        
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        
        if not url or not key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_KEY environment variables must be set"
            )
        
        client: Client = create_client(url, key)
        return client
    
    except ImportError:
        raise ImportError(
            "Supabase client not installed. Run: pip install supabase"
        )


def get_db_connection():
    """
    Get database connection (alias for get_supabase_client for compatibility).
    
    Returns:
        Supabase client instance
    """
    return get_supabase_client()


async def get_db() -> AsyncGenerator:
    """
    FastAPI dependency for database access.
    
    Yields:
        Async database session
    
    Note:
        This is a stub for security tests. In production, this would
        return a SQLAlchemy AsyncSession or similar.
    """
    # For now, just yield None since we're using Supabase client directly
    # In production with SQLAlchemy, this would be:
    # async with AsyncSession() as session:
    #     yield session
    yield None


def insert_results(
    matches: List[Match],
    source_file: str,
    user_id: Optional[str] = None
) -> List[ResultRecord]:
    """
    Insert attribution results into Supabase results table.
    
    Per PRD Section 5.3: Reports matches back to Supabase `results` table.
    
    Args:
        matches: List of Match objects from attribution comparison
        source_file: Name of the uploaded/compared audio file
        user_id: Optional user ID for tracking
    
    Returns:
        List[ResultRecord]: Inserted database records
    
    Raises:
        Exception: If database insertion fails
    
    Database schema (results table):
        - id: UUID (primary key)
        - track_id: VARCHAR (foreign key to tracks.id)
        - source_file: VARCHAR
        - similarity: FLOAT
        - percent_influence: FLOAT
        - created_at: TIMESTAMP
        - user_id: UUID (optional)
        - metadata: JSONB
    """
    try:
        client = get_supabase_client()
        
        # Prepare records for insertion
        records = []
        for match in matches:
            record = {
                "id": str(uuid.uuid4()),
                "track_id": match.track_id,
                "source_file": source_file,
                "similarity": match.similarity,
                "percent_influence": match.percent_influence,
                "created_at": datetime.utcnow().isoformat(),
                "metadata": {
                    "track_title": match.track_title,
                    "artist": match.artist
                }
            }
            
            if user_id:
                record["user_id"] = user_id
            
            records.append(record)
        
        # Insert into Supabase
        response = client.table("results").insert(records).execute()
        
        # Convert to ResultRecord objects
        result_records = []
        for data in response.data:
            result_records.append(ResultRecord(
                id=data["id"],
                track_id=data["track_id"],
                source_file=data["source_file"],
                similarity=data["similarity"],
                percent_influence=data["percent_influence"],
                created_at=data["created_at"],
                metadata=data.get("metadata", {})
            ))
        
        return result_records
    
    except Exception as e:
        # Log error but don't fail the entire comparison
        print(f"Error inserting results to Supabase: {str(e)}")
        # Return empty list if insertion fails
        return []


def trigger_royalty_event(
    match: Match,
    event_type: str = "attribution_detected",
    threshold: float = 0.85
) -> Optional[RoyaltyEvent]:
    """
    Trigger a royalty event for high-similarity matches.
    
    Per PRD Section 5.4: Generates royalty events only when SDK log + auditor detection agree.
    Per PRD Section 3: Issue royalty events only when both proofs align.
    
    Args:
        match: Match object with similarity score
        event_type: Type of event (default: 'attribution_detected')
        threshold: Minimum similarity threshold to trigger event (default: 0.85)
    
    Returns:
        RoyaltyEvent if created, None if below threshold
    
    Note:
        In production, this should verify SDK log exists before creating event.
        Current implementation creates placeholder event for auditor-detected matches.
    
    Database schema (royalty_events table):
        - id: UUID (primary key)
        - track_id: VARCHAR (foreign key to tracks.id)
        - event_type: VARCHAR
        - similarity: FLOAT
        - amount: FLOAT
        - created_at: TIMESTAMP
        - metadata: JSONB
    """
    # Check if similarity exceeds threshold
    if match.similarity < threshold:
        print(f"Match similarity {match.similarity} below threshold {threshold}, skipping royalty event")
        return None
    
    try:
        client = get_supabase_client()
        
        # Calculate payout amount (placeholder logic)
        # Per PRD Section 5.4: Calculate payout weight based on similarity %, duration, and model type
        base_amount = 10.0  # Base amount in USD
        amount = base_amount * match.similarity * match.percent_influence
        
        # Create royalty event record
        event_record = {
            "id": str(uuid.uuid4()),
            "track_id": match.track_id,
            "event_type": event_type,
            "similarity": match.similarity,
            "amount": round(amount, 2),
            "created_at": datetime.utcnow().isoformat(),
            "metadata": {
                "track_title": match.track_title,
                "artist": match.artist,
                "percent_influence": match.percent_influence,
                "threshold": threshold,
                "note": "Placeholder event - requires SDK log verification for payout"
            }
        }
        
        # Insert into Supabase
        response = client.table("royalty_events").insert(event_record).execute()
        
        if response.data:
            data = response.data[0]
            print(f"✅ Royalty event created for {match.track_title} (${amount:.2f})")
            
            return RoyaltyEvent(
                id=data["id"],
                track_id=data["track_id"],
                event_type=data["event_type"],
                similarity=data["similarity"],
                amount=data["amount"],
                created_at=data["created_at"],
                metadata=data.get("metadata", {})
            )
        
        return None
    
    except Exception as e:
        # Log error but don't fail the comparison
        print(f"Error creating royalty event: {str(e)}")
        return None


def verify_sdk_log(track_id: str, timeframe_minutes: int = 60) -> bool:
    """
    Verify if an SDK use log exists for the given track.
    
    Per PRD Section 5.4: Generates royalty events only when SDK log + auditor detection agree.
    This implements the "dual proof" requirement.
    
    Args:
        track_id: Track ID to check for SDK logs
        timeframe_minutes: Time window to check for logs (default: 60 minutes)
    
    Returns:
        bool: True if SDK log found within timeframe, False otherwise
    
    Note:
        This is a placeholder implementation. In production, this would query
        the SDK logs table to verify that an AI company logged usage of this track.
    """
    try:
        client = get_supabase_client()
        
        # Calculate timeframe
        from datetime import timedelta
        cutoff_time = datetime.utcnow() - timedelta(minutes=timeframe_minutes)
        
        # Query sdk_logs table
        response = client.table("sdk_logs") \
            .select("*") \
            .eq("track_id", track_id) \
            .gte("created_at", cutoff_time.isoformat()) \
            .execute()
        
        return len(response.data) > 0
    
    except Exception as e:
        print(f"Error verifying SDK log: {str(e)}")
        # Return False if verification fails
        return False
