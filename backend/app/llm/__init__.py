"""Replaceable LLM interfaces used by the grounded assistant."""

from app.llm.provider import get_llm_provider

__all__ = ["get_llm_provider"]
