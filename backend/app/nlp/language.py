from __future__ import annotations

import re
from typing import Any, Dict

from .registry import get_language_pipeline

DEVANAGARI_RE = re.compile(r"[\u0900-\u097F]")
ROMANIZED_HINDI_HINTS = {
    "acha", "accha", "achha", "bahut", "nahi", "kya", "kya", "samajh", "problem",
    "service", "delivery", "payment", "refund", "charge", "wahi", "ganda", "bura",
    "sahi", "galat", "maza", "good", "bad", "delay", "late", "please",
}


def _looks_like_english(text: str) -> bool:
    alpha = re.sub(r"[^A-Za-z]", "", text)
    return len(alpha) > 0 and len(alpha) / max(len(text.replace(" ", "")), 1) > 0.7


def _contains_hindi_words(text: str) -> bool:
    lowered = text.lower()
    tokens = re.findall(r"[a-zA-Z]+", lowered)
    if not tokens:
        return False
    matches = sum(1 for token in tokens if token in ROMANIZED_HINDI_HINTS)
    return matches >= 1


def _detect_script(text: str) -> str:
    if not text:
        return "unknown"
    has_devanagari = bool(DEVANAGARI_RE.search(text))
    has_latin = bool(re.search(r"[A-Za-z]", text))
    if has_devanagari and has_latin:
        return "mixed"
    if has_devanagari:
        return "devanagari"
    if has_latin:
        return "latin"
    return "unknown"


def detect_language(text: str | None) -> Dict[str, Any]:
    raw_text = (text or "").strip()
    if not raw_text:
        return {"language": "other", "language_confidence": 0.0, "script": "unknown", "is_code_mixed": False}

    script = _detect_script(raw_text)
    text_lower = raw_text.lower()
    is_mixed = script == "mixed" or (_contains_hindi_words(raw_text) and _looks_like_english(raw_text))

    pipeline = get_language_pipeline()
    if pipeline is not None:
        try:
            result = pipeline(raw_text, truncation=True, max_length=512)
            if isinstance(result, list) and result:
                top = result[0]
                label = str(top.get("label", "other")).lower()
                score = float(top.get("score", 0.0) or 0.0)
                if label in {"en", "english"}:
                    return {
                        "language": "en",
                        "language_confidence": score,
                        "script": script,
                        "is_code_mixed": is_mixed,
                    }
                if label in {"hi", "hindi"}:
                    return {
                        "language": "hi",
                        "language_confidence": score,
                        "script": script,
                        "is_code_mixed": is_mixed,
                    }
        except Exception:
            pass

    has_devanagari = bool(DEVANAGARI_RE.search(raw_text))
    has_roman_hindi = _contains_hindi_words(raw_text)
    if has_devanagari:
        return {"language": "hi", "language_confidence": 0.9, "script": script, "is_code_mixed": is_mixed}
    if has_roman_hindi or is_mixed:
        return {"language": "hi", "language_confidence": 0.82, "script": script, "is_code_mixed": True}
    if _looks_like_english(raw_text):
        return {"language": "en", "language_confidence": 0.88, "script": script, "is_code_mixed": False}
    return {"language": "other", "language_confidence": 0.5, "script": script, "is_code_mixed": is_mixed}
