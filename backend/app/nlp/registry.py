from __future__ import annotations

from threading import Lock
from typing import Any, Optional

_MODEL_CACHE: dict[str, Any] = {}
_MODEL_LOCK = Lock()


def _set_cache(key: str, value: Any) -> Any:
    with _MODEL_LOCK:
        _MODEL_CACHE[key] = value
    return value


def _get_cache(key: str) -> Any:
    with _MODEL_LOCK:
        return _MODEL_CACHE.get(key)


def get_sentiment_pipeline() -> Any:
    cached = _get_cache("sentiment_pipeline")
    if cached is not None:
        return cached
    try:
        from transformers import pipeline

        pipe = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-xlm-roberta-base-sentiment",
            tokenizer="cardiffnlp/twitter-xlm-roberta-base-sentiment",
            truncation=True,
            max_length=512,
            device=-1,
        )
        return _set_cache("sentiment_pipeline", pipe)
    except Exception:
        return _set_cache("sentiment_pipeline", None)


def get_language_pipeline() -> Any:
    cached = _get_cache("language_pipeline")
    if cached is not None:
        return cached
    try:
        from transformers import pipeline

        pipe = pipeline(
            "text-classification",
            model="papluca/xlm-roberta-base-language-detection",
            tokenizer="papluca/xlm-roberta-base-language-detection",
            device=-1,
        )
        return _set_cache("language_pipeline", pipe)
    except Exception:
        return _set_cache("language_pipeline", None)


def get_go_emotions_pipeline() -> Any:
    cached = _get_cache("go_emotions_pipeline")
    if cached is not None:
        return cached
    try:
        from transformers import pipeline

        pipe = pipeline(
            "text-classification",
            model="SamLowe/roberta-base-go_emotions",
            tokenizer="SamLowe/roberta-base-go_emotions",
            top_k=None,
            device=-1,
        )
        return _set_cache("go_emotions_pipeline", pipe)
    except Exception:
        return _set_cache("go_emotions_pipeline", None)


def clear_model_cache() -> None:
    with _MODEL_LOCK:
        _MODEL_CACHE.clear()
