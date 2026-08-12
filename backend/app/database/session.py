from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.config import settings

# Create SQLAlchemy Engine
# Note: pool_pre_ping checks connection validity before checkout
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a transactional database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
