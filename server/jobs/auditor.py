"""
Attribution Auditor Background Job

Per PRD Section 5.3 & 5.4: Attribution Auditor + Royalty Event Engine
- Fetches recent results from vector matching
- Cross-checks with SDK use logs
- Creates verified royalty events when dual proof exists

Per PRD Section 10 Roadmap - Phase 2:
- Cross-validation and royalty events automation
- AI Partner SDK + Compliance

This job implements the core "dual proof" verification system.
"""

from __future__ import annotations
import os
import sys
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from server.utils.db import get_supabase_client
from server.utils.royalties import (
    DualProofMatch,
    create_verified_royalty_event
)


class AuditorConfig:
    """Configuration for the auditor job."""
    
    def __init__(self):
        self.similarity_threshold = float(os.getenv("AUDITOR_SIMILARITY_THRESHOLD", "0.85"))
        self.time_window_hours = int(os.getenv("AUDITOR_TIME_WINDOW_HOURS", "24"))
        self.polling_interval_seconds = int(os.getenv("AUDITOR_POLLING_INTERVAL", "300"))
        self.batch_size = int(os.getenv("AUDITOR_BATCH_SIZE", "100"))
        self.royalty_base_rate = float(os.getenv("ROYALTY_BASE_RATE", "10.0"))
        self.dry_run = os.getenv("AUDITOR_DRY_RUN", "false").lower() == "true"
    
    def __str__(self):
        return f"""
Auditor Configuration:
  Similarity Threshold: {self.similarity_threshold}
  Time Window: {self.time_window_hours} hours
  Polling Interval: {self.polling_interval_seconds} seconds
  Batch Size: {self.batch_size}
  Base Rate: ${self.royalty_base_rate}
  Dry Run: {self.dry_run}
"""


