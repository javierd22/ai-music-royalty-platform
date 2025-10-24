from supabase import create_client
import os, traceback

# Connect to Supabase using service key
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def log_event(event_type: str, details: dict):
    """
    Writes a structured log entry into the Supabase 'logs' table.
    Think of this as a black box recorder: every major event
    (upload, comparison, or error) gets written down here.
    """
    try:
        supabase.table("logs").insert({
            "event_type": event_type,
            "details": details
        }).execute()
    except Exception as e:
        print("❌ Log error:", e)
