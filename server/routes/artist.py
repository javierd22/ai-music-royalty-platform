"""
Artist API Routes

Per PRD Section 5.1: Artist Platform
Provides secure, per-artist access to tracks, royalties, and claims.

ENDPOINTS:
- GET /artist/tracks - Returns all tracks owned by authenticated artist
- GET /artist/royalties - Returns royalty events for artist's tracks
- GET /artist/claims - Returns submitted claims
- GET /artist/reports - Generates compliance summary (JSON download)

SECURITY:
- All endpoints require valid artist JWT from Supabase Auth
- RLS policies enforce artist-only access at database level
- Rate limiting: 60 req/min per artist
- PII redaction in logs per PRD §12
"""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from server.middleware.auth import verify_artist_token
from server.utils.artist_data import (
    ArtistClaim,
    ArtistReport,
    ArtistRoyalty,
    ArtistTrack,
    generate_artist_report,
    get_artist_claims,
    get_artist_royalties,
    get_artist_tracks,
    redact_pii,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/artist', tags=['artist'])


# ============================================================================
# Response Models
# ============================================================================


class TracksResponse(BaseModel):
    """Response for GET /artist/tracks"""

    tracks: List[ArtistTrack]
    total: int
    page: int
    page_size: int


class RoyaltiesResponse(BaseModel):
    """Response for GET /artist/royalties"""

    royalties: List[ArtistRoyalty]
    total: int
    page: int
    page_size: int


class ClaimsResponse(BaseModel):
    """Response for GET /artist/claims"""

    claims: List[ArtistClaim]
    total: int
    page: int
    page_size: int


class ReportResponse(BaseModel):
    """Response for GET /artist/reports"""

    report: ArtistReport


# ============================================================================
# Routes
# ============================================================================


@router.get('/tracks', response_model=TracksResponse)
async def get_tracks(
    request: Request,
    page: int = Query(1, ge=1, description='Page number (1-indexed)'),
    page_size: int = Query(50, ge=1, le=100, description='Items per page'),
    artist_id: str = Depends(verify_artist_token),
):
    """
    Get all tracks owned by the authenticated artist.

    **Security:**
    - Requires valid artist JWT token
    - RLS policy enforces artist-only access
    - Rate limit: 60 req/min

    **Returns:**
    - List of tracks with on-chain proof status
    - Pagination metadata

    **Per PRD §5.1:** Track Upload & Fingerprinting dashboard
    """
    try:
        offset = (page - 1) * page_size

        # Log request (with PII redaction)
        logger.info(
            'Artist tracks request',
            extra=redact_pii({'artist_id': artist_id, 'page': page, 'page_size': page_size}),
        )

        # Get tracks from database
        tracks = await get_artist_tracks(artist_id, limit=page_size, offset=offset)

        # Get total count (for pagination)
        # In production, you'd query the count separately for efficiency
        all_tracks = await get_artist_tracks(artist_id, limit=10000)
        total = len(all_tracks)

        return TracksResponse(
            tracks=tracks,
            total=total,
            page=page,
            page_size=page_size,
        )

    except Exception as e:
        logger.error(f'Error fetching artist tracks: {e}')
        raise HTTPException(status_code=500, detail='Failed to fetch tracks')


@router.get('/royalties', response_model=RoyaltiesResponse)
async def get_royalties(
    request: Request,
    page: int = Query(1, ge=1, description='Page number (1-indexed)'),
    page_size: int = Query(50, ge=1, le=100, description='Items per page'),
    status: Optional[str] = Query(None, description='Filter by status (pending/confirmed/paid)'),
    artist_id: str = Depends(verify_artist_token),
):
    """
    Get royalty events for artist's tracks.

    **Security:**
    - Requires valid artist JWT token
    - Only returns events for artist's tracks
    - RLS policy enforces access control

    **Filters:**
    - status: pending, confirmed, paid

    **Returns:**
    - List of royalty events with track details
    - Dual proof status (SDK + Auditor)
    - On-chain verification status

    **Per PRD §5.4:** Royalty Event Engine with dual proof
    """
    try:
        offset = (page - 1) * page_size

        # Log request (with PII redaction)
        logger.info(
            'Artist royalties request',
            extra=redact_pii(
                {'artist_id': artist_id, 'page': page, 'status': status, 'page_size': page_size}
            ),
        )

        # Get royalties from database
        royalties = await get_artist_royalties(
            artist_id, limit=page_size, offset=offset, status_filter=status
        )

        # Get total count
        all_royalties = await get_artist_royalties(artist_id, limit=10000, status_filter=status)
        total = len(all_royalties)

        return RoyaltiesResponse(
            royalties=royalties,
            total=total,
            page=page,
            page_size=page_size,
        )

    except Exception as e:
        logger.error(f'Error fetching artist royalties: {e}')
        raise HTTPException(status_code=500, detail='Failed to fetch royalties')


@router.get('/claims', response_model=ClaimsResponse)
async def get_claims(
    request: Request,
    page: int = Query(1, ge=1, description='Page number (1-indexed)'),
    page_size: int = Query(50, ge=1, le=100, description='Items per page'),
    status: Optional[str] = Query(
        None, description='Filter by status (pending/investigating/confirmed/rejected/resolved)'
    ),
    artist_id: str = Depends(verify_artist_token),
):
    """
    Get claims submitted by the artist.

    **Security:**
    - Requires valid artist JWT token
    - RLS policy enforces artist-only access

    **Filters:**
    - status: pending, investigating, confirmed, rejected, resolved

    **Returns:**
    - List of claims with current status
    - Related track information
    - Priority levels

    **Per PRD §5.1:** Claims Center for reporting unauthorized AI use
    """
    try:
        offset = (page - 1) * page_size

        # Log request (with PII redaction)
        logger.info(
            'Artist claims request',
            extra=redact_pii(
                {'artist_id': artist_id, 'page': page, 'status': status, 'page_size': page_size}
            ),
        )

        # Get claims from database
        claims = await get_artist_claims(
            artist_id, limit=page_size, offset=offset, status_filter=status
        )

        # Get total count
        all_claims = await get_artist_claims(artist_id, limit=10000, status_filter=status)
        total = len(all_claims)

        return ClaimsResponse(
            claims=claims,
            total=total,
            page=page,
            page_size=page_size,
        )

    except Exception as e:
        logger.error(f'Error fetching artist claims: {e}')
        raise HTTPException(status_code=500, detail='Failed to fetch claims')


@router.get('/reports', response_model=ReportResponse)
async def get_report(
    request: Request,
    artist_id: str = Depends(verify_artist_token),
):
    """
    Generate compliance summary for artist (JSON download).

    **Security:**
    - Requires valid artist JWT token
    - All data filtered by artist_id
    - PII redacted per PRD §12

    **Returns:**
    - Complete summary with:
      - Total tracks, royalties, earnings
      - Confirmed vs pending events
      - Total claims
      - Verified tracks (on-chain)
      - Recent royalties

    **Per PRD §5.6:** Compliance Layer - audit trail and verification
    """
    try:
        # Log request (with PII redaction)
        logger.info('Artist report request', extra=redact_pii({'artist_id': artist_id}))

        # Generate report
        report = await generate_artist_report(artist_id)

        return ReportResponse(report=report)

    except Exception as e:
        logger.error(f'Error generating artist report: {e}')
        raise HTTPException(status_code=500, detail='Failed to generate report')


# ============================================================================
# Health Check
# ============================================================================


@router.get('/royalties/unpaid')
async def get_unpaid_royalties(
    request: Request,
    artist_id: str = Depends(verify_artist_token),
):
    """
    Get unpaid royalty events for the authenticated artist.
    
    **Security:**
    - Requires valid artist JWT token
    - Returns only artist's own unpaid royalties
    - RLS enforced at database level
    
    **Returns:**
    - List of unpaid royalty events with details
    - Total unpaid amount
    - Event metadata for payout preview
    """
    try:
        from server.utils.db import get_db_connection
        from sqlalchemy import text
        
        async with get_db_connection() as conn:
            query = text("""
                SELECT 
                    re.id,
                    re.track_id,
                    re.amount,
                    re.similarity,
                    re.verified_at,
                    re.metadata,
                    t.title as track_title,
                    t.artist_name
                FROM royalty_events re
                JOIN tracks t ON re.track_id = t.id
                WHERE t.artist_id = :artist_id
                AND re.status = 'pending'
                AND re.paid_at IS NULL
                ORDER BY re.verified_at DESC
            """)
            
            result = await conn.execute(query, {"artist_id": artist_id})
            events = result.fetchall()
            
            # Calculate totals
            total_amount_cents = sum(int(event.amount * 100) for event in events)
            total_amount_usd = total_amount_cents / 100
            
            # Format events for response
            formatted_events = []
            for event in events:
                formatted_events.append({
                    "event_id": str(event.id),
                    "track_id": event.track_id,
                    "track_title": event.track_title,
                    "artist_name": event.artist_name,
                    "amount_cents": int(event.amount * 100),
                    "amount_usd": event.amount,
                    "similarity": event.similarity,
                    "verified_at": event.verified_at.isoformat() if event.verified_at else None,
                    "metadata": event.metadata or {}
                })
            
            return {
                "artist_id": artist_id,
                "total_unpaid_events": len(events),
                "total_amount_cents": total_amount_cents,
                "total_amount_usd": total_amount_usd,
                "events": formatted_events
            }
            
    except Exception as e:
        logger.error(f'Error fetching unpaid royalties: {e}')
        raise HTTPException(status_code=500, detail='Failed to fetch unpaid royalties')


@router.get('/payouts')
async def get_artist_payouts(
    request: Request,
    artist_id: str = Depends(verify_artist_token),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """
    Get payout history for the authenticated artist.
    
    **Security:**
    - Requires valid artist JWT token
    - Returns only artist's own payouts
    - RLS enforced at database level
    
    **Returns:**
    - List of payouts with pagination
    - Payout status and transaction details
    - Total amounts and item counts
    """
    try:
        from server.utils.db import get_db_connection
        from sqlalchemy import text
        
        async with get_db_connection() as conn:
            # Get payouts with pagination
            query = text("""
                SELECT 
                    p.id,
                    p.amount_cents,
                    p.tx_hash,
                    p.demo,
                    p.status,
                    p.created_at,
                    p.completed_at,
                    COUNT(pi.id) as item_count
                FROM payouts p
                LEFT JOIN payout_items pi ON p.id = pi.payout_id
                WHERE p.artist_id = :artist_id
                GROUP BY p.id, p.amount_cents, p.tx_hash, p.demo, p.status, p.created_at, p.completed_at
                ORDER BY p.created_at DESC
                LIMIT :limit OFFSET :offset
            """)
            
            result = await conn.execute(query, {
                "artist_id": artist_id,
                "limit": limit,
                "offset": offset
            })
            payouts = result.fetchall()
            
            # Get total count
            count_query = text("""
                SELECT COUNT(*) as total
                FROM payouts
                WHERE artist_id = :artist_id
            """)
            
            count_result = await conn.execute(count_query, {"artist_id": artist_id})
            total_count = count_result.fetchone().total
            
            # Format payouts for response
            formatted_payouts = []
            for payout in payouts:
                formatted_payouts.append({
                    "payout_id": str(payout.id),
                    "amount_cents": payout.amount_cents,
                    "amount_usd": payout.amount_cents / 100,
                    "tx_hash": payout.tx_hash,
                    "demo": payout.demo,
                    "status": payout.status,
                    "created_at": payout.created_at.isoformat(),
                    "completed_at": payout.completed_at.isoformat() if payout.completed_at else None,
                    "item_count": payout.item_count
                })
            
            return {
                "artist_id": artist_id,
                "payouts": formatted_payouts,
                "pagination": {
                    "total": total_count,
                    "limit": limit,
                    "offset": offset,
                    "has_more": offset + limit < total_count
                }
            }
            
    except Exception as e:
        logger.error(f'Error fetching artist payouts: {e}')
        raise HTTPException(status_code=500, detail='Failed to fetch payouts')


@router.get('/health')
async def health_check():
    """Health check endpoint for artist API."""
    return JSONResponse(
        content={'status': 'healthy', 'service': 'artist-api', 'version': '1.0.0'}
    )

