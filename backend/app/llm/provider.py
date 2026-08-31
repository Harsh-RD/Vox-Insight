from __future__ import annotations

import httpx

from app.config import settings
from app.llm.base import LLMGeneration, LLMProvider, LLMProviderError


class OpenAIProvider(LLMProvider):
    """Small OpenAI Chat Completions adapter with no SDK coupling."""

    async def generate(self, *, system_prompt: str, user_prompt: str) -> LLMGeneration:
        if not settings.LLM_API_KEY:
            raise LLMProviderError("The configured LLM provider is not available", "LLM_NOT_CONFIGURED")
        try:
            async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
                response = await client.post(
                    f"{settings.LLM_BASE_URL.rstrip('/')}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.LLM_API_KEY}"},
                    json={"model": settings.LLM_MODEL, "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ], "temperature": 0.1},
                )
        except httpx.TimeoutException as exc:
            raise LLMProviderError("The LLM provider timed out", "LLM_TIMEOUT") from exc
        except httpx.HTTPError as exc:
            raise LLMProviderError("The LLM provider is unavailable", "LLM_UNAVAILABLE") from exc
        if response.status_code == 429:
            raise LLMProviderError("The LLM provider rate limit was reached", "LLM_RATE_LIMITED")
        if response.status_code >= 400:
            raise LLMProviderError("The LLM provider could not generate an answer", "LLM_UNAVAILABLE")
        try:
            content = response.json()["choices"][0]["message"]["content"].strip()
        except (KeyError, IndexError, TypeError, ValueError, AttributeError) as exc:
            raise LLMProviderError("The LLM provider returned an invalid response", "LLM_MALFORMED_RESPONSE") from exc
        if not content:
            raise LLMProviderError("The LLM provider returned an empty response", "LLM_MALFORMED_RESPONSE")
        return LLMGeneration(content=content, provider="openai", model=settings.LLM_MODEL)


def get_llm_provider() -> LLMProvider:
    if settings.LLM_PROVIDER.lower() == "openai":
        return OpenAIProvider()
    raise LLMProviderError("The configured LLM provider is not supported", "LLM_PROVIDER_UNSUPPORTED")
