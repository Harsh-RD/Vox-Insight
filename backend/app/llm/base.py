from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


class LLMProviderError(Exception):
    """A controlled provider failure safe to expose through the API."""

    def __init__(self, message: str, code: str = "LLM_UNAVAILABLE") -> None:
        self.code = code
        super().__init__(message)


@dataclass(frozen=True)
class LLMGeneration:
    content: str
    provider: str
    model: str


class LLMProvider(ABC):
    @abstractmethod
    async def generate(self, *, system_prompt: str, user_prompt: str) -> LLMGeneration:
        """Generate one response from explicitly supplied, bounded input."""
