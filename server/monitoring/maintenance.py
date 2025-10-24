"""
Scheduled Maintenance Jobs for AI Music Royalty Attribution Platform

Provides automated background tasks for:
1. Cleaning up stale data (results older than 90 days)
2. Re-verifying blockchain events missing confirmation
3. Regenerating compliance summaries weekly
4. Purging expired nonces and rate limit tokens

All jobs log start, end, duration, and outcomes for auditability.

Per PRD §12: All maintenance operations are transparent and auditable.

Author: Senior Engineer
Last Updated: October 2025
"""

import asyncio
import json
import os
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from uuid import UUID

from server.monitoring.metrics import (
    record_compliance_report,
    record_royalty_event,
)
from server.monitoring.tracing import trace_operation
from server.utils.db import get_supabase_client


# =============================================================================
# JOB CONFIGURATION
# =============================================================================

# Cleanup intervals (in days)
STALE_RESULTS_DAYS = int(os.getenv("MAINTENANCE_STALE_RESULTS_DAYS", "90"))
STALE_NONCES_HOURS = int(os.getenv("MAINTENANCE_STALE_NONCES_HOURS", "24"))
RATE_LIMIT_CLEANUP_HOURS = int(os.getenv("MAINTENANCE_RATE_LIMIT_CLEANUP_HOURS", "6"))

# Job execution intervals (in seconds)
CLEANUP_INTERVAL_SECONDS = int(os.getenv("MAINTENANCE_CLEANUP_INTERVAL", "86400"))  # Daily
REVERIFY_INTERVAL_SECONDS = int(os.getenv("MAINTENANCE_REVERIFY_INTERVAL", "3600"))  # Hourly
COMPLIANCE_INTERVAL_SECONDS = int(
    os.getenv("MAINTENANCE_COMPLIANCE_INTERVAL", "604800")
)  # Weekly


# =============================================================================
# LOGGING UTILITIES
# =============================================================================


