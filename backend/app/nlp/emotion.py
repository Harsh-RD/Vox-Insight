from __future__ import annotations

from typing import Any, Dict

from .registry import get_go_emotions_pipeline


def analyze_emotion(text: str | None, language: str | None = None) -> Dict[str, Any]:
    raw = (text or "").strip()
    if not raw:
        return {"emotion_label": None, "emotion_confidence": None, "source": "unavailable"}

    if language and language not in {"en", "english"}:
        return {"emotion_label": None, "emotion_confidence": None, "source": "unavailable"}

    pipeline = get_go_emotions_pipeline()
    if pipeline is not None:
        try:
            result = pipeline(raw, truncation=True, max_length=512)
            if isinstance(result, list):
                if result and isinstance(result[0], list):
                    first = result[0][0]
                    return {
                        "emotion_label": str(first.get("label", "neutral")).lower(),
                        "emotion_confidence": float(first.get("score", 0.0) or 0.0),
                        "source": "model",
                    }
                if result:
                    first = result[0]
                    return {
                        "emotion_label": str(first.get("label", "neutral")).lower(),
                        "emotion_confidence": float(first.get("score", 0.0) or 0.0),
                        "source": "model",
                    }
        except Exception:
            pass

    return {"emotion_label": None, "emotion_confidence": None, "source": "unavailable"}
