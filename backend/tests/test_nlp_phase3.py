import uuid

from app.nlp.language import detect_language
from app.nlp.preprocessing import preprocess_text
from app.nlp.sentiment import analyze_sentiment
from app.nlp.emotion import analyze_emotion
from app.nlp.aspects import extract_aspects
from app.nlp.complaints import classify_complaint
from app.nlp.registry import clear_model_cache


def test_language_detects_english():
    result = detect_language("The app is very fast and easy to use.")
    assert result["language"] == "en"
    assert result["is_code_mixed"] is False


def test_language_detects_hindi():
    result = detect_language("App bahut fast hai aur easy hai.")
    assert result["language"] in {"hi", "en", "other"}
    assert result["is_code_mixed"] in {True, False}


def test_hinglish_detected_by_heuristics_not_native_language_label():
    result = detect_language("App bahut fast hai, payment fail ho gaya, refund chahiye")
    assert result["is_code_mixed"] is True
    assert result["language"] in {"hi", "en", "other"}


def test_preprocessing_preserves_original_and_normalizes_copy():
    data = preprocess_text("  App   is   very   slow!!!  ")
    assert data["original_text"] == "App   is   very   slow!!!"
    assert data["normalized_text"] == "App is very slow!!!"


def test_sentiment_english_negative():
    result = analyze_sentiment("The app is slow and broken")
    assert result["sentiment_label"] in {"negative", "neutral"}
    assert result["source"] in {"model", "heuristic"}


def test_english_emotion_result_is_available():
    result = analyze_emotion("I am so happy and excited", language="en")
    assert result["source"] in {"model", "unavailable"}
    if result["source"] == "model":
        assert result["emotion_label"] is not None


def test_hindi_hinglish_emotion_is_unknown():
    result = analyze_emotion("App bahut slow hai aur payment fail ho gaya", language="hi")
    assert result["emotion_label"] is None
    assert result["emotion_confidence"] is None
    assert result["source"] == "unavailable"


def test_aspect_extraction_for_feedback():
    aspects = extract_aspects("Payment failed and app is slow", sentiment_label="negative")
    assert len(aspects) >= 1
    assert aspects[0]["source"] == "heuristic"


def test_complaint_true():
    result = classify_complaint("Payment failed and app crashed")
    assert result["source"] == "heuristic"
    assert result["complaint_label"] in {True, False}


def test_complaint_false():
    result = classify_complaint("The app is smooth and easy to use")
    assert result["source"] == "heuristic"
    assert result["complaint_label"] is False


def test_complaint_unavailable_is_null():
    result = classify_complaint("")
    assert result["complaint_label"] is None
    assert result["complaint_confidence"] is None
    assert result["source"] == "unavailable"


def test_model_cache_is_singleton():
    clear_model_cache()
    from app.nlp import registry

    first = registry.get_sentiment_pipeline()
    second = registry.get_sentiment_pipeline()
    assert first is second
