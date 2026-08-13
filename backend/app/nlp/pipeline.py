from __future__ import annotations

from typing import Any, Dict, List

from .aspects import extract_aspects
from .complaints import classify_complaint
from .emotion import analyze_emotion
from .language import detect_language
from .preprocessing import preprocess_text
from .sentiment import analyze_sentiment


def analyze(feedback_text: str | None) -> Dict[str, Any]:
    source_text = feedback_text or ""
    cleaned = preprocess_text(source_text)
    language_info = detect_language(source_text)
    sentiment = analyze_sentiment(cleaned["normalized_text"] or source_text)
    emotion = analyze_emotion(cleaned["normalized_text"] or source_text, language_info.get("language"))
    complaint = classify_complaint(cleaned["normalized_text"] or source_text)
    aspects = extract_aspects(cleaned["normalized_text"] or source_text, sentiment.get("sentiment_label"))

    return {
        "original_text": cleaned["original_text"],
        "normalized_text": cleaned["normalized_text"],
        "language": language_info.get("language"),
        "language_confidence": language_info.get("language_confidence"),
        "script": language_info.get("script"),
        "is_code_mixed": language_info.get("is_code_mixed"),
        "sentiment_label": sentiment.get("sentiment_label"),
        "sentiment_score": sentiment.get("sentiment_score"),
        "sentiment_source": sentiment.get("source"),
        "emotion_label": emotion.get("emotion_label"),
        "emotion_confidence": emotion.get("emotion_confidence"),
        "emotion_source": emotion.get("source"),
        "complaint_label": complaint.get("complaint_label"),
        "complaint_confidence": complaint.get("complaint_confidence"),
        "complaint_source": complaint.get("source"),
        "aspects": aspects,
    }
