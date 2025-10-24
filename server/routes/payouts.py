"""
Payout Service API Routes

Per PRD Section 5.4: Royalty Event Engine - DEMO_MODE implementation
Provides end-to-end payout functionality with clean interfaces for future on-chain integration.

ENDPOINTS:
- GET  /payouts/preview?artist_id=...   → summarizes unpaid royalty_events
- POST /payouts/create {artist_id, event_ids[]} → creates payout and returns receipt
- GET  /payouts/receipt/{payout_id}    → returns payout receipt with details

SECURITY:
- All endpoints require authenticated artist and RLS checks
- Idempotency: prevent re-paying the same event_id
- Structured JSON logging with request_id, no PII
"""

from __future__ import annotations
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text

from server.middleware.auth import verify_artist_token
from server.utils.db import get_db_connection
from server.utils.chain import send_payout, PayoutRequest, PayoutResult

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payouts", tags=["payouts"])


# Pydantic Models
class PayoutPreview(BaseModel):
    """Preview of unpaid royalty events for an artist."""
    artist_id: str
    total_unpaid_events: int
    total_amount_cents: int
    total_amount_usd: float
    events: List[Dict[str, Any]]


class CreatePayoutRequest(BaseModel):
    """Request to create a new payout."""
    artist_id: str = Field(..., description="Artist ID")
    event_ids: List[str] = Field(..., description="List of royalty event IDs to pay")


class PayoutItem(BaseModel):
    """Individual item in a payout."""
    event_id: str
    amount_cents: int
    amount_usd: float


class PayoutReceipt(BaseModel):
    """Receipt for a completed payout."""
    payout_id: str
    artist_id: str
    total_amount_cents: int
    total_amount_usd: float
    tx_hash: str
    demo: bool
    status: str
    created_at: datetime
    items: List[PayoutItem]


