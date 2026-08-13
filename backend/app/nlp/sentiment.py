from __future__ import annotations

from typing import Any, Dict

from .registry import get_sentiment_pipeline


def _normalize_sentiment_label(label: str) -> str:
    label = str(label).upper()
    if label in {"LABEL_0", "NEGATIVE"}:
        return "negative"
    if label in {"LABEL_1", "NEUTRAL"}:
        return "neutral"
    if label in {"LABEL_2", "POSITIVE"}:
        return "positive"
    return label.lower()


def analyze_sentiment(text: str | None) -> Dict[str, Any]:
    raw = (text or "").strip()
    if not raw:
        return {"sentiment_label": None, "sentiment_score": None, "source": "unavailable"}

    pipeline = get_sentiment_pipeline()
    if pipeline is not None:
        try:
            result = pipeline(raw, truncation=True, max_length=512)
            if isinstance(result, list) and result:
                top = result[0]
                label = _normalize_sentiment_label(str(top.get("label", "neutral")))
                score = float(top.get("score", 0.0) or 0.0)
                return {"sentiment_label": label, "sentiment_score": score, "source": "model"}
        except Exception:
            pass

    lowered = raw.lower()
    negative_hits = [
        "bad", "terrible", "worst", "bug", "slow", "broken", "angry", "hate", "not working",
        "delay", "late", "refund", "payment failed", "issue", "problem", "frustrated"
    ]
    positive_hits = [
        "good", "great", "amazing", "excellent", "love", "fast", "smooth", "perfect", "nice",
        "helpful", "easy", "best"
    ]
    negative_score = sum(1 for word in negative_hits if word in lowered)
    positive_score = sum(1 for word in positive_hits if word in lowered)
    if negative_score > positive_score:
        return {"sentiment_label": "negative", "sentiment_score": 0.65, "source": "heuristic"}
    if positive_score > negative_score:
        return {"sentiment_label": "positive", "sentiment_score": 0.7, "source": "heuristic"}
    return {"sentiment_label": "neutral", "sentiment_score": 0.0, "source": "heuristic"}
