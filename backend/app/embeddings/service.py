from __future__ import annotations

from typing import Sequence

import numpy as np

from app.config import settings
from app.embeddings.registry import get_embedding_model


def _usable_text(text: str) -> str:
    value = text.strip()
    if not value:
        raise ValueError("Text must not be empty")
    return value


def _normalize(vectors: np.ndarray) -> np.ndarray:
    vectors = np.asarray(vectors, dtype=np.float32)
    if vectors.ndim != 2 or vectors.shape[1] != settings.EMBEDDING_DIMENSION:
        raise ValueError(f"Expected embeddings with dimension {settings.EMBEDDING_DIMENSION}")
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    if np.any(norms == 0):
        raise ValueError("Embedding model returned a zero vector")
    return np.ascontiguousarray(vectors / norms, dtype=np.float32)


def embed_texts(texts: Sequence[str]) -> np.ndarray:
    """Return one unit-normalized float32 vector per input text."""
    clean_texts = [_usable_text(text) for text in texts]
    if not clean_texts:
        return np.empty((0, settings.EMBEDDING_DIMENSION), dtype=np.float32)
    model = get_embedding_model()
    vectors = model.encode(
        clean_texts,
        batch_size=settings.EMBEDDING_BATCH_SIZE,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return _normalize(vectors)


def embed_text(text: str) -> np.ndarray:
    return embed_texts([text])[0]