def log_job_start(job_name: str, params: Optional[Dict] = None):
    """Log the start of a maintenance job."""
    log_entry = {
        "event": "maintenance_job_start",
        "job": job_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if params:
        log_entry["params"] = params

    print(json.dumps(log_entry))


def log_job_end(job_name: str, duration_seconds: float, result: Dict):
    """Log the completion of a maintenance job."""
    log_entry = {
        "event": "maintenance_job_complete",
        "job": job_name,
        "duration_seconds": round(duration_seconds, 2),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **result,
    }
    print(json.dumps(log_entry))


def log_job_error(job_name: str, error: Exception):
    """Log an error during a maintenance job."""
    log_entry = {
        "event": "maintenance_job_error",
        "job": job_name,
        "error_type": type(error).__name__,
        "error_message": str(error),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    print(json.dumps(log_entry))


# =============================================================================
# MAINTENANCE JOBS
# =============================================================================


async def cleanup_stale_results():
    """
    Remove attribution results older than STALE_RESULTS_DAYS.
    
    Per PRD: Results are temporary and should not accumulate indefinitely.
    Artists should act on matches within a reasonable timeframe.
    
    Returns:
        Dictionary with cleanup statistics
    """
    job_name = "cleanup_stale_results"
    start_time = datetime.now(timezone.utc)
    log_job_start(job_name, {"threshold_days": STALE_RESULTS_DAYS})

    try:
        with trace_operation(f"maintenance.{job_name}"):
            supabase = get_supabase_client()
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=STALE_RESULTS_DAYS)

            # Find stale results
            stale_results = (
                supabase.table("results")
                .select("id")
                .lt("created_at", cutoff_date.isoformat())
                .execute()
            )

            count = len(stale_results.data) if stale_results.data else 0

            if count > 0:
                # Delete in batches to avoid large transactions
                batch_size = 100
                deleted = 0

                for i in range(0, count, batch_size):
                    batch_ids = [
                        r["id"] for r in stale_results.data[i : i + batch_size]
                    ]
                    supabase.table("results").delete().in_("id", batch_ids).execute()
                    deleted += len(batch_ids)

                result = {
                    "status": "success",
                    "results_deleted": deleted,
                    "cutoff_date": cutoff_date.isoformat(),
                }
            else:
                result = {
                    "status": "success",
                    "results_deleted": 0,
                    "message": "No stale results found",
                }

            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            log_job_end(job_name, duration, result)
            return result

    except Exception as e:
        log_job_error(job_name, e)
        raise


async def cleanup_expired_nonces():
    """
    Remove nonces older than STALE_NONCES_HOURS.
    
    Nonces are used for replay protection and only need to be retained
    for the replay window duration (typically 5 minutes).
    
    Returns:
        Dictionary with cleanup statistics
    """
    job_name = "cleanup_expired_nonces"
    start_time = datetime.now(timezone.utc)
    log_job_start(job_name, {"threshold_hours": STALE_NONCES_HOURS})

    try:
        with trace_operation(f"maintenance.{job_name}"):
            supabase = get_supabase_client()
            cutoff_date = datetime.now(timezone.utc) - timedelta(
                hours=STALE_NONCES_HOURS
            )

            # Delete expired nonces
            result_response = (
                supabase.table("request_nonces")
                .delete()
                .lt("created_at", cutoff_date.isoformat())
                .execute()
            )

            # Count doesn't come back from delete, so we'll estimate
            result = {
                "status": "success",
                "message": "Expired nonces cleaned up",
                "cutoff_date": cutoff_date.isoformat(),
            }

            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            log_job_end(job_name, duration, result)
            return result

    except Exception as e:
        log_job_error(job_name, e)
        raise


async def reverify_pending_blockchain_events():
    """
    Re-verify blockchain events that are missing confirmation.
    
    Sometimes blockchain transactions fail or take longer than expected.
    This job finds events with tx_hash but no verified status and re-checks them.
    
    Returns:
        Dictionary with re-verification statistics
    """
    job_name = "reverify_blockchain_events"
    start_time = datetime.now(timezone.utc)
    log_job_start(job_name)

    try:
        with trace_operation(f"maintenance.{job_name}"):
            from server.utils.blockchain import verify_on_chain

            supabase = get_supabase_client()

            # Find events with tx_hash but created more than 1 hour ago
            # (giving time for initial confirmation)
            one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)

            # Check royalty_events
            pending_events = (
                supabase.table("royalty_events")
                .select("id, tx_hash")
                .is_("tx_hash", "not.null")
                .lt("created_at", one_hour_ago.isoformat())
                .limit(100)  # Process in batches
                .execute()
            )

            verified_count = 0
            failed_count = 0

            if pending_events.data:
                for event in pending_events.data:
                    tx_hash = event.get("tx_hash")
                    if not tx_hash:
                        continue

                    # Re-verify on chain
                    verification = await verify_on_chain(tx_hash)

                    if verification.get("verified"):
                        verified_count += 1
                        # Update event with verification details
                        supabase.table("royalty_events").update(
                            {
                                "verified_at": datetime.now(timezone.utc).isoformat(),
                                "blockchain_details": verification,
                            }
                        ).eq("id", event["id"]).execute()
                    else:
                        failed_count += 1

            result = {
                "status": "success",
                "events_checked": len(pending_events.data) if pending_events.data else 0,
                "verified": verified_count,
                "failed": failed_count,
            }

            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            log_job_end(job_name, duration, result)
            return result

    except Exception as e:
        log_job_error(job_name, e)
        raise


async def regenerate_compliance_summaries():
    """
    Regenerate weekly compliance summaries for all partners.
    
    Creates pre-computed compliance reports that can be quickly retrieved
    without running expensive queries on-demand.
    
    Returns:
        Dictionary with generation statistics
    """
    job_name = "regenerate_compliance_summaries"
    start_time = datetime.now(timezone.utc)
    log_job_start(job_name)

    try:
        with trace_operation(f"maintenance.{job_name}"):
            supabase = get_supabase_client()

            # Get all active partners
            partners = (
                supabase.table("partners")
                .select("id, name, email")
                .eq("is_active", True)
                .execute()
            )

            summaries_created = 0

            if partners.data:
                for partner in partners.data:
                    partner_id = partner["id"]

                    # Count SDK logs
                    logs = (
                        supabase.table("ai_use_logs")
                        .select("id", count="exact")
                        .eq("partner_id", partner_id)
                        .execute()
                    )

                    # Count verified royalty events
                    events = (
                        supabase.rpc(
                            "count_verified_events_for_partner",
                            {"p_partner_id": partner_id},
                        )
                        .execute()
                    )

                    # Create summary record
                    summary = {
                        "partner_id": partner_id,
                        "total_logs": logs.count if logs.count else 0,
                        "verified_events": events.data if events.data else 0,
                        "period_start": (
                            datetime.now(timezone.utc) - timedelta(days=7)
                        ).isoformat(),
                        "period_end": datetime.now(timezone.utc).isoformat(),
                        "generated_at": datetime.now(timezone.utc).isoformat(),
                    }

                    # Store in compliance_summaries table (create if doesn't exist)
                    # Note: This table should be created via migration
                    try:
                        supabase.table("compliance_summaries").insert(summary).execute()
                        summaries_created += 1
                        record_compliance_report()
                    except Exception as insert_error:
                        print(
                            f"Failed to insert summary for partner {partner_id}: {insert_error}"
                        )

            result = {
                "status": "success",
                "partners_processed": len(partners.data) if partners.data else 0,
                "summaries_created": summaries_created,
            }

            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            log_job_end(job_name, duration, result)
            return result

    except Exception as e:
        log_job_error(job_name, e)
        raise


