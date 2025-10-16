from datetime import timedelta
from typing import Optional

FUSION_WINDOW_HOURS = 24
MIN_PAYABLE_SCORE = 0.85

def decide_event(partner_log: Optional[dict], auditor_match: Optional[dict]) -> dict:
    """
    Returns a dict with status and payable boolean.
    """
    if partner_log and auditor_match:
        score = float(auditor_match.get("match_score", 0))
        if score >= MIN_PAYABLE_SCORE:
            return {"status": "verified", "payable": True}
        return {"status": "pending", "payable": False}
    if partner_log and not auditor_match:
        return {"status": "training_only", "payable": False}
    if auditor_match and not partner_log:
        return {"status": "suspected", "payable": False}
    return {"status": "pending", "payable": False}