"""
Prometheus Metrics Integration for AI Music Royalty Attribution Platform

This module provides comprehensive metrics collection for monitoring
API performance, database operations, blockchain transactions, and
vector search queries.

Per PRD §12: All monitoring respects privacy and transparency principles.
No PII is collected or exposed in metrics.

Author: Senior Engineer
Last Updated: October 2025
"""

import time
from functools import wraps
from typing import Callable, Optional

from prometheus_client import (
    Counter,
    Gauge,
    Histogram,
    Info,
    generate_latest,
    CONTENT_TYPE_LATEST,
)
from fastapi import Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


# =============================================================================
# APPLICATION METRICS
# =============================================================================

# API Request Metrics
http_requests_total = Counter(
    "http_requests_total",
    "Total number of HTTP requests",
    ["method", "endpoint", "status_code"],
)

http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

http_requests_in_progress = Gauge(
    "http_requests_in_progress", "Number of HTTP requests in progress", ["method", "endpoint"]
)

# Database Metrics
db_query_duration_seconds = Histogram(
    "db_query_duration_seconds",
    "Database query latency in seconds",
    ["operation", "table"],
    buckets=(0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 2.0),
)

db_queries_total = Counter(
    "db_queries_total", "Total number of database queries", ["operation", "table", "status"]
)

db_connections_active = Gauge("db_connections_active", "Number of active database connections")

# Blockchain Metrics
blockchain_tx_duration_seconds = Histogram(
    "blockchain_tx_duration_seconds",
    "Blockchain transaction confirmation time in seconds",
    ["network", "operation"],
    buckets=(1.0, 5.0, 10.0, 30.0, 60.0, 120.0, 300.0),
)

blockchain_tx_total = Counter(
    "blockchain_tx_total",
    "Total number of blockchain transactions",
    ["network", "operation", "status"],
)

blockchain_verification_failures = Counter(
    "blockchain_verification_failures",
    "Total number of failed blockchain verifications",
    ["network", "reason"],
)

# Vector Search Metrics
vector_search_duration_seconds = Histogram(
    "vector_search_duration_seconds",
    "Vector similarity search latency in seconds",
    buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0),
)

vector_search_total = Counter(
    "vector_search_total", "Total number of vector searches", ["status"]
)

vector_embeddings_generated = Counter(
    "vector_embeddings_generated", "Total number of embeddings generated"
)

# Attribution & Royalty Metrics
attribution_matches_total = Counter(
    "attribution_matches_total",
    "Total number of attribution matches found",
    ["confidence_tier"],  # high (>0.9), medium (0.7-0.9), low (<0.7)
)

royalty_events_created = Counter(
    "royalty_events_created", "Total number of royalty events created", ["verification_status"]
)

dual_proof_verifications = Counter(
    "dual_proof_verifications",
    "Total number of dual proof verifications",
    ["result"],  # confirmed, pending, failed
)

# Compliance & Security Metrics
compliance_reports_generated = Counter(
    "compliance_reports_generated", "Total number of compliance reports generated"
)

api_key_auth_attempts = Counter(
    "api_key_auth_attempts",
    "Total number of API key authentication attempts",
    ["result"],  # success, failure, invalid
)

rate_limit_hits = Counter(
    "rate_limit_hits", "Total number of rate limit violations", ["partner_id_prefix"]
)

replay_attacks_blocked = Counter(
    "replay_attacks_blocked", "Total number of blocked replay attacks"
)

# System Health Metrics
system_info = Info("system", "System information")

health_check_status = Gauge(
    "health_check_status",
    "Health check status (1 = healthy, 0 = unhealthy)",
    ["service"],  # db, blockchain, vector, storage
)

health_check_latency_seconds = Gauge(
    "health_check_latency_seconds", "Health check latency in seconds", ["service"]
)


# =============================================================================
# PROMETHEUS MIDDLEWARE
# =============================================================================


class PrometheusMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware that automatically collects HTTP request metrics.
    
    Tracks:
    - Request count by method, endpoint, and status code
    - Request duration by method and endpoint
    - In-progress requests
    
    Does NOT log:
    - Request bodies or query parameters (may contain PII)
    - User IDs or partner IDs (privacy)
    - API keys or tokens (security)
    """

    async def dispatch(self, request: Request, call_next: Callable):
        # Extract method and path for metrics
        method = request.method
        path = request.url.path

        # Normalize paths to avoid high cardinality
        # e.g., /tracks/123 -> /tracks/{id}
        normalized_path = self._normalize_path(path)

        # Track in-progress requests
        http_requests_in_progress.labels(method=method, endpoint=normalized_path).inc()

        # Start timer
        start_time = time.time()

        try:
            # Process request
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            # Track failed requests
            status_code = 500
            raise
        finally:
            # Record metrics
            duration = time.time() - start_time

            http_requests_total.labels(
                method=method, endpoint=normalized_path, status_code=status_code
            ).inc()

            http_request_duration_seconds.labels(
                method=method, endpoint=normalized_path
            ).observe(duration)

            http_requests_in_progress.labels(method=method, endpoint=normalized_path).dec()

        return response

    def _normalize_path(self, path: str) -> str:
        """
        Normalize URL paths to reduce cardinality in metrics.
        
        Examples:
            /tracks/123 -> /tracks/{id}
            /compliance/verify/event/abc-def -> /compliance/verify/event/{id}
        """
        parts = path.split("/")
        normalized = []

        for i, part in enumerate(parts):
            # Replace UUIDs and numeric IDs with placeholders
            if self._is_uuid_or_id(part):
                normalized.append("{id}")
            else:
                normalized.append(part)

        return "/".join(normalized)

    def _is_uuid_or_id(self, part: str) -> bool:
        """Check if a path part is a UUID or numeric ID."""
        import re

        # UUID pattern
        uuid_pattern = r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
        if re.match(uuid_pattern, part, re.IGNORECASE):
            return True

        # Numeric ID
        if part.isdigit():
            return True

        return False


# =============================================================================
# METRIC DECORATORS
# =============================================================================


def track_db_query(operation: str, table: str):
    """
    Decorator to track database query metrics.
    
    Usage:
        @track_db_query("select", "tracks")
        async def get_tracks():
            ...
    """

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            status = "success"

            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                status = "error"
                raise
            finally:
                duration = time.time() - start_time
                db_query_duration_seconds.labels(operation=operation, table=table).observe(
                    duration
                )
                db_queries_total.labels(operation=operation, table=table, status=status).inc()

        return wrapper

    return decorator


def track_blockchain_tx(network: str, operation: str):
    """
    Decorator to track blockchain transaction metrics.
    
    Usage:
        @track_blockchain_tx("polygon", "register_track")
        async def register_track_on_chain(track_id):
            ...
    """

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            status = "success"

            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                status = "error"
                blockchain_verification_failures.labels(
                    network=network, reason=type(e).__name__
                ).inc()
                raise
            finally:
                duration = time.time() - start_time
                blockchain_tx_duration_seconds.labels(
                    network=network, operation=operation
                ).observe(duration)
                blockchain_tx_total.labels(
                    network=network, operation=operation, status=status
                ).inc()

        return wrapper

    return decorator


def track_vector_search():
    """
    Decorator to track vector similarity search metrics.
    
    Usage:
        @track_vector_search()
        async def find_similar_tracks(embedding):
            ...
    """

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            status = "success"

            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                status = "error"
                raise
            finally:
                duration = time.time() - start_time
                vector_search_duration_seconds.observe(duration)
                vector_search_total.labels(status=status).inc()

        return wrapper

    return decorator


# =============================================================================
# METRICS ENDPOINT
# =============================================================================


def get_metrics() -> Response:
    """
    Generate Prometheus metrics in text format.
    
    This endpoint should be protected with admin authentication.
    See: server/middleware/auth.py -> get_admin_user()
    """
    metrics_output = generate_latest()
    return Response(content=metrics_output, media_type=CONTENT_TYPE_LATEST)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================


def set_system_info(version: str, environment: str, git_commit: Optional[str] = None):
    """
    Set system information metrics.
    
    Call this during application startup.
    """
    info_dict = {
        "version": version,
        "environment": environment,
    }
    if git_commit:
        info_dict["git_commit"] = git_commit

    system_info.info(info_dict)


def record_attribution_match(confidence: float):
    """Record an attribution match with confidence tier."""
    if confidence >= 0.9:
        tier = "high"
    elif confidence >= 0.7:
        tier = "medium"
    else:
        tier = "low"

    attribution_matches_total.labels(confidence_tier=tier).inc()


def record_royalty_event(verified: bool):
    """Record a royalty event creation."""
    status = "verified" if verified else "pending"
    royalty_events_created.labels(verification_status=status).inc()


def record_dual_proof(result: str):
    """
    Record a dual proof verification result.
    
    Args:
        result: One of "confirmed", "pending", "failed"
    """
    dual_proof_verifications.labels(result=result).inc()


def record_compliance_report():
    """Record a compliance report generation."""
    compliance_reports_generated.inc()


def record_api_key_auth(success: bool, invalid: bool = False):
    """Record an API key authentication attempt."""
    if invalid:
        result = "invalid"
    elif success:
        result = "success"
    else:
        result = "failure"

    api_key_auth_attempts.labels(result=result).inc()


def record_rate_limit_hit(partner_id_prefix: str):
    """Record a rate limit violation."""
    rate_limit_hits.labels(partner_id_prefix=partner_id_prefix).inc()


def record_replay_attack():
    """Record a blocked replay attack."""
    replay_attacks_blocked.inc()


def update_health_status(service: str, healthy: bool, latency_seconds: float):
    """
    Update health check metrics for a service.
    
    Args:
        service: One of "db", "blockchain", "vector", "storage"
        healthy: Whether the service is healthy
        latency_seconds: Health check latency
    """
    health_check_status.labels(service=service).set(1 if healthy else 0)
    health_check_latency_seconds.labels(service=service).set(latency_seconds)

