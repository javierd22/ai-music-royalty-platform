"""
Partner Authentication Utilities

Per PRD Section 5.2: Partner Platform
Handles API key generation, validation, and rate limiting for AI music generators
"""

import hashlib
import secrets
import time
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

from ..utils.db import get_supabase_client

class PartnerAuthError(Exception):
    """Custom exception for partner authentication errors"""
    pass

def generate_api_key() -> str:
    """
    Generate a new API key for partner authentication
    Per PRD Section 5.2: Secure key management
    """
    # Generate 32 random bytes and encode as hex
    random_bytes = secrets.token_bytes(32)
    api_key = f"ak_{random_bytes.hex()}"
    return api_key

def hash_api_key(api_key: str) -> str:
    """
    Hash API key for secure storage
    Per PRD Section 5.2: Security - API key hashing
    """
    return hashlib.sha256(api_key.encode()).hexdigest()

def get_api_key_prefix(api_key: str) -> str:
    """
    Get first 8 characters of API key for identification
    Per PRD Section 5.2: Key identification without exposing full key
    """
    return api_key[:8] if len(api_key) >= 8 else api_key

async def validate_api_key(api_key: str) -> Optional[Dict[str, Any]]:
    """
    Validate API key and return partner information
    Per PRD Section 5.2: Partner authentication
    """
    try:
        supabase = get_supabase_client()
        
        # Hash the provided API key
        api_key_hash = hash_api_key(api_key)
        
        # Query partner by hashed API key
        result = supabase.from_('partners').select(
            'id, name, rate_limit_per_minute, is_active, allowed_ips'
        ).eq('api_key_hash', api_key_hash).eq('is_active', True).execute()
        
        if not result.data:
            return None
        
        partner = result.data[0]
        return {
            'partner_id': partner['id'],
            'partner_name': partner['name'],
            'rate_limit_per_minute': partner['rate_limit_per_minute'],
            'is_active': partner['is_active'],
            'allowed_ips': partner.get('allowed_ips', [])
        }
        
    except Exception as e:
        print(f"Error validating API key: {e}")
        return None

async def check_rate_limit(partner_id: str, endpoint: str) -> bool:
    """
    Check if partner is within rate limits
    Per PRD Section 5.2: Rate limiting (60 req/min per partner)
    """
    try:
        supabase = get_supabase_client()
        
        # Get partner rate limit
        partner_result = supabase.from_('partners').select('rate_limit_per_minute').eq('id', partner_id).execute()
        
        if not partner_result.data:
            return False
        
        rate_limit = partner_result.data[0]['rate_limit_per_minute']
        
        # Count requests in the last minute
        one_minute_ago = datetime.utcnow() - timedelta(minutes=1)
        
        usage_result = supabase.from_('partner_usage_logs').select('id', count='exact').eq(
            'partner_id', partner_id
        ).gte('created_at', one_minute_ago.isoformat()).execute()
        
        current_usage = usage_result.count or 0
        
        return current_usage < rate_limit
        
    except Exception as e:
        print(f"Error checking rate limit: {e}")
        return False

