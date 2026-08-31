import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env file."""

    # Project metadata
    PROJECT_NAME: str = "VoxInsight Backend"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+psycopg://voxinsight:voxinsight_dev@localhost:5432/voxinsight"

    # Authentication & Security
    # Required in every non-test environment. Do not provide a source-level
    # default: an application started without a configured secret must fail.
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Cookie Security
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"

    # Semantic retrieval
    EMBEDDING_MODEL: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    EMBEDDING_DIMENSION: int = 384
    EMBEDDING_BATCH_SIZE: int = 32
    FAISS_INDEX_DIR: Path = PROJECT_ROOT / "data" / "faiss"

    # RAG / grounded assistant. The OpenAI-compatible provider is intentionally
    # configured only through environment variables; no credentials live in code.
    LLM_PROVIDER: str = "openai"
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_API_KEY: str | None = None
    LLM_BASE_URL: str = "https://api.openai.com/v1"
    LLM_TIMEOUT_SECONDS: float = 30.0
    RAG_TOP_K: int = 12
    RAG_MAX_CONTEXT_ITEMS: int = 8
    RAG_MAX_CONTEXT_CHARS: int = 12000
    RAG_MAX_HISTORY_MESSAGES: int = 6
    RAG_MIN_SIMILARITY: float = 0.20

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
