"""
Seed script for Dual Proof PENDING example
Creates: track + result + SDK log (within time window) = PENDING dual proof status
"""

import os
import sys
from datetime import datetime, timedelta

from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server.utils.db import get_supabase_client

load_dotenv()


def seed_pending_dual_proof():
    """Create a Pending dual proof example"""
    supabase = get_supabase_client()

    print("🌱 Seeding Dual Proof PENDING example...")
    print()

    # 1. Create a demo track
    print("1. Creating demo track...")
    track_data = {
        "title": "Demo Track - Pending Dual Proof",
        "storage_url": "local://demo/pending-dual-proof.mp3",
    }

    track_result = supabase.table("tracks").insert(track_data).execute()

    if not track_result.data:
        print("✗ Failed to create track")
        return

    track = track_result.data[0]
    track_id = track["id"]
    print(f"✓ Track created: {track_id}")
    print(f"  Title: {track['title']}")
    print()

    # 2. Create a result (attribution auditor detection)
    print("2. Creating attribution result...")
    result_timestamp = datetime.utcnow()

    result_data = {
        "track_id": track_id,
        "source_file": "ai-generated-output-pending.wav",
        "similarity": 0.88,  # Above threshold (0.85)
        "percent_influence": 0.65,
        "created_at": result_timestamp.isoformat(),
        "metadata": {
            "track_title": "Demo Track - Pending Dual Proof",
            "embedding_model": "mfcc",
        },
    }

    result_result = supabase.table("results").insert(result_data).execute()

    if not result_result.data:
        print("✗ Failed to create result")
        return

    result = result_result.data[0]
    result_id = result["id"]
    print(f"✓ Result created: {result_id}")
    print(f"  Similarity: {result['similarity']} (above threshold)")
    print(f"  Timestamp: {result['created_at']}")
    print()

    # 3. Create SDK log within time window
    print("3. Creating SDK log (within time window)...")
    # Create log 2 minutes after result (within default 10-minute window)
    sdk_log_timestamp = result_timestamp + timedelta(minutes=2)

    sdk_log_data = {
        "model_id": "suno-v3-demo",
        "track_id": track_id,
        "prompt": "upbeat electronic dance music with heavy bass",
        "confidence": 0.92,
        "created_at": sdk_log_timestamp.isoformat(),
        "metadata": {
            "session_id": "demo-session-pending",
            "output_id": "output-pending-123",
        },
    }

    sdk_log_result = supabase.table("ai_use_logs").insert(sdk_log_data).execute()

    if not sdk_log_result.data:
        print("✗ Failed to create SDK log")
        return

    sdk_log = sdk_log_result.data[0]
    sdk_log_id = sdk_log["id"]
    print(f"✓ SDK log created: {sdk_log_id}")
    print(f"  Model: {sdk_log['model_id']}")
    print(f"  Confidence: {sdk_log['confidence']}")
    print(f"  Timestamp: {sdk_log['created_at']}")
    print()

    # Calculate time difference
    time_diff = (sdk_log_timestamp - result_timestamp).total_seconds() / 60
    print(f"⏱  Time difference: {time_diff:.1f} minutes (within 10-minute window)")
    print()

    # Summary
    print("=" * 60)
    print("✓ PENDING Dual Proof Example Created!")
    print("=" * 60)
    print()
    print(f"Track ID:     {track_id}")
    print(f"Result ID:    {result_id}")
    print(f"SDK Log ID:   {sdk_log_id}")
    print()
    print("Dual Proof Status: PENDING")
    print("  ✓ Auditor detected similarity (0.88 ≥ 0.85 threshold)")
    print("  ✓ SDK log within time window (2 minutes)")
    print("  ✗ No royalty event created yet")
    print()
    print("View in dashboard:")
    print(f"  SDK Logs: http://localhost:3000/dashboard/logs")
    print(f"  SDK Log Detail: http://localhost:3000/dashboard/logs/{sdk_log_id}")
    print()
    print("Next step: Create royalty event to make status CONFIRMED")
    print()


if __name__ == "__main__":
    try:
        seed_pending_dual_proof()
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback

        traceback.print_exc()

