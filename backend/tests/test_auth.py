from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.models.refresh_session import RefreshSession
from app.core.security import create_refresh_token, hash_token


def test_register_user_success(client):
    """Verify user registration returns 201, user profile, access token, and sets httpOnly refresh cookie."""
    payload = {
        "email": "alice@example.com",
        "password": "Password123!",
        "name": "Alice Tester",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()["data"]
    assert "access_token" in data
    assert data["user"]["email"] == "alice@example.com"
    assert data["user"]["name"] == "Alice Tester"
    assert "refresh_token" in response.cookies


def test_register_duplicate_email_fails(client):
    """Verify registration with an existing email returns 409 conflict."""
    payload = {
        "email": "bob@example.com",
        "password": "Password123!",
        "name": "Bob Tester",
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409
    assert res2.json()["error"]["code"] == "CONFLICT"


def test_login_success(client):
    """Verify login with correct credentials returns 200, access token, and sets refresh cookie."""
    reg_payload = {
        "email": "charlie@example.com",
        "password": "Password123!",
        "name": "Charlie Tester",
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    login_payload = {
        "email": "charlie@example.com",
        "password": "Password123!",
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()["data"]
    assert "access_token" in data
    assert data["user"]["email"] == "charlie@example.com"
    assert "refresh_token" in response.cookies


def test_login_wrong_password_fails(client):
    """Verify login with incorrect password returns 401."""
    reg_payload = {
        "email": "dave@example.com",
        "password": "Password123!",
        "name": "Dave Tester",
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    login_payload = {
        "email": "dave@example.com",
        "password": "WrongPassword!",
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTHENTICATION_FAILED"


def test_get_me_success(client):
    """Verify GET /api/v1/auth/me returns current user profile and workspaces."""
    reg_payload = {
        "email": "eve@example.com",
        "password": "Password123!",
        "name": "Eve Tester",
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    token = reg_res.json()["data"]["access_token"]

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["user"]["email"] == "eve@example.com"
    assert len(data["workspaces"]) == 1
    assert "Eve Tester's Personal Workspace" in data["workspaces"][0]["name"]


def test_get_me_unauthenticated_fails(client):
    """Verify GET /api/v1/auth/me without token returns 401."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 422  # Missing required header validation


def test_refresh_token_success_and_rotates_token(client, db_session):
    """Verify refreshing access token rotates the refresh token and creates new session."""
    reg_payload = {
        "email": "frank@example.com",
        "password": "Password123!",
        "name": "Frank Tester",
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    old_refresh_cookie = reg_res.cookies.get("refresh_token")

    # Perform refresh
    client.cookies.set("refresh_token", old_refresh_cookie)
    refresh_res = client.post("/api/v1/auth/refresh")
    assert refresh_res.status_code == 200
    assert "access_token" in refresh_res.json()["data"]
    new_refresh_cookie = refresh_res.cookies.get("refresh_token")
    assert new_refresh_cookie != old_refresh_cookie

    # Check old refresh token session is marked revoked in DB
    old_hash = hash_token(old_refresh_cookie)
    stmt = select(RefreshSession).where(RefreshSession.token_hash == old_hash)
    old_session = db_session.scalar(stmt)
    assert old_session is not None
    assert old_session.revoked_at is not None


def test_reuse_rotated_refresh_token_fails(client):
    """Verify attempting to reuse a previously rotated refresh token is rejected with 401."""
    reg_payload = {
        "email": "grace@example.com",
        "password": "Password123!",
        "name": "Grace Tester",
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    old_refresh_cookie = reg_res.cookies.get("refresh_token")

    # Rotate token first time
    client.cookies.set("refresh_token", old_refresh_cookie)
    client.post("/api/v1/auth/refresh")

    # Try to reuse the old refresh token second time
    client.cookies.set("refresh_token", old_refresh_cookie)
    second_refresh_res = client.post("/api/v1/auth/refresh")
    assert second_refresh_res.status_code == 401
    assert second_refresh_res.json()["error"]["code"] == "AUTHENTICATION_FAILED"


def test_logout_revokes_refresh_session(client, db_session):
    """Verify logout revokes the server-side refresh session and clears the cookie."""
    reg_payload = {
        "email": "helen@example.com",
        "password": "Password123!",
        "name": "Helen Tester",
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    refresh_cookie = reg_res.cookies.get("refresh_token")

    client.cookies.set("refresh_token", refresh_cookie)
    logout_res = client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 200

    # Verify session is revoked in DB
    token_h = hash_token(refresh_cookie)
    stmt = select(RefreshSession).where(RefreshSession.token_hash == token_h)
    session_rec = db_session.scalar(stmt)
    assert session_rec is not None
    assert session_rec.revoked_at is not None


def test_refresh_with_revoked_token_fails(client):
    """Verify refresh request fails after logout."""
    reg_payload = {
        "email": "ian@example.com",
        "password": "Password123!",
        "name": "Ian Tester",
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    refresh_cookie = reg_res.cookies.get("refresh_token")

    client.cookies.set("refresh_token", refresh_cookie)
    client.post("/api/v1/auth/logout")

    client.cookies.set("refresh_token", refresh_cookie)
    res = client.post("/api/v1/auth/refresh")
    assert res.status_code == 401


def test_refresh_with_expired_token_fails(client, db_session):
    """Verify refresh fails when the refresh session has expired."""
    reg_payload = {
        "email": "jack@example.com",
        "password": "Password123!",
        "name": "Jack Tester",
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    refresh_cookie = reg_res.cookies.get("refresh_token")

    # Manually expire the session in DB
    token_h = hash_token(refresh_cookie)
    stmt = select(RefreshSession).where(RefreshSession.token_hash == token_h)
    session_rec = db_session.scalar(stmt)
    session_rec.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
    db_session.commit()

    client.cookies.set("refresh_token", refresh_cookie)
    res = client.post("/api/v1/auth/refresh")
    assert res.status_code == 401
