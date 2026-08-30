from __future__ import annotations

from threading import Lock
from typing import Any

from app.config import settings

_MODEL: Any | None = None
_LOCK = Lock()


def get_embedding_model() -> Any:
    """Load the sentence-transformer once, only when embeddings are requested."""
    global _MODEL
    if _MODEL is not None:
        return _MODEL
    with _LOCK:
        if _MODEL is None:
            try:
                from sentence_transformers import SentenceTransformer
            except ImportError as exc:  # pragma: no cover - deployment configuration
                raise RuntimeError("Sentence Transformers is required for semantic retrieval") from exc
            _MODEL = SentenceTransformer(settings.EMBEDDING_MODEL, device="cpu")
    return _MODEL


def clear_embedding_model_cache() -> None:
    global _MODEL
    with _LOCK:
        _MODEL = None