@router.get("/preview")
async def get_payout_preview(
    artist_id: str = Query(..., description="Artist ID"),
    request: Request = None,
    current_user: dict = Depends(verify_artist_token)
) -> PayoutPreview:
    """
    Get preview of unpaid royalty events for an artist.
    
    Returns summary of all unpaid royalty events that can be included in a payout.
    """
    request_id = str(uuid.uuid4())
    
    # Verify artist can only access their own data
    if current_user["sub"] != artist_id:
        logger.warning(f"Unauthorized payout preview access attempt", extra={
            "request_id": request_id,
            "requested_artist_id": artist_id,
            "authenticated_user": current_user["sub"]
        })
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        async with get_db_connection() as conn:
            # Get unpaid royalty events for the artist
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
            
            preview = PayoutPreview(
                artist_id=artist_id,
                total_unpaid_events=len(events),
                total_amount_cents=total_amount_cents,
                total_amount_usd=total_amount_usd,
                events=formatted_events
            )
            
            logger.info(f"Payout preview generated", extra={
                "request_id": request_id,
                "artist_id": artist_id,
                "total_events": len(events),
                "total_amount_cents": total_amount_cents
            })
            
            return preview
            
    except Exception as e:
        logger.error(f"Error generating payout preview", extra={
            "request_id": request_id,
            "artist_id": artist_id,
            "error": str(e)
        })
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/create")
async def create_payout(
    request_data: CreatePayoutRequest,
    request: Request = None,
    current_user: dict = Depends(verify_artist_token)
) -> PayoutReceipt:
    """
    Create a new payout for specified royalty events.
    
    Validates RLS, calculates owed amount, creates payout record,
    and returns receipt with mock transaction hash.
    """
    request_id = str(uuid.uuid4())
    
    # Verify artist can only create payouts for themselves
    if current_user["sub"] != request_data.artist_id:
        logger.warning(f"Unauthorized payout creation attempt", extra={
            "request_id": request_id,
            "requested_artist_id": request_data.artist_id,
            "authenticated_user": current_user["sub"]
        })
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        async with get_db_connection() as conn:
            # Start transaction
            async with conn.begin():
                # Validate and get royalty events
                event_ids_str = "', '".join(request_data.event_ids)
                query = text(f"""
                    SELECT 
                        re.id,
                        re.track_id,
                        re.amount,
                        t.artist_id
                    FROM royalty_events re
                    JOIN tracks t ON re.track_id = t.id
                    WHERE re.id IN ('{event_ids_str}')
                    AND t.artist_id = :artist_id
                    AND re.status = 'pending'
                    AND re.paid_at IS NULL
                """)
                
                result = await conn.execute(query, {"artist_id": request_data.artist_id})
                events = result.fetchall()
                
                if len(events) != len(request_data.event_ids):
                    raise HTTPException(
                        status_code=400, 
                        detail="Some events not found, already paid, or not owned by artist"
                    )
                
                # Calculate total amount
                total_amount_cents = sum(int(event.amount * 100) for event in events)
                total_amount_usd = total_amount_cents / 100
                
                # Create payout record
                payout_id = str(uuid.uuid4())
                insert_payout = text("""
                    INSERT INTO payouts (id, artist_id, amount_cents, status, created_at)
                    VALUES (:id, :artist_id, :amount_cents, 'pending', :created_at)
                    RETURNING id, created_at
                """)
                
                result = await conn.execute(insert_payout, {
                    "id": payout_id,
                    "artist_id": request_data.artist_id,
                    "amount_cents": total_amount_cents,
                    "created_at": datetime.now(timezone.utc)
                })
                payout_record = result.fetchone()
                
                # Create payout items
                payout_items = []
                for event in events:
                    item_id = str(uuid.uuid4())
                    amount_cents = int(event.amount * 100)
                    
                    insert_item = text("""
                        INSERT INTO payout_items (id, payout_id, event_id, amount_cents, created_at)
                        VALUES (:id, :payout_id, :event_id, :amount_cents, :created_at)
                    """)
                    
                    await conn.execute(insert_item, {
                        "id": item_id,
                        "payout_id": payout_id,
                        "event_id": str(event.id),
                        "amount_cents": amount_cents,
                        "created_at": datetime.now(timezone.utc)
                    })
                    
                    payout_items.append(PayoutItem(
                        event_id=str(event.id),
                        amount_cents=amount_cents,
                        amount_usd=event.amount
                    ))
                
                # Send payout via chain abstraction
                payout_request = PayoutRequest(
                    artist_wallet=None,  # Demo mode - no wallet required
                    amount_cents=total_amount_cents,
                    event_ids=request_data.event_ids,
                    demo=True
                )
                
                payout_result = await send_payout(
                    artist_wallet=None,
                    amount_cents=total_amount_cents,
                    event_ids=request_data.event_ids,
                    demo=True
                )
                
                if not payout_result.success:
                    raise HTTPException(
                        status_code=500,
                        detail=f"Payout failed: {payout_result.error_message}"
                    )
                
                # Update payout with transaction hash and mark as completed
                update_payout = text("""
                    UPDATE payouts 
                    SET tx_hash = :tx_hash, 
                        demo = :demo,
                        status = 'completed',
                        completed_at = :completed_at
                    WHERE id = :payout_id
                """)
                
                await conn.execute(update_payout, {
                    "tx_hash": payout_result.tx_hash,
                    "demo": True,
                    "completed_at": datetime.now(timezone.utc),
                    "payout_id": payout_id
                })
                
                # Mark royalty events as paid
                update_events = text(f"""
                    UPDATE royalty_events 
                    SET paid_at = :paid_at, status = 'paid'
                    WHERE id IN ('{event_ids_str}')
                """)
                
                await conn.execute(update_events, {
                    "paid_at": datetime.now(timezone.utc)
                })
                
                # Create receipt
                receipt = PayoutReceipt(
                    payout_id=payout_id,
                    artist_id=request_data.artist_id,
                    total_amount_cents=total_amount_cents,
                    total_amount_usd=total_amount_usd,
                    tx_hash=payout_result.tx_hash,
                    demo=True,
                    status="completed",
                    created_at=payout_record.created_at,
                    items=payout_items
                )
                
                logger.info(f"Payout created successfully", extra={
                    "request_id": request_id,
                    "payout_id": payout_id,
                    "artist_id": request_data.artist_id,
                    "total_amount_cents": total_amount_cents,
                    "tx_hash": payout_result.tx_hash,
                    "event_count": len(request_data.event_ids)
                })
                
                return receipt
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating payout", extra={
            "request_id": request_id,
            "artist_id": request_data.artist_id,
            "error": str(e)
        })
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/receipt/{payout_id}")
async def get_payout_receipt(
    payout_id: str,
    request: Request = None,
    current_user: dict = Depends(verify_artist_token)
) -> PayoutReceipt:
    """
    Get receipt for a specific payout.
    
    Returns detailed receipt with transaction hash and itemized events.
    """
    request_id = str(uuid.uuid4())
    
    try:
        async with get_db_connection() as conn:
            # Get payout details
            query = text("""
                SELECT 
                    p.id,
                    p.artist_id,
                    p.amount_cents,
                    p.tx_hash,
                    p.demo,
                    p.status,
                    p.created_at,
                    p.completed_at
                FROM payouts p
                WHERE p.id = :payout_id
            """)
            
            result = await conn.execute(query, {"payout_id": payout_id})
            payout = result.fetchone()
            
            if not payout:
                raise HTTPException(status_code=404, detail="Payout not found")
            
            # Verify artist can only access their own payouts
            if current_user["sub"] != payout.artist_id:
                logger.warning(f"Unauthorized payout receipt access attempt", extra={
                    "request_id": request_id,
                    "payout_id": payout_id,
                    "authenticated_user": current_user["sub"],
                    "payout_artist": payout.artist_id
                })
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Get payout items
            items_query = text("""
                SELECT 
                    pi.event_id,
                    pi.amount_cents
                FROM payout_items pi
                WHERE pi.payout_id = :payout_id
                ORDER BY pi.created_at
            """)
            
            items_result = await conn.execute(items_query, {"payout_id": payout_id})
            items = items_result.fetchall()
            
            # Format items
            payout_items = []
            for item in items:
                payout_items.append(PayoutItem(
                    event_id=str(item.event_id),
                    amount_cents=item.amount_cents,
                    amount_usd=item.amount_cents / 100
                ))
            
            # Create receipt
            receipt = PayoutReceipt(
                payout_id=str(payout.id),
                artist_id=str(payout.artist_id),
                total_amount_cents=payout.amount_cents,
                total_amount_usd=payout.amount_cents / 100,
                tx_hash=payout.tx_hash or "",
                demo=payout.demo,
                status=payout.status,
                created_at=payout.created_at,
                items=payout_items
            )
            
            logger.info(f"Payout receipt retrieved", extra={
                "request_id": request_id,
                "payout_id": payout_id,
                "artist_id": payout.artist_id
            })
            
            return receipt
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving payout receipt", extra={
            "request_id": request_id,
            "payout_id": payout_id,
            "error": str(e)
        })
        raise HTTPException(status_code=500, detail="Internal server error")
