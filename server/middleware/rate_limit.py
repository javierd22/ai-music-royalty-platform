"""
Rate Limiting Middleware

Per PRD Section 5.3: Attribution Engine
Implements rate limiting for attribution endpoints
"""

import time
from typing import Dict, Optional
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import asyncio

class RateLimiter:
    """
    Token bucket rate limiter
    Per PRD Section 5.3: Rate limiting for attribution endpoints
    """
    
    def __init__(self, requests_per_minute: int = 60, burst_size: int = 10):
        self.requests_per_minute = requests_per_minute
        self.burst_size = burst_size
        self.tokens_per_second = requests_per_minute / 60.0
        self.buckets: Dict[str, Dict[str, float]] = {}
        self.cleanup_interval = 300  # 5 minutes
        self.last_cleanup = time.time()
    
    def _cleanup_old_buckets(self) -> None:
        """
        Remove old rate limit buckets to prevent memory leaks
        Per PRD Section 5.3: Memory management
        """
        current_time = time.time()
        if current_time - self.last_cleanup > self.cleanup_interval:
            # Remove buckets older than 1 hour
            cutoff_time = current_time - 3600
            to_remove = [
                key for key, bucket in self.buckets.items()
                if bucket['last_used'] < cutoff_time
            ]
            for key in to_remove:
                del self.buckets[key]
            self.last_cleanup = current_time
    
    def _get_bucket(self, key: str) -> Dict[str, float]:
        """
        Get or create rate limit bucket for key
        Per PRD Section 5.3: Bucket management
        """
        if key not in self.buckets:
            self.buckets[key] = {
                'tokens': self.burst_size,
                'last_update': time.time(),
                'last_used': time.time()
            }
        return self.buckets[key]
    
    def _refill_tokens(self, bucket: Dict[str, float]) -> None:
        """
        Refill tokens based on elapsed time
        Per PRD Section 5.3: Token refill logic
        """
        current_time = time.time()
        elapsed = current_time - bucket['last_update']
        tokens_to_add = elapsed * self.tokens_per_second
        bucket['tokens'] = min(self.burst_size, bucket['tokens'] + tokens_to_add)
        bucket['last_update'] = current_time
    
    def is_allowed(self, key: str) -> tuple[bool, Dict[str, int]]:
        """
        Check if request is allowed and return rate limit info
        Per PRD Section 5.3: Rate limit checking
        """
        self._cleanup_old_buckets()
        
        bucket = self._get_bucket(key)
        self._refill_tokens(bucket)
        bucket['last_used'] = time.time()
        
        if bucket['tokens'] >= 1:
            bucket['tokens'] -= 1
            return True, {
                'limit': self.requests_per_minute,
                'remaining': int(bucket['tokens']),
                'reset_time': int(bucket['last_update'] + 60)
            }
        else:
            return False, {
                'limit': self.requests_per_minute,
                'remaining': 0,
                'reset_time': int(bucket['last_update'] + 60)
            }

# Global rate limiter instances
compare_rate_limiter = RateLimiter(requests_per_minute=30, burst_size=5)  # More restrictive for attribution
general_rate_limiter = RateLimiter(requests_per_minute=60, burst_size=10)  # General API rate limiting

def get_client_key(request: Request) -> str:
    """
    Extract client identifier for rate limiting
    Per PRD Section 5.3: Client identification
    """
    # Try to get API key from headers
    api_key = request.headers.get('x-api-key')
    if api_key:
        return f"api_key:{api_key[:8]}"  # Use first 8 chars for privacy
    
    # Try to get partner ID from headers
    partner_id = request.headers.get('x-partner-id')
    if partner_id:
        return f"partner:{partner_id}"
    
    # Fall back to IP address
    client_ip = request.client.host if request.client else "unknown"
    return f"ip:{client_ip}"

