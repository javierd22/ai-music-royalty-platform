"""
Partner API Routes

Per PRD Section 5.2: Partner Platform
Provides endpoints for AI music generators to access compliance data and use slips
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
import json
import time
import uuid
from datetime import datetime

from ..utils.db import get_supabase_client
from ..utils.partner_auth import validate_api_key, check_rate_limit, log_partner_usage
from ..utils.manifest_validator import manifest_validator

router = APIRouter()
security = HTTPBearer()

class UseSlipResponse(BaseModel):
    id: str
    generator_id: str
    track_id: str
    start_time: str
    end_time: Optional[str]
    manifest_url: Optional[str]
    prompt: Optional[str]
    confidence: Optional[float]
    metadata: dict
    idempotency_key: str
    created_at: str
    updated_at: str
    track_title: Optional[str]
    manifest_valid: bool
    compliance_status: str

class ProvenanceStats(BaseModel):
    total_generations: int
    verified_generations: int
    verification_rate: float
    compliant_generations: int
    compliance_rate: float

class PartnerDashboardResponse(BaseModel):
    use_slips: List[UseSlipResponse]
    stats: ProvenanceStats
    total_pages: int
    current_page: int
    page_size: int

def validate_manifest(manifest_url: Optional[str]) -> bool:
    """
    Validate manifest JSON structure
    Per PRD Section 5.2: Manifest validation for compliance
    """
    if not manifest_url:
        return False
    
    try:
        # Use the manifest validator for proper validation
        validation_result = manifest_validator.validate_manifest(manifest_url)
        return validation_result['valid']
    except Exception:
        return False

def get_compliance_status(manifest_url: Optional[str], end_time: Optional[str]) -> str:
    """
    Determine compliance status based on manifest and completion
    Per PRD Section 5.2: Compliance indicators
    """
    if not manifest_url:
        return 'non_compliant'
    
    if not end_time:
        return 'pending'
    
    if validate_manifest(manifest_url):
        return 'compliant'
    
    return 'non_compliant'

async def verify_partner_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verify partner API key authentication
    Per PRD Section 5.2: Partner authentication
    """
    if not credentials.credentials:
        raise HTTPException(status_code=401, detail="Missing API key")
    
    # Validate API key
    partner_info = await validate_api_key(credentials.credentials)
    if not partner_info:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Check rate limit
    if not await check_rate_limit(partner_info['partner_id'], "partner_dashboard"):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    return partner_info

@router.get("/partner/dashboard", response_model=PartnerDashboardResponse)
async def get_partner_dashboard(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    generator_id: Optional[str] = Query(None, description="Filter by generator ID"),
    partner_info: dict = Depends(verify_partner_auth)
):
    """
    Get partner dashboard data with use slips and provenance statistics
    Per PRD Section 5.2: Partner Platform - compliance status and usage analytics
    """
    start_time = time.time()
    try:
        supabase = get_supabase_client()
        
        # Build query with optional generator filter
        query = supabase.from_('generation_logs').select("""
            *,
            tracks!inner(title)
        """)
        
        if generator_id:
            query = query.eq('generator_id', generator_id)
        
        # Get total count for pagination
        count_query = query.select('*', count='exact')
        count_result = count_query.execute()
        total_count = count_result.count or 0
        
        # Calculate pagination
        total_pages = (total_count + page_size - 1) // page_size
        offset = (page - 1) * page_size
        
        # Fetch paginated results
        result = query.order('created_at', desc=True).range(offset, offset + page_size - 1).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="No generation logs found")
        
        # Process use slips
        use_slips = []
        for gen in result.data:
            track_title = gen.get('tracks', {}).get('title', 'Unknown Track') if gen.get('tracks') else 'Unknown Track'
            manifest_valid = validate_manifest(gen.get('manifest_url'))
            compliance_status = get_compliance_status(gen.get('manifest_url'), gen.get('end_time'))
            
            use_slip = UseSlipResponse(
                id=gen['id'],
                generator_id=gen['generator_id'],
                track_id=gen['track_id'],
                start_time=gen['start_time'],
                end_time=gen.get('end_time'),
                manifest_url=gen.get('manifest_url'),
                prompt=gen.get('prompt'),
                confidence=gen.get('confidence'),
                metadata=gen.get('metadata', {}),
                idempotency_key=gen['idempotency_key'],
                created_at=gen['created_at'],
                updated_at=gen['updated_at'],
                track_title=track_title,
                manifest_valid=manifest_valid,
                compliance_status=compliance_status
            )
            use_slips.append(use_slip)
        
        # Calculate provenance statistics
        # Total generations
        total_gens = total_count
        
        # Verified generations (with manifest)
        verified_result = supabase.from_('generation_logs').select('*', count='exact')
        if generator_id:
            verified_result = verified_result.eq('generator_id', generator_id)
        verified_result = verified_result.not_('manifest_url', 'is', None).execute()
        verified_gens = verified_result.count or 0
        
        # Compliant generations (with valid manifest and completed)
        compliant_result = supabase.from_('generation_logs').select('*', count='exact')
        if generator_id:
            compliant_result = compliant_result.eq('generator_id', generator_id)
        compliant_result = compliant_result.not_('manifest_url', 'is', None).not_('end_time', 'is', None).execute()
        compliant_gens = compliant_result.count or 0
        
        # Calculate rates
        verification_rate = (verified_gens / total_gens * 100) if total_gens > 0 else 0
        compliance_rate = (compliant_gens / total_gens * 100) if total_gens > 0 else 0
        
        stats = ProvenanceStats(
            total_generations=total_gens,
            verified_generations=verified_gens,
            verification_rate=round(verification_rate, 2),
            compliant_generations=compliant_gens,
            compliance_rate=round(compliance_rate, 2)
        )
        
        response = PartnerDashboardResponse(
            use_slips=use_slips,
            stats=stats,
            total_pages=total_pages,
            current_page=page,
            page_size=page_size
        )
        
        # Log usage
        response_time_ms = int((time.time() - start_time) * 1000)
        await log_partner_usage(
            partner_info['partner_id'],
            "/partner/dashboard",
            "GET",
            200,
            response_time_ms
        )
        
        return response
        
    except Exception as e:
        print(f"Error in get_partner_dashboard: {e}")
        
        # Log error
        response_time_ms = int((time.time() - start_time) * 1000)
        await log_partner_usage(
            partner_info['partner_id'],
            "/partner/dashboard",
            "GET",
            500,
            response_time_ms
        )
        
        raise HTTPException(status_code=500, detail="Failed to fetch partner dashboard data")