async def log_partner_usage(
    partner_id: str,
    endpoint: str,
    method: str,
    status_code: int,
    response_time_ms: int,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> None:
    """
    Log partner API usage for monitoring and rate limiting
    Per PRD Section 5.2: Usage analytics and monitoring
    """
    try:
        supabase = get_supabase_client()
        
        # Insert usage log
        supabase.from_('partner_usage_logs').insert({
            'partner_id': partner_id,
            'endpoint': endpoint,
            'method': method,
            'status_code': status_code,
            'response_time_ms': response_time_ms,
            'ip_address': ip_address,
            'user_agent': user_agent
        }).execute()
        
        # Update partner last_used_at
        supabase.from_('partners').update({
            'last_used_at': datetime.utcnow().isoformat()
        }).eq('id', partner_id).execute()
        
    except Exception as e:
        print(f"Error logging partner usage: {e}")

async def create_partner(
    name: str,
    description: Optional[str] = None,
    rate_limit_per_minute: int = 60,
    allowed_ips: Optional[list] = None,
    created_by: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a new partner with API key
    Per PRD Section 5.2: Partner onboarding
    """
    try:
        supabase = get_supabase_client()
        
        # Generate API key
        api_key = generate_api_key()
        api_key_hash = hash_api_key(api_key)
        api_key_prefix = get_api_key_prefix(api_key)
        
        # Create partner record
        partner_data = {
            'name': name,
            'description': description,
            'api_key_hash': api_key_hash,
            'api_key_prefix': api_key_prefix,
            'rate_limit_per_minute': rate_limit_per_minute,
            'allowed_ips': allowed_ips or [],
            'created_by': created_by
        }
        
        result = supabase.from_('partners').insert(partner_data).execute()
        
        if not result.data:
            raise PartnerAuthError("Failed to create partner")
        
        partner = result.data[0]
        
        # Create API key record
        supabase.from_('partner_api_keys').insert({
            'partner_id': partner['id'],
            'key_hash': api_key_hash,
            'key_prefix': api_key_prefix,
            'created_by': created_by
        }).execute()
        
        return {
            'partner_id': partner['id'],
            'name': partner['name'],
            'api_key': api_key,  # Only returned on creation
            'api_key_prefix': api_key_prefix,
            'rate_limit_per_minute': rate_limit_per_minute
        }
        
    except Exception as e:
        print(f"Error creating partner: {e}")
        raise PartnerAuthError(f"Failed to create partner: {str(e)}")

async def rotate_api_key(partner_id: str, created_by: Optional[str] = None) -> Dict[str, Any]:
    """
    Rotate API key for a partner
    Per PRD Section 5.2: Key rotation for security
    """
    try:
        supabase = get_supabase_client()
        
        # Generate new API key
        new_api_key = generate_api_key()
        new_api_key_hash = hash_api_key(new_api_key)
        new_api_key_prefix = get_api_key_prefix(new_api_key)
        
        # Deactivate old API keys
        supabase.from_('partner_api_keys').update({
            'is_active': False,
            'rotated_at': datetime.utcnow().isoformat()
        }).eq('partner_id', partner_id).eq('is_active', True).execute()
        
        # Create new API key record
        supabase.from_('partner_api_keys').insert({
            'partner_id': partner_id,
            'key_hash': new_api_key_hash,
            'key_prefix': new_api_key_prefix,
            'created_by': created_by
        }).execute()
        
        # Update partner with new key hash
        supabase.from_('partners').update({
            'api_key_hash': new_api_key_hash,
            'api_key_prefix': new_api_key_prefix,
            'updated_at': datetime.utcnow().isoformat()
        }).eq('id', partner_id).execute()
        
        return {
            'partner_id': partner_id,
            'new_api_key': new_api_key,  # Only returned on rotation
            'api_key_prefix': new_api_key_prefix
        }
        
    except Exception as e:
        print(f"Error rotating API key: {e}")
        raise PartnerAuthError(f"Failed to rotate API key: {str(e)}")

async def get_partner_stats(partner_id: str, days: int = 30) -> Dict[str, Any]:
    """
    Get partner usage statistics
    Per PRD Section 5.2: Usage analytics
    """
    try:
        supabase = get_supabase_client()
        
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get usage statistics
        usage_result = supabase.from_('partner_usage_logs').select(
            'endpoint, status_code, created_at'
        ).eq('partner_id', partner_id).gte(
            'created_at', start_date.isoformat()
        ).execute()
        
        if not usage_result.data:
            return {
                'total_requests': 0,
                'success_rate': 0,
                'endpoints': {},
                'daily_usage': []
            }
        
        # Process statistics
        total_requests = len(usage_result.data)
        successful_requests = len([r for r in usage_result.data if 200 <= r['status_code'] < 300])
        success_rate = (successful_requests / total_requests * 100) if total_requests > 0 else 0
        
        # Group by endpoint
        endpoints = {}
        for request in usage_result.data:
            endpoint = request['endpoint']
            if endpoint not in endpoints:
                endpoints[endpoint] = {'count': 0, 'success': 0}
            endpoints[endpoint]['count'] += 1
            if 200 <= request['status_code'] < 300:
                endpoints[endpoint]['success'] += 1
        
        return {
            'total_requests': total_requests,
            'success_rate': round(success_rate, 2),
            'endpoints': endpoints,
            'period_days': days
        }
        
    except Exception as e:
        print(f"Error getting partner stats: {e}")
        return {
            'total_requests': 0,
            'success_rate': 0,
            'endpoints': {},
            'error': str(e)
        }
