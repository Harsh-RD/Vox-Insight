import uuid
from datetime import datetime, timezone
from typing import Optional, Tuple
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.refresh_session import RefreshSession
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    hash_token,
    decode_token,
)
from app.core.exceptions import (
    AuthenticationFailedException,
    ConflictException,
)
from app.services.user import get_user_by_email, create_user, get_user_by_id
from app.services.workspace import create_workspace_for_user


def register_user(
    db: Session, email: str, password: str, name: str
) -> Tuple[User, str, str, datetime]:
    """
    Register a new user:
    1. Verify email uniqueness
    2. Create User record with Argon2id password hash
    3. Auto-create a default 'Personal' workspace for the user
    4. Issue access token and refresh token
    5. Create server-side RefreshSession record with SHA-256 token hash
    """
    existing = get_user_by_email(db, email)
    if existing:
        raise ConflictException(message="A user with this email already exists")

    # Create user and default workspace
    user = create_user(db, email, password, name)
    create_workspace_for_user(db, user.id, name=f"{user.name}'s Personal Workspace", role="owner")

    # Generate tokens
    access_token = create_access_token(subject=user.id)
    raw_refresh_token, _, expires_at = create_refresh_token(subject=user.id)

    # Store refresh session
    session_record = RefreshSession(
        user_id=user.id,
        token_hash=hash_token(raw_refresh_token),
        expires_at=expires_at,
        created_at=datetime.now(timezone.utc),
    )
    db.add(session_record)
    db.commit()
    db.refresh(user)

    return user, access_token, raw_refresh_token, expires_at


def authenticate_user(
    db: Session, email: str, password: str
) -> Tuple[User, str, str, datetime]:
    """
    Authenticate user credentials:
    1. Lookup user by email
    2. Verify Argon2id password hash
    3. Issue access token and refresh token
    4. Store server-side RefreshSession
    """
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        raise AuthenticationFailedException(message="Invalid email or password")

    if not user.is_active:
        raise AuthenticationFailedException(message="User account is inactive")

    # Generate tokens
    access_token = create_access_token(subject=user.id)
    raw_refresh_token, _, expires_at = create_refresh_token(subject=user.id)

    # Store refresh session
    session_record = RefreshSession(
        user_id=user.id,
        token_hash=hash_token(raw_refresh_token),
        expires_at=expires_at,
        created_at=datetime.now(timezone.utc),
    )
    db.add(session_record)
    db.commit()

    return user, access_token, raw_refresh_token, expires_at


def refresh_access_token(
    db: Session, raw_refresh_token: str
) -> Tuple[str, str, datetime, User]:
    """
    Rotate refresh token and issue a new access token:
    1. Decode JWT to verify formatting and algorithm
    2. Compute SHA-256 token_hash
    3. Lookup RefreshSession in DB
    4. Check if session is revoked or expired
    5. Revoke existing session (rotate token)
    6. Issue new refresh token & new access token
    7. Persist new RefreshSession in DB
    """
    try:
        payload = decode_token(raw_refresh_token)
        if payload.get("type") != "refresh":
            raise AuthenticationFailedException(message="Invalid token type")
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise AuthenticationFailedException(message="Invalid token payload")
        user_id = uuid.UUID(user_id_str)
    except Exception:
        raise AuthenticationFailedException(message="Invalid or expired refresh token")

    token_h = hash_token(raw_refresh_token)
    stmt = select(RefreshSession).where(RefreshSession.token_hash == token_h)
    session_record = db.scalar(stmt)

    if not session_record:
        raise AuthenticationFailedException(message="Refresh session not found")

    now = datetime.now(timezone.utc)
    if session_record.revoked_at is not None:
        raise AuthenticationFailedException(message="Refresh session has been revoked")

    expires_at = session_record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at <= now:
        raise AuthenticationFailedException(message="Refresh session has expired")

    user = get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise AuthenticationFailedException(message="User not found or inactive")

    # Revoke old session (Rotation)
    session_record.revoked_at = now
    session_record.last_used_at = now

    # Create new tokens
    new_access_token = create_access_token(subject=user.id)
    new_raw_refresh_token, _, new_expires_at = create_refresh_token(subject=user.id)

    # Store new session
    new_session_record = RefreshSession(
        user_id=user.id,
        token_hash=hash_token(new_raw_refresh_token),
        expires_at=new_expires_at,
        created_at=now,
    )
    db.add(new_session_record)
    db.commit()

    return new_access_token, new_raw_refresh_token, new_expires_at, user


def revoke_refresh_session(db: Session, raw_refresh_token: str) -> None:
    """Revoke a refresh session by its raw token (used during logout)."""
    if not raw_refresh_token:
        return

    try:
        token_h = hash_token(raw_refresh_token)
        stmt = select(RefreshSession).where(RefreshSession.token_hash == token_h)
        session_record = db.scalar(stmt)

        if session_record and session_record.revoked_at is None:
            session_record.revoked_at = datetime.now(timezone.utc)
            db.commit()
    except Exception:
        pass  # Logout should succeed cleanly even if token is malformed
