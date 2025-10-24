"""
Partner Admin Routes

Per PRD Section 5.2: Partner Platform
Admin endpoints for managing partners and API keys
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
import uuid

from ..utils.db import get_supabase_client
from ..utils.partner_auth import create_partner, rotate_api_key, get_partner_stats
from ..middleware.auth import get_admin_user

router = APIRouter()
security = HTTPBearer()

class CreatePartnerRequest(BaseModel):
    name: str
    description: Optional[str] = None
    rate_limit_per_minute: int = 60
    allowed_ips: Optional[List[str]] = None

class PartnerResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    api_key_prefix: str
    is_active: bool
    rate_limit_per_minute: int
    allowed_ips: List[str]
    created_at: str
    last_used_at: Optional[str]

class PartnerStatsResponse(BaseModel):
    partner_id: str
    partner_name: str
    total_requests: int
    success_rate: float
    endpoints: dict
    period_days: int

@router.post("/admin/partners", response_model=dict)
async def create_new_partner(
    request: CreatePartnerRequest,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Create a new partner with API key
    Per PRD Section 5.2: Partner onboarding
    """
    try:
        partner_data = await create_partner(
            name=request.name,
            description=request.description,
            rate_limit_per_minute=request.rate_limit_per_minute,
            allowed_ips=request.allowed_ips,
            created_by=admin_user['id']
        )
        
        return {
            "message": "Partner created successfully",
            "partner": partner_data
        }
        
    except Exception as e:
        print(f"Error creating partner: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create partner: {str(e)}")

@router.get("/admin/partners", response_model=List[PartnerResponse])
async def list_partners(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    admin_user: dict = Depends(get_admin_user)
):
    """
    List all partners with pagination
    Per PRD Section 5.2: Partner management
    """
    try:
        supabase = get_supabase_client()
        
        # Calculate offset
        offset = (page - 1) * page_size
        
        # Fetch partners
        result = supabase.from_('partners').select(
            'id, name, description, api_key_prefix, is_active, rate_limit_per_minute, allowed_ips, created_at, last_used_at'
        ).order('created_at', desc=True).range(offset, offset + page_size - 1).execute()
        
        if not result.data:
            return []
        
        partners = []
        for partner in result.data:
            partners.append(PartnerResponse(
                id=partner['id'],
                name=partner['name'],
                description=partner.get('description'),
                api_key_prefix=partner['api_key_prefix'],
                is_active=partner['is_active'],
                rate_limit_per_minute=partner['rate_limit_per_minute'],
                allowed_ips=partner.get('allowed_ips', []),
                created_at=partner['created_at'],
                last_used_at=partner.get('last_used_at')
            ))
        
        return partners
        
    except Exception as e:
        print(f"Error listing partners: {e}")
        raise HTTPException(status_code=500, detail="Failed to list partners")

@router.get("/admin/partners/{partner_id}", response_model=PartnerResponse)
async def get_partner(
    partner_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Get partner details by ID
    Per PRD Section 5.2: Partner management
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.from_('partners').select(
            'id, name, description, api_key_prefix, is_active, rate_limit_per_minute, allowed_ips, created_at, last_used_at'
        ).eq('id', partner_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Partner not found")
        
        partner = result.data[0]
        return PartnerResponse(
            id=partner['id'],
            name=partner['name'],
            description=partner.get('description'),
            api_key_prefix=partner['api_key_prefix'],
            is_active=partner['is_active'],
            rate_limit_per_minute=partner['rate_limit_per_minute'],
            allowed_ips=partner.get('allowed_ips', []),
            created_at=partner['created_at'],
            last_used_at=partner.get('last_used_at')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting partner: {e}")
        raise HTTPException(status_code=500, detail="Failed to get partner")

@router.post("/admin/partners/{partner_id}/rotate-key", response_model=dict)
async def rotate_partner_api_key(
    partner_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Rotate API key for a partner
    Per PRD Section 5.2: Key rotation for security
    """
    try:
        key_data = await rotate_api_key(partner_id, admin_user['id'])
        
        return {
            "message": "API key rotated successfully",
            "new_api_key": key_data['new_api_key'],
            "api_key_prefix": key_data['api_key_prefix']
        }
        
    except Exception as e:
        print(f"Error rotating API key: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to rotate API key: {str(e)}")

@router.put("/admin/partners/{partner_id}/toggle", response_model=dict)
async def toggle_partner_status(
    partner_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Toggle partner active status
    Per PRD Section 5.2: Partner management
    """
    try:
        supabase = get_supabase_client()
        
        # Get current status
        result = supabase.from_('partners').select('is_active').eq('id', partner_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Partner not found")
        
        current_status = result.data[0]['is_active']
        new_status = not current_status
        
        # Update status
        supabase.from_('partners').update({
            'is_active': new_status,
            'updated_at': 'now()'
        }).eq('id', partner_id).execute()
        
        return {
            "message": f"Partner {'activated' if new_status else 'deactivated'} successfully",
            "is_active": new_status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error toggling partner status: {e}")
        raise HTTPException(status_code=500, detail="Failed to toggle partner status")

@router.get("/admin/partners/{partner_id}/stats", response_model=PartnerStatsResponse)
async def get_partner_usage_stats(
    partner_id: str,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    admin_user: dict = Depends(get_admin_user)
):
    """
    Get partner usage statistics
    Per PRD Section 5.2: Usage analytics
    """
    try:
        # Get partner name
        supabase = get_supabase_client()
        partner_result = supabase.from_('partners').select('name').eq('id', partner_id).execute()
        
        if not partner_result.data:
            raise HTTPException(status_code=404, detail="Partner not found")
        
        partner_name = partner_result.data[0]['name']
        
        # Get usage stats
        stats = await get_partner_stats(partner_id, days)
        
        return PartnerStatsResponse(
            partner_id=partner_id,
            partner_name=partner_name,
            total_requests=stats['total_requests'],
            success_rate=stats['success_rate'],
            endpoints=stats['endpoints'],
            period_days=stats['period_days']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting partner stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get partner statistics")

@router.delete("/admin/partners/{partner_id}", response_model=dict)
async def delete_partner(
    partner_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Delete a partner (soft delete by deactivating)
    Per PRD Section 5.2: Partner management
    """
    try:
        supabase = get_supabase_client()
        
        # Check if partner exists
        result = supabase.from_('partners').select('id').eq('id', partner_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Partner not found")
        
        # Soft delete by deactivating
        supabase.from_('partners').update({
            'is_active': False,
            'updated_at': 'now()'
        }).eq('id', partner_id).execute()
        
        return {
            "message": "Partner deactivated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting partner: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete partner")
