from __future__ import annotations

from typing import Any, Dict

COMPLAINT_KEYWORDS = [
    "problem", "issue", "broken", "not working", "refund", "charge", "charged",
    "delay", "late", "bug", "error", "failed", "frustrated", "worst", "crash",
    "payment failed", "service down", "doesn't work", "not responding"
]


def classify_complaint(text: str | None) -> Dict[str, Any]:
    raw = (text or "").strip()
    if not raw:
        return {"complaint_label": None, "complaint_confidence": None, "source": "unavailable"}

    lowered = raw.lower()
    matches = sum(1 for phrase in COMPLAINT_KEYWORDS if phrase in lowered)
    if matches >= 1:
        return {"complaint_label": True, "complaint_confidence": 0.72, "source": "heuristic"}
    return {"complaint_label": False, "complaint_confidence": 0.68, "source": "heuristic"}
