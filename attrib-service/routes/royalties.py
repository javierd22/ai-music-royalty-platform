from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from supabase import create_client
import os, time
from typing import Optional, List
from datetime import datetime, timedelta

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

router = APIRouter(prefix="", tags=["royalties"])

class SdkLogBody(BaseModel):
    model_id: str
    track_id: str
    session_type: str = Field(pattern="^(train|generate)$")
    started_at: datetime
    ended_at: Optional[datetime] = None
    raw: Optional[dict] = None

@router.post("/sdk/log")
def sdk_log(body: SdkLogBody):
    data = body.model_dump()
    res = sb.table("partner_logs").insert(data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="insert failed")
    return {"partner_log_id": res.data[0]["id"]}

class AuditorMatchBody(BaseModel):
    track_id: str
    output_id: str
    model_id: Optional[str] = None
    match_score: float
    phrase_seconds: Optional[List[int]] = None

@router.post("/auditor/match")
def auditor_match(body: AuditorMatchBody):
    data = body.model_dump()
    res = sb.table("auditor_matches").insert(data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="insert failed")
    return {"auditor_match_id": res.data[0]["id"]}

class FusionBody(BaseModel):
    partner_log_id: Optional[str] = None
    auditor_match_id: Optional[str] = None
    payable_score: float = 0.85
    window_hours: int = 24

def _load_row(table: str, id_: str):
    q = sb.table(table).select("*").eq("id", id_).limit(1).execute()
    return q.data[0] if q.data else None

@router.post("/fusion/verify")
def fusion_verify(body: FusionBody):
    partner = _load_row("partner_logs", body.partner_log_id) if body.partner_log_id else None
    auditor = _load_row("auditor_matches", body.auditor_match_id) if body.auditor_match_id else None

    # try to auto find counterpart if one side is missing but we have track
    if partner and not auditor:
        q = sb.table("auditor_matches") \
            .select("*") \
            .eq("track_id", partner["track_id"]) \
            .eq("model_id", partner["model_id"]) \
            .gte("detected_at", partner["started_at"]) \
            .execute()
        auditor = q.data[0] if q.data else None
    if auditor and not partner:
        # assume generate session near detected_at
        start_after = auditor["detected_at"]
        q = sb.table("partner_logs") \
            .select("*") \
            .eq("track_id", auditor["track_id"]) \
            .eq("model_id", auditor.get("model_id")) \
            .lte("started_at", auditor["detected_at"]) \
            .execute()
        partner = q.data[0] if q.data else None

    if not partner and not auditor:
        raise HTTPException(status_code=400, detail="no events to fuse")

    status = "pending"
    payable = False
    if partner and auditor:
        score = float(auditor["match_score"])
        if score >= body.payable_score:
            status, payable = "verified", True
        else:
            status, payable = "pending", False
    elif partner and not auditor:
        status, payable = "training_only", False
    elif auditor and not partner:
        status, payable = "suspected", False

    track_id = partner["track_id"] if partner else auditor["track_id"]
    model_id = partner["model_id"] if partner else auditor.get("model_id")

    insert = {
        "track_id": track_id,
        "model_id": model_id,
        "partner_log_id": partner["id"] if partner else None,
        "auditor_match_id": auditor["id"] if auditor else None,
        "status": status,
        "payable": payable,
        "amount_cents": 0
    }
    res = sb.table("royalty_events").insert(insert).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="failed to create royalty_event")
    return {"royalty_event_id": res.data[0]["id"], "status": status, "payable": payable}

class ClaimBody(BaseModel):
    royalty_event_id: str
    amount_cents: int

@router.post("/claims/create")
def claims_create(body: ClaimBody):
    ev = _load_row("royalty_events", body.royalty_event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="royalty event not found")
    track = _load_row("tracks", ev["track_id"])
    if not track:
        raise HTTPException(status_code=404, detail="track not found")
    distributor_id = track.get("distributor_id")
    # fetch artist for now assume single artist per track in results or attach later
    # placeholder: artist_id null
    claim = {
        "track_id": ev["track_id"],
        "artist_id": None,
        "distributor_id": distributor_id,
        "royalty_event_id": body.royalty_event_id,
        "amount_cents": body.amount_cents,
        "state": "ready"
    }
    res = sb.table("royalty_claims").insert(claim).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="failed to create claim")
    return {"claim_id": res.data[0]["id"], "route": "distributor" if distributor_id else "direct"}

class PayoutBody(BaseModel):
    claim_id: str

@router.post("/payouts/stripe")
def payouts_stripe(body: PayoutBody):
    # load claim
    q = sb.table("royalty_claims").select("*").eq("id", body.claim_id).limit(1).execute()
    if not q.data:
        raise HTTPException(status_code=404, detail="claim not found")
    claim = q.data[0]
    if claim.get("distributor_id"):
        raise HTTPException(status_code=400, detail="claim must route via distributor")
    # get artist stripe account
    # for alpha this is a placeholder. attach artist later.
    raise HTTPException(status_code=501, detail="connect artist and stripe before paying out")

class ProofBody(BaseModel):
    royalty_event_id: str
    make_public: bool = False

@router.post("/proof/certificate")
def proof_certificate(body: ProofBody):
    ev = _load_row("royalty_events", body.royalty_event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="royalty event not found")
    # build a simple verification hash string
    verification_hash = f"{ev['track_id']}|{ev['model_id']}|{ev['partner_log_id']}|{ev['auditor_match_id']}|{ev['payable']}"
    # on chain write is optional in alpha
    onchain_tx = "onchain-disabled"
    res = sb.table("proof_certificates").insert({
        "royalty_event_id": body.royalty_event_id,
        "public": body.make_public,
        "verification_hash": verification_hash
    }).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="failed to create certificate")
    return {"certificate_id": res.data[0]["id"], "onchain_tx": onchain_tx}