async def cleanup_rate_limit_tokens():
    """
    Clean up in-memory rate limit token buckets for inactive partners.
    
    This is only relevant if using in-memory rate limiting (not Redis).
    Helps prevent memory leaks from unused token buckets.
    
    Returns:
        Dictionary with cleanup statistics
    """
    job_name = "cleanup_rate_limit_tokens"
    start_time = datetime.now(timezone.utc)
    log_job_start(job_name, {"threshold_hours": RATE_LIMIT_CLEANUP_HOURS})

    try:
        with trace_operation(f"maintenance.{job_name}"):
            from server.utils.security import get_rate_limiter

            rate_limiter = get_rate_limiter()

            # This assumes rate_limiter has a cleanup method
            # Implement based on your rate limiting strategy
            if hasattr(rate_limiter, "cleanup_stale_buckets"):
                cleaned = rate_limiter.cleanup_stale_buckets(
                    max_age_hours=RATE_LIMIT_CLEANUP_HOURS
                )
                result = {"status": "success", "buckets_cleaned": cleaned}
            else:
                result = {
                    "status": "skipped",
                    "message": "Rate limiter does not support cleanup",
                }

            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            log_job_end(job_name, duration, result)
            return result

    except Exception as e:
        log_job_error(job_name, e)
        # Don't raise - this is a non-critical job
        return {"status": "error", "message": str(e)}


# =============================================================================
# JOB SCHEDULER
# =============================================================================


async def run_maintenance_job(job_func, interval_seconds: int):
    """
    Run a maintenance job on a recurring interval.
    
    Args:
        job_func: Async function to execute
        interval_seconds: Seconds between executions
    """
    while True:
        try:
            await job_func()
        except Exception as e:
            print(f"Maintenance job {job_func.__name__} failed: {e}")

        # Wait for next execution
        await asyncio.sleep(interval_seconds)


async def start_maintenance_scheduler():
    """
    Start all scheduled maintenance jobs.
    
    This should be called during FastAPI lifespan startup.
    
    Usage:
        @asynccontextmanager
        async def lifespan(app: FastAPI):
            # Start maintenance tasks
            task = asyncio.create_task(start_maintenance_scheduler())
            yield
            # Cleanup
            task.cancel()
    """
    print("Starting maintenance scheduler...")

    # Create tasks for each job
    tasks = [
        asyncio.create_task(
            run_maintenance_job(cleanup_stale_results, CLEANUP_INTERVAL_SECONDS)
        ),
        asyncio.create_task(
            run_maintenance_job(cleanup_expired_nonces, CLEANUP_INTERVAL_SECONDS)
        ),
        asyncio.create_task(
            run_maintenance_job(
                reverify_pending_blockchain_events, REVERIFY_INTERVAL_SECONDS
            )
        ),
        asyncio.create_task(
            run_maintenance_job(
                regenerate_compliance_summaries, COMPLIANCE_INTERVAL_SECONDS
            )
        ),
        asyncio.create_task(
            run_maintenance_job(
                cleanup_rate_limit_tokens, RATE_LIMIT_CLEANUP_HOURS * 3600
            )
        ),
    ]

    print(f"Started {len(tasks)} maintenance jobs")

    # Wait for all tasks (they run indefinitely)
    await asyncio.gather(*tasks, return_exceptions=True)


# =============================================================================
# MANUAL JOB TRIGGERS (FOR TESTING)
# =============================================================================


async def run_all_maintenance_jobs():
    """
    Run all maintenance jobs once (for testing or manual execution).
    
    Returns:
        Dictionary with results from all jobs
    """
    results = {}

    results["cleanup_stale_results"] = await cleanup_stale_results()
    results["cleanup_expired_nonces"] = await cleanup_expired_nonces()
    results["reverify_blockchain_events"] = await reverify_pending_blockchain_events()
    results["regenerate_compliance_summaries"] = await regenerate_compliance_summaries()
    results["cleanup_rate_limit_tokens"] = await cleanup_rate_limit_tokens()

    return results