async def rate_limit_middleware(request: Request, call_next):
    """
    Rate limiting middleware for FastAPI
    Per PRD Section 5.3: Middleware implementation
    """
    # Skip rate limiting for health checks and docs
    if request.url.path in ['/health', '/docs', '/redoc', '/openapi.json']:
        return await call_next(request)
    
    # Determine which rate limiter to use
    if request.url.path.startswith('/compare'):
        rate_limiter = compare_rate_limiter
    else:
        rate_limiter = general_rate_limiter
    
    # Get client key
    client_key = get_client_key(request)
    
    # Check rate limit
    allowed, rate_info = rate_limiter.is_allowed(client_key)
    
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Rate limit exceeded. Too many requests.",
                "retry_after": rate_info['reset_time'] - int(time.time())
            },
            headers={
                "X-RateLimit-Limit": str(rate_info['limit']),
                "X-RateLimit-Remaining": str(rate_info['remaining']),
                "X-RateLimit-Reset": str(rate_info['reset_time']),
                "Retry-After": str(rate_info['reset_time'] - int(time.time()))
            }
        )
    
    # Add rate limit headers to response
    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(rate_info['limit'])
    response.headers["X-RateLimit-Remaining"] = str(rate_info['remaining'])
    response.headers["X-RateLimit-Reset"] = str(rate_info['reset_time'])
    
    return response

class AttributionRateLimiter:
    """
    Specialized rate limiter for attribution endpoints
    Per PRD Section 5.3: Attribution-specific rate limiting
    """
    
    def __init__(self):
        self.attribution_limiter = RateLimiter(requests_per_minute=20, burst_size=3)
        self.analysis_limiter = RateLimiter(requests_per_minute=10, burst_size=2)
    
    def check_attribution_limit(self, client_key: str) -> tuple[bool, Dict[str, int]]:
        """
        Check rate limit for attribution requests
        Per PRD Section 5.3: Attribution rate limiting
        """
        return self.attribution_limiter.is_allowed(client_key)
    
    def check_analysis_limit(self, client_key: str) -> tuple[bool, Dict[str, int]]:
        """
        Check rate limit for analysis requests
        Per PRD Section 5.3: Analysis rate limiting
        """
        return self.analysis_limiter.is_allowed(client_key)

# Global attribution rate limiter
attribution_rate_limiter = AttributionRateLimiter()

def check_attribution_rate_limit(request: Request) -> None:
    """
    Check attribution rate limit and raise exception if exceeded
    Per PRD Section 5.3: Attribution rate limit checking
    """
    client_key = get_client_key(request)
    allowed, rate_info = attribution_rate_limiter.check_attribution_limit(client_key)
    
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Attribution rate limit exceeded",
                "retry_after": rate_info['reset_time'] - int(time.time()),
                "limit": rate_info['limit'],
                "remaining": rate_info['remaining']
            },
            headers={
                "X-RateLimit-Limit": str(rate_info['limit']),
                "X-RateLimit-Remaining": str(rate_info['remaining']),
                "X-RateLimit-Reset": str(rate_info['reset_time']),
                "Retry-After": str(rate_info['reset_time'] - int(time.time()))
            }
        )

def check_analysis_rate_limit(request: Request) -> None:
    """
    Check analysis rate limit and raise exception if exceeded
    Per PRD Section 5.3: Analysis rate limit checking
    """
    client_key = get_client_key(request)
    allowed, rate_info = attribution_rate_limiter.check_analysis_limit(client_key)
    
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Analysis rate limit exceeded",
                "retry_after": rate_info['reset_time'] - int(time.time()),
                "limit": rate_info['limit'],
                "remaining": rate_info['remaining']
            },
            headers={
                "X-RateLimit-Limit": str(rate_info['limit']),
                "X-RateLimit-Remaining": str(rate_info['remaining']),
                "X-RateLimit-Reset": str(rate_info['reset_time']),
                "Retry-After": str(rate_info['reset_time'] - int(time.time()))
            }
        )
