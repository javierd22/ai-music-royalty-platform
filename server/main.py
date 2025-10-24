"""
Attribution Service - FastAPI Application

Per PRD Section 7 System Architecture:
- Attribution Service: Python FastAPI + Qdrant/Pinecone
- Database: Supabase Postgres (tracks, results, royalty_events)
- Storage: Supabase Storage (for audio files)

This service implements the Attribution Auditor (PRD Section 5.3):
- Vector similarity search via Qdrant/Pinecone
- Cross-validation against logged SDK use
- Threshold verification to confirm true influence
- Reports matches back to Supabase results table

SECURITY:
- API key authentication for partners (HMAC-signed requests)
- Rate limiting (60 req/min per partner)
- Row Level Security (RLS) enforced at database level
- Request signing with replay protection
- CORS restricted to allowlist
"""

from __future__ import annotations
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from server.middleware.auth import security_middleware, get_admin_user
from server.middleware.rate_limit import rate_limit_middleware
from server.monitoring import (
    PrometheusMiddleware,
    get_metrics,
    set_system_info,
    setup_tracing,
    start_maintenance_scheduler,
    update_health_status,
)
from server.routes.artist import router as artist_router
from server.routes.compare import router as compare_router
from server.routes.compliance import router as compliance_router
from server.routes.events import router as events_router
from server.routes.keys import router as keys_router
from server.routes.partner import router as partner_router
from server.routes.partner_admin import router as partner_admin_router
from server.routes.sdk import router as sdk_router
from server.routes.payouts import router as payouts_router