@router.get("/partner/stats", response_model=ProvenanceStats)
async def get_provenance_stats(
    generator_id: Optional[str] = Query(None, description="Filter by generator ID"),
    partner_info: dict = Depends(verify_partner_auth)
):
    """
    Get provenance verification statistics
    Per PRD Section 5.2: Usage analytics and compliance metrics
    """
    try:
        supabase = get_supabase_client()
        
        # Build base query
        base_query = supabase.from_('generation_logs')
        if generator_id:
            base_query = base_query.eq('generator_id', generator_id)
        
        # Total generations
        total_result = base_query.select('*', count='exact').execute()
        total_gens = total_result.count or 0
        
        # Verified generations (with manifest)
        verified_result = base_query.select('*', count='exact').not_('manifest_url', 'is', None).execute()
        verified_gens = verified_result.count or 0
        
        # Compliant generations (with valid manifest and completed)
        compliant_result = base_query.select('*', count='exact').not_('manifest_url', 'is', None).not_('end_time', 'is', None).execute()
        compliant_gens = compliant_result.count or 0
        
        # Calculate rates
        verification_rate = (verified_gens / total_gens * 100) if total_gens > 0 else 0
        compliance_rate = (compliant_gens / total_gens * 100) if total_gens > 0 else 0
        
        return ProvenanceStats(
            total_generations=total_gens,
            verified_generations=verified_gens,
            verification_rate=round(verification_rate, 2),
            compliant_generations=compliant_gens,
            compliance_rate=round(compliance_rate, 2)
        )
        
    except Exception as e:
        print(f"Error in get_provenance_stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch provenance statistics")

@router.get("/partner/manifest/{manifest_id}")
async def get_manifest_details(
    manifest_id: str,
    partner_info: dict = Depends(verify_partner_auth)
):
    """
    Get detailed manifest information and validation status
    Per PRD Section 5.2: Manifest verification and compliance indicators
    """
    try:
        supabase = get_supabase_client()
        
        # Find generation log by manifest URL or ID
        result = supabase.from_('generation_logs').select("""
            *,
            tracks!inner(title)
        """).or_(f'manifest_url.ilike.%{manifest_id}%,id.eq.{manifest_id}').execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Manifest not found")
        
        gen = result.data[0]
        manifest_url = gen.get('manifest_url')
        
        # Validate manifest using the validator
        validation_result = manifest_validator.validate_manifest(manifest_url)
        compliance_status = get_compliance_status(manifest_url, gen.get('end_time'))
        
        manifest_details = {
            "id": gen['id'],
            "generator_id": gen['generator_id'],
            "track_title": gen.get('tracks', {}).get('title', 'Unknown Track'),
            "manifest_url": manifest_url,
            "manifest_valid": validation_result['valid'],
            "compliance_status": compliance_status,
            "validation_score": validation_result['validation_score'],
            "validation_errors": validation_result['errors'],
            "validation_warnings": validation_result['warnings'],
            "created_at": gen['created_at']
        }
        
        return manifest_details
        
    except Exception as e:
        print(f"Error in get_manifest_details: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch manifest details")
