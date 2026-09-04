"""Tests for Phase 8: Production Hardening, Deployment Readiness, and Security Safeguards."""
import io
import pytest

from app.config import settings
from app.core.exceptions import AppException


def _register_and_get_auth(client, email: str = "hardening@example.com"):
    res = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "SecurePassword123!", "name": "Hardening User"},
    )
    data = res.json()["data"]
    token = data["access_token"]
    ws_res = client.get("/api/v1/workspaces", headers={"Authorization": f"Bearer {token}"})
    workspace_id = ws_res.json()["data"][0]["id"]
    return token, workspace_id


def test_cors_origins_configuration():
    """Verify CORS origins parsing behaves deterministically."""
    origins = settings.get_cors_origins()
    assert "http://localhost:3000" in origins
    assert "http://127.0.0.1:3000" in origins
    assert settings.FRONTEND_URL.rstrip("/") in origins


def test_analytics_dataset_comparison_invalid_ids_returns_422(client):
    """Verify that malformed dataset_ids query returns 422 AppException, not 500."""
    token, workspace_id = _register_and_get_auth(client, "analytics_err@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Pass invalid UUID string
    response = client.get(
        f"/api/v1/analytics/datasets?workspace_id={workspace_id}&dataset_ids=invalid-uuid,not-a-uuid",
        headers=headers,
    )
    assert response.status_code == 422
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"]["code"] == "INVALID_DATASET_IDS"


def test_csv_upload_size_limit_enforced(client, monkeypatch):
    """Verify that uploading a CSV exceeding MAX_UPLOAD_SIZE_BYTES returns a 422 error."""
    token, workspace_id = _register_and_get_auth(client, "upload_limit@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Create a dataset
    ds_res = client.post(
        "/api/v1/datasets",
        headers=headers,
        json={"workspace_id": workspace_id, "name": "Size Limit Test"},
    )
    dataset_id = ds_res.json()["data"]["id"]

    # Temporarily set max upload size to 50 bytes for test
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_BYTES", 50)

    oversized_csv = b"text\nThis is a long feedback line that easily exceeds fifty bytes of payload.\n"
    response = client.post(
        f"/api/v1/datasets/{dataset_id}/upload",
        headers=headers,
        files={"file": ("oversized.csv", oversized_csv, "text/csv")},
    )
    assert response.status_code == 422
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"]["code"] == "INVALID_CSV"
    assert "exceeds the maximum allowed limit" in payload["error"]["message"]


def test_health_check_endpoint_contract(client):
    """Verify the health endpoint adheres to expected JSON envelope."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert "status" in payload["data"]
    assert "database" in payload["data"]
    assert "timestamp" in payload["data"]
