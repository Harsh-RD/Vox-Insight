import uuid
from typing import Generator
from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.core.security import decode_token
from app.core.exceptions import AuthenticationFailedException
from app.services.user import get_user_by_id


def get_current_user(
    authorization: str = Header(..., description="Bearer <JWT_ACCESS_TOKEN>"),
    db: Session = Depends(get_db),
) -> User:
    """Dependency to extract, decode, and validate the JWT access token from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise AuthenticationFailedException(message="Missing or invalid Authorization header scheme")

    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise AuthenticationFailedException(message="Invalid token type")

        user_id_str = payload.get("sub")
        if not user_id_str:
            raise AuthenticationFailedException(message="Invalid token payload")

        user_id = uuid.UUID(user_id_str)
    except Exception:
        raise AuthenticationFailedException(message="Could not validate credentials or token expired")

    user = get_user_by_id(db, user_id)
    if not user:
        raise AuthenticationFailedException(message="User not found")

    if not user.is_active:
        raise AuthenticationFailedException(message="User account is inactive")

    return user
