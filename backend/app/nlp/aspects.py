from __future__ import annotations

import re
from typing import Any, Dict, List

ASPECT_KEYWORDS = {
    "app": ["app", "mobile app", "ui", "design", "interface"],
    "payment": ["payment", "refund", "billing", "charge", "wallet", "gateway"],
    "delivery": ["delivery", "shipping", "courier", "order"],
    "support": ["support", "agent", "customer service", "response"],
    "speed": ["speed", "slow", "lag", "loading", "performance"],
    "quality": ["quality", "build", "product", "material"],
}


def extract_aspects(text: str | None, sentiment_label: str | None = None) -> List[Dict[str, Any]]:
    raw = (text or "").strip()
    if not raw:
        return []

    lowered = raw.lower()
    found: List[Dict[str, Any]] = []
    for aspect, keywords in ASPECT_KEYWORDS.items():
        match = next((word for word in keywords if word in lowered), None)
        if not match:
            continue
        sentiment = sentiment_label or "neutral"
        score = 0.65 if sentiment == "positive" else 0.7 if sentiment == "negative" else 0.2
        found.append({
            "aspect_term": aspect,
            "normalized_aspect": aspect,
            "sentiment_label": sentiment,
            "sentiment_score": score,
            "confidence": score,
            "source": "heuristic",
        })

    if not found:
        for token in re.findall(r"[A-Za-z]+", lowered):
            if len(token) < 4:
                continue
            found.append({
                "aspect_term": token,
                "normalized_aspect": token,
                "sentiment_label": sentiment_label or "neutral",
                "sentiment_score": 0.1,
                "confidence": 0.1,
                "source": "heuristic",
            })
    return found[:5]
