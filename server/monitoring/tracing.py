"""
OpenTelemetry Tracing Integration for AI Music Royalty Attribution Platform

Provides distributed tracing across FastAPI, Supabase, and blockchain operations.
Enables correlation of requests across multiple services for debugging and performance analysis.

Per PRD §12: Tracing respects privacy - no PII in span attributes.

Author: Senior Engineer
Last Updated: October 2025
"""

import os
import time
from contextlib import contextmanager
from typing import Any, Dict, Optional

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.trace import Status, StatusCode


# =============================================================================
# TRACER SETUP
# =============================================================================

tracer = trace.get_tracer(__name__)


def setup_tracing(app, service_name: str = "ai-music-api", environment: str = "production"):
    """
    Initialize OpenTelemetry tracing for FastAPI application.
    
    Args:
        app: FastAPI application instance
        service_name: Name of the service (for trace identification)
        environment: Deployment environment (dev, staging, production)
    
    Environment Variables:
        OTEL_ENABLED: Enable/disable tracing (default: true)
        OTEL_EXPORTER_OTLP_ENDPOINT: OTLP endpoint for trace export
        OTEL_EXPORTER_CONSOLE: Export traces to console (default: false)
    
    Usage:
        from fastapi import FastAPI
        from server.monitoring.tracing import setup_tracing
        
        app = FastAPI()
        setup_tracing(app, service_name="ai-music-api", environment="production")
    """
    # Check if tracing is enabled
    otel_enabled = os.getenv("OTEL_ENABLED", "true").lower() == "true"
    if not otel_enabled:
        print("OpenTelemetry tracing is disabled")
        return

    # Define service resource
    resource = Resource.create(
        {
            "service.name": service_name,
            "service.namespace": "ai-music-royalty",
            "deployment.environment": environment,
            "service.version": os.getenv("APP_VERSION", "1.0.0"),
        }
    )

    # Create tracer provider
    provider = TracerProvider(resource=resource)

    # Add exporters
    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    console_export = os.getenv("OTEL_EXPORTER_CONSOLE", "false").lower() == "true"

    if otlp_endpoint:
        # Export to OTLP collector (e.g., Jaeger, Tempo, Datadog)
        otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
        provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
        print(f"OpenTelemetry: Exporting traces to {otlp_endpoint}")
    elif console_export:
        # Export to console for local development
        console_exporter = ConsoleSpanExporter()
        provider.add_span_processor(BatchSpanProcessor(console_exporter))
        print("OpenTelemetry: Exporting traces to console")
    else:
        print("OpenTelemetry: No exporter configured, tracing data will not be exported")

    # Set global tracer provider
    trace.set_tracer_provider(provider)

    # Instrument FastAPI
    FastAPIInstrumentor.instrument_app(app)

    print(f"OpenTelemetry tracing initialized for service: {service_name}")


# =============================================================================
# TRACING UTILITIES
# =============================================================================


@contextmanager
def trace_operation(
    operation_name: str,
    attributes: Optional[Dict[str, Any]] = None,
    record_exception: bool = True,
):
    """
    Context manager for tracing custom operations.
    
    Usage:
        with trace_operation("db_query", {"table": "tracks", "operation": "select"}):
            result = await db.table("tracks").select("*").execute()
    
    Args:
        operation_name: Name of the operation being traced
        attributes: Optional attributes to attach to the span
        record_exception: Whether to record exceptions in the span
    """
    with tracer.start_as_current_span(operation_name) as span:
        # Add attributes
        if attributes:
            for key, value in attributes.items():
                # Sanitize PII - never log email, name, or sensitive fields
                if key.lower() in ["email", "password", "api_key", "token", "secret"]:
                    span.set_attribute(key, "[REDACTED]")
                else:
                    span.set_attribute(key, str(value))

        try:
            yield span
        except Exception as e:
            if record_exception:
                span.record_exception(e)
                span.set_status(Status(StatusCode.ERROR, str(e)))
            raise
        else:
            span.set_status(Status(StatusCode.OK))


async def trace_db_operation(operation: str, table: str, func, *args, **kwargs):
    """
    Trace a database operation with timing and error handling.
    
    Usage:
        result = await trace_db_operation(
            "select", "tracks",
            lambda: supabase.table("tracks").select("*").execute()
        )
    """
    with trace_operation(
        f"db.{operation}",
        attributes={"db.table": table, "db.operation": operation},
    ) as span:
        start_time = time.time()
        result = await func(*args, **kwargs) if callable(func) else func
        duration = time.time() - start_time

        span.set_attribute("db.duration_ms", int(duration * 1000))
        return result