class AttributionAuditor:
    """
    Attribution Auditor - verifies dual proof and creates royalty events.
    
    Per PRD Section 5.3 & 5.4:
    - Cross-validates SDK logs against auditor detections
    - Only creates royalty events when both proofs align
    - Ensures >95% detection precision with threshold verification
    """
    
    def __init__(self, config: Optional[AuditorConfig] = None):
        self.config = config or AuditorConfig()
        self.client = get_supabase_client()
    
    def fetch_recent_results(self) -> List[Dict[str, Any]]:
        """
        Fetch recent results from the results table.
        
        Returns results from the last N hours (configured by time window)
        that haven't been processed yet (no corresponding royalty event).
        
        Returns:
            List of result records
        """
        try:
            # Calculate time cutoff
            cutoff_time = datetime.utcnow() - timedelta(hours=self.config.time_window_hours)
            
            # Fetch results above similarity threshold
            response = self.client.table("results") \
                .select("*") \
                .gte("similarity", self.config.similarity_threshold) \
                .gte("created_at", cutoff_time.isoformat()) \
                .order("created_at", desc=True) \
                .limit(self.config.batch_size) \
                .execute()
            
            results = response.data or []
            print(f"📊 Fetched {len(results)} results above threshold {self.config.similarity_threshold}")
            
            return results
        
        except Exception as e:
            print(f"❌ Error fetching results: {str(e)}")
            return []
    
    def find_matching_sdk_logs(
        self,
        track_id: str,
        result_created_at: str,
        time_window_minutes: int = 60
    ) -> List[Dict[str, Any]]:
        """
        Find SDK logs that match a result within a time window.
        
        Per PRD Section 5.4: Cross-validation against logged SDK use.
        
        Args:
            track_id: Track ID to search for
            result_created_at: Timestamp of the result
            time_window_minutes: Time window to search (before and after result)
        
        Returns:
            List of matching SDK logs
        """
        try:
            # Parse result timestamp
            result_time = datetime.fromisoformat(result_created_at.replace('Z', '+00:00'))
            
            # Calculate time window
            time_before = result_time - timedelta(minutes=time_window_minutes)
            time_after = result_time + timedelta(minutes=time_window_minutes)
            
            # Query SDK logs
            response = self.client.table("ai_use_logs") \
                .select("*") \
                .eq("track_id", track_id) \
                .gte("generated_at", time_before.isoformat()) \
                .lte("generated_at", time_after.isoformat()) \
                .execute()
            
            logs = response.data or []
            
            if logs:
                print(f"  ✓ Found {len(logs)} matching SDK log(s) for track {track_id}")
            
            return logs
        
        except Exception as e:
            print(f"  ❌ Error finding SDK logs: {str(e)}")
            return []
    
    def check_if_already_processed(self, result_id: str) -> bool:
        """
        Check if a result has already been processed into a royalty event.
        
        Args:
            result_id: Result ID to check
        
        Returns:
            bool: True if already processed, False otherwise
        """
        try:
            response = self.client.table("royalty_events") \
                .select("id") \
                .eq("result_id", result_id) \
                .execute()
            
            return len(response.data or []) > 0
        
        except Exception as e:
            print(f"  ⚠️ Error checking processed status: {str(e)}")
            return False
    
    def process_result(self, result: Dict[str, Any]) -> Optional[str]:
        """
        Process a single result and create royalty event if dual proof exists.
        
        Per PRD Section 5.4: Generates royalty events only when SDK log + auditor detection agree.
        
        Args:
            result: Result record from database
        
        Returns:
            Event ID if created, None otherwise
        """
        result_id = result.get("id")
        track_id = result.get("track_id")
        similarity = result.get("similarity")
        percent_influence = result.get("percent_influence")
        created_at = result.get("created_at")
        metadata = result.get("metadata", {})
        
        print(f"\n🔍 Processing result {result_id}")
        print(f"   Track: {track_id}")
        print(f"   Similarity: {similarity:.3f}")
        
        # Check if already processed
        if self.check_if_already_processed(result_id):
            print(f"  ⏭️  Already processed, skipping")
            return None
        
        # Find matching SDK logs
        sdk_logs = self.find_matching_sdk_logs(track_id, created_at)
        
        if not sdk_logs:
            print(f"  ⚠️  No matching SDK logs found - dual proof incomplete")
            return None
        
        # Use the first matching SDK log (could be enhanced to use best match)
        sdk_log = sdk_logs[0]
        
        # Create dual proof match
        dual_proof = DualProofMatch(
            track_id=track_id,
            result_id=result_id,
            ai_use_log_id=sdk_log["id"],
            similarity=similarity,
            sdk_confidence=sdk_log.get("confidence", 0.9),
            track_title=metadata.get("track_title", "Unknown"),
            artist=metadata.get("artist", "Unknown"),
            model_id=sdk_log.get("model_id", "unknown")
        )
        
        # Dry run check
        if self.config.dry_run:
            print(f"  🔄 DRY RUN: Would create royalty event")
            print(f"     Result ID: {result_id}")
            print(f"     SDK Log ID: {sdk_log['id']}")
            print(f"     Similarity: {similarity:.3f}")
            print(f"     SDK Confidence: {dual_proof.sdk_confidence:.3f}")
            return None
        
        # Create verified royalty event
        event = create_verified_royalty_event(
            dual_proof=dual_proof,
            duration_seconds=metadata.get("duration_seconds"),
            model_tier=sdk_log.get("metadata", {}).get("tier")
        )
        
        if event:
            print(f"  ✅ Created verified royalty event: {event.id}")
            return event.id
        else:
            print(f"  ❌ Failed to create royalty event")
            return None
    
    def run_audit_cycle(self) -> Dict[str, int]:
        """
        Run a single audit cycle.
        
        Returns:
            Dict with statistics: processed, matched, events_created
        """
        print("\n" + "="*70)
        print("🔍 ATTRIBUTION AUDITOR - Starting Audit Cycle")
        print("="*70)
        print(self.config)
        
        stats = {
            "processed": 0,
            "matched": 0,
            "events_created": 0,
            "already_processed": 0,
            "no_sdk_log": 0,
            "errors": 0
        }
        
        # Fetch recent results
        results = self.fetch_recent_results()
        
        if not results:
            print("\n✅ No new results to process")
            return stats
        
        # Process each result
        for result in results:
            stats["processed"] += 1
            
            try:
                # Check if already processed
                if self.check_if_already_processed(result["id"]):
                    stats["already_processed"] += 1
                    continue
                
                # Process and check for dual proof
                event_id = self.process_result(result)
                
                if event_id:
                    stats["matched"] += 1
                    stats["events_created"] += 1
                else:
                    # Check if it's because of no SDK log
                    sdk_logs = self.find_matching_sdk_logs(
                        result["track_id"],
                        result["created_at"]
                    )
                    if not sdk_logs:
                        stats["no_sdk_log"] += 1
            
            except Exception as e:
                print(f"❌ Error processing result {result.get('id')}: {str(e)}")
                stats["errors"] += 1
        
        # Print summary
        print("\n" + "="*70)
        print("📊 AUDIT CYCLE COMPLETE")
        print("="*70)
        print(f"Results Processed:    {stats['processed']}")
        print(f"Already Processed:    {stats['already_processed']}")
        print(f"Dual Proof Matched:   {stats['matched']}")
        print(f"Events Created:       {stats['events_created']}")
        print(f"No SDK Log:           {stats['no_sdk_log']}")
        print(f"Errors:               {stats['errors']}")
        print("="*70 + "\n")
        
        return stats
    
    def run_continuous(self):
        """
        Run the auditor continuously with polling interval.
        
        This is the main entry point for running the auditor as a background service.
        """
        import time
        
        print("\n🚀 Starting Attribution Auditor (continuous mode)")
        print(f"   Polling every {self.config.polling_interval_seconds} seconds")
        print(f"   Press Ctrl+C to stop\n")
        
        try:
            while True:
                # Run audit cycle
                self.run_audit_cycle()
                
                # Wait for next cycle
                print(f"⏳ Waiting {self.config.polling_interval_seconds} seconds until next cycle...")
                time.sleep(self.config.polling_interval_seconds)
        
        except KeyboardInterrupt:
            print("\n\n⏹️  Auditor stopped by user")
        except Exception as e:
            print(f"\n\n❌ Auditor crashed: {str(e)}")
            raise


def main():
    """Main entry point for the auditor job."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Attribution Auditor - Verifies dual proof and creates royalty events"
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run once and exit (default: continuous mode)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Dry run mode - don't create actual events"
    )
    parser.add_argument(
        "--threshold",
        type=float,
        help="Similarity threshold override"
    )
    parser.add_argument(
        "--time-window",
        type=int,
        help="Time window in hours override"
    )
    
    args = parser.parse_args()
    
    # Override config with CLI args
    if args.dry_run:
        os.environ["AUDITOR_DRY_RUN"] = "true"
    if args.threshold:
        os.environ["AUDITOR_SIMILARITY_THRESHOLD"] = str(args.threshold)
    if args.time_window:
        os.environ["AUDITOR_TIME_WINDOW_HOURS"] = str(args.time_window)
    
    # Create and run auditor
    config = AuditorConfig()
    auditor = AttributionAuditor(config)
    
    if args.once:
        # Run once and exit
        stats = auditor.run_audit_cycle()
        sys.exit(0 if stats["errors"] == 0 else 1)
    else:
        # Run continuously
        auditor.run_continuous()


if __name__ == "__main__":
    main()
