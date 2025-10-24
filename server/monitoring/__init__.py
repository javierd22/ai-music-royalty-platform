"""
Monitoring, Tracing, and Maintenance Module

Provides comprehensive observability for the AI Music Royalty Attribution Platform:
- Prometheus metrics for performance monitoring
- OpenTelemetry tracing for distributed debugging
- Scheduled maintenance jobs for data cleanup and verification

Author: Senior Engineer
Last Updated: October 2025
"""

from server.monitoring.metrics import (
    PrometheusMiddleware,
    get_metrics,
    record_api_key_auth,
    record_attribution_match,
    record_compliance_report,
    record_dual_proof,
    record_rate_limit_hit,
    record_replay_attack,
    record_royalty_event,
    set_system_info,
    track_blockchain_tx,
    track_db_query,
    track_vector_search,
    update_health_status,
)
from server.monitoring.tracing import (
    add_span_event,
    get_trace_context,
    get_trace_id,
    set_span_attribute,
    setup_tracing,
    trace_blockchain_operation,
    trace_db_operation,
    trace_operation,
    trace_vector_search as trace_vector_search_op,
)
from server.monitoring.maintenance import (
    cleanup_expired_nonces,
    cleanup_rate_limit_tokens,
    cleanup_stale_results,
    regenerate_compliance_summaries,
    reverify_pending_blockchain_events,
    run_all_maintenance_jobs,
    start_maintenance_scheduler,
)

__all__ = [
    # Metrics
    "PrometheusMiddleware",
    "get_metrics",
    "record_api_key_auth",
    "record_attribution_match",
    "record_compliance_report",
    "record_dual_proof",
    "record_rate_limit_hit",
    "record_replay_attack",
    "record_royalty_event",
    "set_system_info",
    "track_blockchain_tx",
    "track_db_query",
    "track_vector_search",
    "update_health_status",
    # Tracing
    "add_span_event",
    "get_trace_context",
    "get_trace_id",
    "set_span_attribute",
    "setup_tracing",
    "trace_blockchain_operation",
    "trace_db_operation",
    "trace_operation",
    "trace_vector_search_op",
    # Maintenance
    "cleanup_expired_nonces",
    "cleanup_rate_limit_tokens",
    "cleanup_stale_results",
    "regenerate_compliance_summaries",
    "reverify_pending_blockchain_events",
    "run_all_maintenance_jobs",
    "start_maintenance_scheduler",
]

