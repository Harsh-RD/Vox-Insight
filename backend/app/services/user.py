import uuid
from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from app.core.security import hash_password


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Retrieve a user by email address."""
    stmt = select(User).where(User.email == email.lower())
    return db.scalar(stmt)


def get_user_by_id(db: Session, user_id: uuid.UUID) -> Optional[User]:
    """Retrieve a user by primary key UUID."""
    stmt = select(User).where(User.id == user_id)
    return db.scalar(stmt)


def create_user(db: Session, email: str, password: str, name: str) -> User:
    """Create and persist a new User record with Argon2id hashed password."""
    user = User(
        email=email.lower().strip(),
        hashed_password=hash_password(password),
        name=name.strip(),
        is_active=True,
    )
    db.add(user)
    db.flush()  # Flush to populate user.id before commit if needed
    return user
