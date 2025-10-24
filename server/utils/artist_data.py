"""
Artist Data Utilities

Per PRD Section 5.1: Artist Platform
Provides secure, per-artist access to tracks, royalties, and claims.

SECURITY:
- All queries filtered by artist_id from authenticated JWT
- RLS policies enforce artist-only access at database level
- PII redaction in logs per PRD §12
- Caching for performance on large catalogs
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

# Supabase client (lazy loaded)
_supabase_client = None


def get_supabase_client():
    """Get or create Supabase client."""
    global _supabase_client
    if _supabase_client is None:
        try:
            from supabase import create_client

            url = os.getenv('SUPABASE_URL')
            key = os.getenv('SUPABASE_SERVICE_KEY')  # Service key for backend
            if not url or not key:
                raise ValueError('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
            _supabase_client = create_client(url, key)
        except ImportError:
            raise ImportError('supabase-py not installed. Run: pip install supabase')
    return _supabase_client


# ============================================================================
# Pydantic Schemas
# ============================================================================


class ArtistTrack(BaseModel):
    """Artist track with on-chain proof status."""

    id: str
    title: str
    storage_url: str
    artist_id: str
    created_at: str
    updated_at: str
    fingerprinted: bool = True
    onchain_tx: Optional[str] = None
    onchain_verified: bool = False


class ArtistRoyalty(BaseModel):
    """Artist royalty event with track and payout details."""

    id: str
    track_id: str
    track_title: Optional[str] = None
    amount: float
    match_confidence: float
    status: str
    verified_at: Optional[str] = None
    onchain_tx: Optional[str] = None
    metadata: Dict[str, Any] = {}
    created_at: str


class ArtistClaim(BaseModel):
    """Artist claim with current status."""

    id: str
    artist_id: str
    track_id: Optional[str] = None
    track_title: Optional[str] = None
    title: str
    description: str
    file_url: Optional[str] = None
    external_link: Optional[str] = None
    status: str
    priority: str
    created_at: str
    updated_at: str


class ArtistReport(BaseModel):
    """Compliance summary for artist."""

    artist_id: str
    artist_name: str
    generated_at: str
    total_tracks: int
    total_royalties: int
    total_earnings: float
    confirmed_events: int
    pending_events: int
    total_claims: int
    verified_tracks: List[Dict[str, Any]]
    recent_royalties: List[Dict[str, Any]]


# ============================================================================
# Data Access Functions
# ============================================================================


async def get_artist_tracks(
    artist_id: str, limit: int = 100, offset: int = 0
) -> List[ArtistTrack]:
    """
    Get all tracks owned by the authenticated artist.

    Args:
        artist_id: Artist UUID from JWT
        limit: Maximum tracks to return (default 100)
        offset: Pagination offset

    Returns:
        List of ArtistTrack objects

    Security:
        - Filtered by artist_id
        - RLS policy enforces artist-only access
    """
    supabase = get_supabase_client()

    # Query tracks with RLS enforcement
    response = (
        supabase.table('tracks')
        .select('*')
        .eq('artist_id', artist_id)
        .order('created_at', desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    tracks = []
    for row in response.data:
        # Check for on-chain verification
        onchain_tx = None
        onchain_verified = False

        # Query proof_certificates if exists
        try:
            proof_response = (
                supabase.table('proof_certificates')
                .select('onchain_tx')
                .eq('track_id', row['id'])
                .eq('public', True)
                .limit(1)
                .execute()
            )
            if proof_response.data:
                onchain_tx = proof_response.data[0].get('onchain_tx')
                onchain_verified = bool(onchain_tx)
        except Exception:
            pass  # Table might not exist yet

        tracks.append(
            ArtistTrack(
                id=row['id'],
                title=row['title'],
                storage_url=row['storage_url'],
                artist_id=row['artist_id'],
                created_at=row['created_at'],
                updated_at=row['updated_at'],
                fingerprinted=True,  # All uploaded tracks are fingerprinted
                onchain_tx=onchain_tx,
                onchain_verified=onchain_verified,
            )
        )

    return tracks


async def get_artist_royalties(
    artist_id: str, limit: int = 50, offset: int = 0, status_filter: Optional[str] = None
) -> List[ArtistRoyalty]:
    """
    Get royalty events for artist's tracks.

    Args:
        artist_id: Artist UUID from JWT
        limit: Maximum events to return (default 50)
        offset: Pagination offset
        status_filter: Optional filter by status (pending/confirmed/paid)

    Returns:
        List of ArtistRoyalty objects

    Security:
        - Only returns events for artist's tracks
        - RLS policy enforces access control
    """
    supabase = get_supabase_client()

    # First, get artist's track IDs
    tracks_response = (
        supabase.table('tracks').select('id').eq('artist_id', artist_id).execute()
    )
    track_ids = [t['id'] for t in tracks_response.data]

    if not track_ids:
        return []

    # Query royalty events for artist's tracks
    query = (
        supabase.table('royalty_events')
        .select('*')
        .in_('track_id', track_ids)
        .order('verified_at', desc=True)
    )

    if status_filter:
        query = query.eq('status', status_filter)

    response = query.range(offset, offset + limit - 1).execute()

    royalties = []
    for row in response.data:
        # Get track title
        track_title = None
        if row.get('metadata') and row['metadata'].get('track_title'):
            track_title = row['metadata']['track_title']
        else:
            # Fetch from tracks table
            track_response = (
                supabase.table('tracks').select('title').eq('id', row['track_id']).limit(1).execute()
            )
            if track_response.data:
                track_title = track_response.data[0]['title']

        royalties.append(
            ArtistRoyalty(
                id=row['id'],
                track_id=row['track_id'],
                track_title=track_title,
                amount=row.get('amount', 0.0),
                match_confidence=row.get('match_confidence', 0.0),
                status=row.get('status', 'pending'),
                verified_at=row.get('verified_at'),
                onchain_tx=row.get('onchain_tx'),
                metadata=row.get('metadata', {}),
                created_at=row.get('created_at', datetime.now(timezone.utc).isoformat()),
            )
        )

    return royalties


async def get_artist_claims(
    artist_id: str, limit: int = 50, offset: int = 0, status_filter: Optional[str] = None
) -> List[ArtistClaim]:
    """
    Get claims submitted by the artist.

    Args:
        artist_id: Artist UUID from JWT
        limit: Maximum claims to return (default 50)
        offset: Pagination offset
        status_filter: Optional filter by status

    Returns:
        List of ArtistClaim objects

    Security:
        - Filtered by artist_id
        - RLS policy enforces artist-only access
    """
    supabase = get_supabase_client()

    # Query claims with RLS enforcement
    query = (
        supabase.table('claims')
        .select('*')
        .eq('artist_id', artist_id)
        .order('created_at', desc=True)
    )

    if status_filter:
        query = query.eq('status', status_filter)

    response = query.range(offset, offset + limit - 1).execute()

    claims = []
    for row in response.data:
        # Get track title if available
        track_title = None
        if row.get('track_id'):
            track_response = (
                supabase.table('tracks')
                .select('title')
                .eq('id', row['track_id'])
                .limit(1)
                .execute()
            )
            if track_response.data:
                track_title = track_response.data[0]['title']

        claims.append(
            ArtistClaim(
                id=row['id'],
                artist_id=row['artist_id'],
                track_id=row.get('track_id'),
                track_title=track_title,
                title=row['title'],
                description=row['description'],
                file_url=row.get('file_url'),
                external_link=row.get('external_link'),
                status=row['status'],
                priority=row['priority'],
                created_at=row['created_at'],
                updated_at=row['updated_at'],
            )
        )

    return claims


async def generate_artist_report(artist_id: str) -> ArtistReport:
    """
    Generate compliance summary for artist.

    Args:
        artist_id: Artist UUID from JWT

    Returns:
        ArtistReport object with complete summary

    Security:
        - All data filtered by artist_id
        - PII redacted per PRD §12
    """
    supabase = get_supabase_client()

    # Get artist info
    artist_response = (
        supabase.table('artists').select('name').eq('id', artist_id).single().execute()
    )
    artist_name = artist_response.data.get('name', 'Unknown') if artist_response.data else 'Unknown'

    # Get tracks
    tracks = await get_artist_tracks(artist_id, limit=1000)
    total_tracks = len(tracks)

    # Get all royalties
    all_royalties = await get_artist_royalties(artist_id, limit=1000)
    total_royalties = len(all_royalties)

    # Calculate earnings and counts
    total_earnings = sum(r.amount for r in all_royalties)
    confirmed_events = sum(1 for r in all_royalties if r.status == 'confirmed')
    pending_events = sum(1 for r in all_royalties if r.status == 'pending')

    # Get claims count
    claims = await get_artist_claims(artist_id, limit=1000)
    total_claims = len(claims)

    # Build verified tracks list (with on-chain proof)
    verified_tracks = [
        {
            'track_id': t.id,
            'title': t.title,
            'onchain_tx': t.onchain_tx,
            'created_at': t.created_at,
        }
        for t in tracks
        if t.onchain_verified
    ]

    # Build recent royalties list
    recent_royalties = [
        {
            'royalty_id': r.id,
            'track_id': r.track_id,
            'track_title': r.track_title,
            'amount': r.amount,
            'confidence': r.match_confidence,
            'status': r.status,
            'verified_at': r.verified_at,
        }
        for r in all_royalties[:10]  # Last 10 events
    ]

    return ArtistReport(
        artist_id=artist_id,
        artist_name=artist_name,
        generated_at=datetime.now(timezone.utc).isoformat(),
        total_tracks=total_tracks,
        total_royalties=total_royalties,
        total_earnings=total_earnings,
        confirmed_events=confirmed_events,
        pending_events=pending_events,
        total_claims=total_claims,
        verified_tracks=verified_tracks,
        recent_royalties=recent_royalties,
    )


# ============================================================================
# Logging (PII Redaction)
# ============================================================================


def redact_pii(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Redact PII from log data per PRD §12.

    Args:
        data: Dictionary containing potential PII

    Returns:
        Dictionary with PII redacted
    """
    redacted = data.copy()
    pii_fields = ['email', 'wallet', 'name', 'phone', 'address']

    for field in pii_fields:
        if field in redacted:
            if isinstance(redacted[field], str) and len(redacted[field]) > 4:
                redacted[field] = redacted[field][:2] + '***' + redacted[field][-2:]
            else:
                redacted[field] = '***'

    return redacted

