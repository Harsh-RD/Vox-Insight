from fastapi import APIRouter, Depends, Response, Cookie, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserMeResponse,
)
from app.schemas.user import UserResponse
from app.schemas.workspace import WorkspaceResponse
from app.services.auth import (
    register_user,
    authenticate_user,
    refresh_access_token,
    revoke_refresh_session,
)
from app.services.workspace import get_user_workspaces_with_role
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


def _set_refresh_cookie(response: Response, raw_refresh_token: str) -> None:
    """Helper to set the httpOnly refresh_token cookie on HTTP responses."""
    max_age_seconds = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    response.set_cookie(
        key="refresh_token",
        value=raw_refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path=f"{settings.API_V1_STR}/auth",
        max_age=max_age_seconds,
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    payload: UserRegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """Register a new user account, auto-create personal workspace, and return access token."""
    user, access_token, raw_refresh_token, _ = register_user(
        db, payload.email, payload.password, payload.name
    )
    _set_refresh_cookie(response, raw_refresh_token)

    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(user),
        },
    }


@router.post("/login")
def login(
    payload: UserLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """Authenticate user credentials and set httpOnly refresh token cookie."""
    user, access_token, raw_refresh_token, _ = authenticate_user(
        db, payload.email, payload.password
    )
    _set_refresh_cookie(response, raw_refresh_token)

    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(user),
        },
    }


@router.post("/refresh")
def refresh(
    response: Response,
    refresh_token: str = Cookie(None, alias="refresh_token"),
    db: Session = Depends(get_db),
):
    """Rotate refresh token and issue a new access token."""
    if not refresh_token:
        from app.core.exceptions import AuthenticationFailedException
        raise AuthenticationFailedException(message="Refresh token cookie missing")

    new_access_token, new_refresh_token, _, user = refresh_access_token(
        db, refresh_token
    )
    _set_refresh_cookie(response, new_refresh_token)

    return {
        "success": True,
        "data": {
            "access_token": new_access_token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(user),
        },
    }


@router.post("/logout")
def logout(
    response: Response,
    refresh_token: str = Cookie(None, alias="refresh_token"),
    db: Session = Depends(get_db),
):
    """Revoke server-side refresh session and clear refresh token cookie."""
    if refresh_token:
        revoke_refresh_session(db, refresh_token)

    response.delete_cookie(
        key="refresh_token",
        path=f"{settings.API_V1_STR}/auth",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )

    return {
        "success": True,
        "data": {
            "message": "Logged out successfully",
        },
    }


@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return authenticated user profile and associated workspace memberships."""
    workspace_tuples = get_user_workspaces_with_role(db, current_user.id)
    workspaces_data = [
        WorkspaceResponse(
            id=ws.id,
            name=ws.name,
            slug=ws.slug,
            owner_id=ws.owner_id,
            role=role,
            created_at=ws.created_at,
        )
        for ws, role in workspace_tuples
    ]

    return {
        "success": True,
        "data": {
            "user": UserResponse.model_validate(current_user),
            "workspaces": workspaces_data,
        },
    }
