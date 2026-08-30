"""Lazy, reusable sentence-embedding interfaces."""

from app.embeddings.service import embed_text, embed_texts

__all__ = ["embed_text", "embed_texts"]