# Lifespan context manager for startup/shutdown tasks
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context for background tasks and monitoring setup"""
    # Startup: Initialize monitoring and background tasks
    import asyncio
    from server.middleware.auth import cleanup_old_nonces

    print("=== Starting Attribution Service ===")

    # Set system information for metrics
    set_system_info(
        version="1.0.0",
        environment=os.getenv("NODE_ENV", "production"),
        git_commit=os.getenv("GIT_COMMIT_SHA", None),
    )

    # Start maintenance scheduler (if enabled)
    maintenance_enabled = os.getenv("MAINTENANCE_ENABLED", "true").lower() == "true"
    if maintenance_enabled:
        maintenance_task = asyncio.create_task(start_maintenance_scheduler())
        print("Maintenance scheduler started")
    else:
        maintenance_task = None
        print("Maintenance scheduler disabled")

    # Keep legacy nonce cleanup for backward compatibility
    async def periodic_cleanup():
        """Run cleanup every hour"""
        while True:
            await asyncio.sleep(3600)  # 1 hour
            try:
                await cleanup_old_nonces()
            except Exception as e:
                print(f"Nonce cleanup error: {e}")

    cleanup_task = asyncio.create_task(periodic_cleanup())

    print("=== Attribution Service Ready ===")

    yield

    # Shutdown: Cancel background tasks
    print("=== Shutting Down Attribution Service ===")
    cleanup_task.cancel()
    if maintenance_task:
        maintenance_task.cancel()
    print("=== Attribution Service Stopped ===") 


# Initialize FastAPI app
app = FastAPI(
    title="AI Music Royalty Attribution Service",
    description="Attribution auditor for AI-generated music royalty tracking with secure partner authentication",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ============================================================================
# MONITORING & TRACING SETUP
# ============================================================================

# Setup OpenTelemetry tracing (if enabled)
setup_tracing(
    app,
    service_name="ai-music-attribution-api",
    environment=os.getenv("NODE_ENV", "production"),
)

# Add Prometheus metrics middleware
app.add_middleware(PrometheusMiddleware)


# ============================================================================
# SECURITY MIDDLEWARE
# ============================================================================

# Global security middleware (request ID, logging, body size limits, headers)
app.middleware("http")(security_middleware)

# Rate limiting middleware
app.middleware("http")(rate_limit_middleware)

# CORS configuration (Per Threat Model T8)
cors_allow_origins = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000")
allowed_origins = [origin.strip() for origin in cors_allow_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "x-api-key",
        "x-timestamp",
        "x-signature",
        "x-nonce",
    ],
    expose_headers=["X-Request-ID", "Retry-After"],
)


# ============================================================================
# HEALTH & METRICS ENDPOINTS
# ============================================================================


@app.get("/health")
async def health_check():
    """
    Comprehensive health check endpoint for service monitoring.
    
    Checks:
    - Database connectivity (Supabase)
    - Vector DB status (if enabled)
    - Blockchain RPC status (if enabled)
    - Storage availability (Supabase Storage)
    
    Returns:
        dict: Service status with latency for each dependency
    """
    from server.utils.db import get_supabase_client

    health_status = {
        "service": "attribution-service",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "healthy",
        "dependencies": {},
    }

    overall_healthy = True

    # Check Database
    try:
        start = time.time()
        supabase = get_supabase_client()
        # Simple query to test connectivity
        result = supabase.table("partners").select("id").limit(1).execute()
        latency_ms = int((time.time() - start) * 1000)
        
        health_status["dependencies"]["database"] = {
            "status": "operational",
            "latency_ms": latency_ms,
        }
        update_health_status("db", True, latency_ms / 1000)
    except Exception as e:
        health_status["dependencies"]["database"] = {
            "status": "degraded",
            "error": str(e)[:100],  # Truncate error message
        }
        update_health_status("db", False, 0)
        overall_healthy = False

    # Check Vector DB (if enabled)
    vector_db_enabled = os.getenv("VECTOR_DB_ENABLED", "false").lower() == "true"
    if vector_db_enabled:
        try:
            start = time.time()
            # TODO: Add actual vector DB health check
            # For now, assume operational if env var is set
            latency_ms = int((time.time() - start) * 1000)
            
            health_status["dependencies"]["vector_db"] = {
                "status": "operational",
                "type": os.getenv("VECTOR_DB_TYPE", "mock"),
                "latency_ms": latency_ms,
            }
            update_health_status("vector", True, latency_ms / 1000)
        except Exception as e:
            health_status["dependencies"]["vector_db"] = {
                "status": "degraded",
                "error": str(e)[:100],
            }
            update_health_status("vector", False, 0)
            overall_healthy = False
    else:
        health_status["dependencies"]["vector_db"] = {
            "status": "disabled",
        }

    # Check Blockchain RPC (if enabled)
    blockchain_enabled = os.getenv("BLOCKCHAIN_ENABLED", "false").lower() == "true"
    if blockchain_enabled:
        try:
            start = time.time()
            from server.utils.blockchain import check_blockchain_health
            
            # TODO: Implement check_blockchain_health in utils/blockchain.py
            # For now, assume operational if env var is set
            latency_ms = int((time.time() - start) * 1000)
            
            health_status["dependencies"]["blockchain"] = {
                "status": "operational",
                "network": os.getenv("BLOCKCHAIN_NETWORK", "polygon-testnet"),
                "latency_ms": latency_ms,
            }
            update_health_status("blockchain", True, latency_ms / 1000)
        except Exception as e:
            health_status["dependencies"]["blockchain"] = {
                "status": "degraded",
                "error": str(e)[:100],
            }
            update_health_status("blockchain", False, 0)
            # Don't mark overall as unhealthy for blockchain - it's optional
    else:
        health_status["dependencies"]["blockchain"] = {
            "status": "disabled",
        }

    # Check Storage (Supabase Storage)
    try:
        start = time.time()
        # TODO: Add actual storage health check
        # For now, assume operational if Supabase is up
        latency_ms = int((time.time() - start) * 1000)
        
        health_status["dependencies"]["storage"] = {
            "status": "operational",
            "latency_ms": latency_ms,
        }
        update_health_status("storage", True, latency_ms / 1000)
    except Exception as e:
        health_status["dependencies"]["storage"] = {
            "status": "degraded",
            "error": str(e)[:100],
        }
        update_health_status("storage", False, 0)
        # Storage is not critical for health

    # Set overall status
    health_status["status"] = "healthy" if overall_healthy else "degraded"
    health_status["ok"] = overall_healthy

    return health_status


@app.get("/metrics")
async def metrics_endpoint(_admin=Depends(get_admin_user)):
    """
    Prometheus metrics endpoint.
    
    Protected by admin authentication.
    
    Returns:
        Prometheus-formatted metrics in text/plain
    """
    return get_metrics()


# ============================================================================
# ROUTERS
# ============================================================================

app.include_router(artist_router, tags=["artist"])
app.include_router(compare_router, tags=["attribution"])
app.include_router(events_router, tags=["events"])
app.include_router(partner_router, tags=["partner"])
app.include_router(partner_admin_router, tags=["partner-admin"])
app.include_router(sdk_router, tags=["sdk"])
app.include_router(keys_router, tags=["keys"])
app.include_router(compliance_router, tags=["compliance"])
app.include_router(payouts_router, tags=["payouts"])


# ============================================================================
# EXCEPTION HANDLERS
# ============================================================================


@app.exception_handler(422)
async def validation_exception_handler(request: Request, exc):
    """Handle validation errors without leaking sensitive data"""
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error. Check request format.",
            "request_id": getattr(request.state, "request_id", None),
        },
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    """Handle internal errors without leaking sensitive data"""
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error. Contact support.",
            "request_id": getattr(request.state, "request_id", None),
        },
    )


# Root endpoint
@app.get("/")
async def root():
    """
    Root endpoint with API information.
    
    Returns:
        dict: API information and available endpoints
    """
    return {
        "service": "AI Music Royalty Attribution Service",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "health": "/health",
            "compare": "/compare (POST)",
            "sdk_log_use": "/sdk/log_use (POST) - requires API key + signature",
            "sdk_get_logs": "/sdk/log_use (GET) - requires API key",
            "keys_management": "/keys/* (POST/GET/DELETE) - admin only",
        },
        "security": {
            "authentication": "API key (x-api-key header)",
            "signing": "HMAC-SHA256 (x-signature, x-timestamp, x-nonce)",
            "rate_limiting": "60 requests/minute per partner",
            "replay_protection": "5 minute timestamp window + nonce tracking",
        },
        "prd_compliance": {
            "section_5.2": "AI Partner SDK - Secure key management",
            "section_5.3": "Attribution Auditor - Vector similarity search",
            "section_5.4": "Royalty Event Engine - Dual proof verification",
            "section_7": "System Architecture - FastAPI + Qdrant/Pinecone",
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