async def trace_blockchain_operation(
    network: str, operation: str, func, *args, **kwargs
):
    """
    Trace a blockchain operation with timing and transaction details.
    
    Usage:
        tx_hash = await trace_blockchain_operation(
            "polygon", "register_track",
            lambda: blockchain.register_track(track_id)
        )
    """
    with trace_operation(
        f"blockchain.{operation}",
        attributes={"blockchain.network": network, "blockchain.operation": operation},
    ) as span:
        start_time = time.time()
        result = await func(*args, **kwargs) if callable(func) else func
        duration = time.time() - start_time

        span.set_attribute("blockchain.duration_ms", int(duration * 1000))

        # Add transaction hash if available (without exposing full tx data)
        if isinstance(result, dict) and "tx_hash" in result:
            span.set_attribute("blockchain.tx_hash", result["tx_hash"][:16] + "...")

        return result


async def trace_vector_search(func, *args, **kwargs):
    """
    Trace a vector similarity search operation.
    
    Usage:
        matches = await trace_vector_search(
            lambda: embeddings.find_similar(embedding_vector, limit=10)
        )
    """
    with trace_operation("vector.search") as span:
        start_time = time.time()
        result = await func(*args, **kwargs) if callable(func) else func
        duration = time.time() - start_time

        span.set_attribute("vector.duration_ms", int(duration * 1000))

        # Add result count without exposing content
        if isinstance(result, list):
            span.set_attribute("vector.results_count", len(result))

        return result


def add_span_event(name: str, attributes: Optional[Dict[str, Any]] = None):
    """
    Add an event to the current span.
    
    Useful for marking significant points in request processing.
    
    Usage:
        add_span_event("dual_proof_confirmed", {"confidence": 0.95})
    """
    span = trace.get_current_span()
    if span:
        span.add_event(name, attributes=attributes or {})


def set_span_attribute(key: str, value: Any):
    """
    Set an attribute on the current span.
    
    Usage:
        set_span_attribute("user_role", "artist")
    """
    span = trace.get_current_span()
    if span:
        # Sanitize PII
        if key.lower() in ["email", "password", "api_key", "token", "secret", "user_id"]:
            span.set_attribute(key, "[REDACTED]")
        else:
            span.set_attribute(key, str(value))


def get_trace_id() -> Optional[str]:
    """
    Get the current trace ID as a hex string.
    
    Useful for correlating logs with traces.
    
    Returns:
        Trace ID as hex string, or None if no active span
    """
    span = trace.get_current_span()
    if span and span.get_span_context().is_valid:
        trace_id = span.get_span_context().trace_id
        return f"{trace_id:032x}"
    return None


# =============================================================================
# CORRELATION WITH STRUCTURED LOGGING
# =============================================================================


def get_trace_context() -> Dict[str, str]:
    """
    Get trace context for inclusion in structured logs.
    
    Returns:
        Dictionary with trace_id and span_id for log correlation
    
    Usage:
        import json
        trace_ctx = get_trace_context()
        print(json.dumps({
            "message": "Processing request",
            **trace_ctx
        }))
    """
    span = trace.get_current_span()
    if span and span.get_span_context().is_valid:
        ctx = span.get_span_context()
        return {
            "trace_id": f"{ctx.trace_id:032x}",
            "span_id": f"{ctx.span_id:016x}",
        }
    return {}


# =============================================================================
# INSTRUMENTATION HELPERS
# =============================================================================


def instrument_supabase_client(supabase_client):
    """
    Add tracing instrumentation to Supabase client methods.
    
    This is a lightweight wrapper that adds span creation to key methods.
    
    Note: For production, consider using OpenTelemetry's auto-instrumentation
    for HTTP clients, which will capture Supabase REST API calls automatically.
    """
    # Store original methods
    original_select = supabase_client.table

    def traced_table(table_name):
        table_builder = original_select(table_name)

        # Wrap execute methods
        original_execute = table_builder.execute

        async def traced_execute():
            with trace_operation(
                "supabase.query", attributes={"db.table": table_name}
            ):
                return await original_execute()

        table_builder.execute = traced_execute
        return table_builder

    supabase_client.table = traced_table
    return supabase_client


# =============================================================================
# EXAMPLE USAGE
# =============================================================================

"""
Example: Tracing a complete attribution workflow

async def process_attribution(track_id: str, user_id: str):
    # Start a parent span for the entire workflow
    with trace_operation("attribution.process", {"track_id": track_id}):
        
        # Trace database lookup
        track = await trace_db_operation(
            "select", "tracks",
            lambda: supabase.table("tracks").select("*").eq("id", track_id).single().execute()
        )
        
        # Trace vector search
        matches = await trace_vector_search(
            lambda: embeddings.find_similar(track["embedding"], limit=10)
        )
        
        # Add event for significant milestone
        add_span_event("matches_found", {"count": len(matches)})
        
        # Trace blockchain verification
        if matches:
            tx = await trace_blockchain_operation(
                "polygon", "verify_attribution",
                lambda: blockchain.verify(matches[0]["id"])
            )
            
            # Record outcome
            set_span_attribute("verification_status", "confirmed")
        
        return matches
"""

