import uuid

from app.models.analysis_result import AnalysisResult
from app.services.analysis import analyze_feedback, get_dataset_analysis_status


def _register(client, email: str, name: str = "Analysis User") -> str:
    response = client.post("/api/v1/auth/register", json={"email": email, "password": "Password123!", "name": name})
    return response.json()["data"]["access_token"]


def _workspace(client, token: str) -> str:
    response = client.get("/api/v1/workspaces", headers={"Authorization": f"Bearer {token}"})
    return response.json()["data"][0]["id"]


def _dataset(client, token: str, workspace_id: str, name: str = "Analyses") -> dict:
    response = client.post("/api/v1/datasets", headers={"Authorization": f"Bearer {token}"}, json={"workspace_id": workspace_id, "name": name, "source": "api"})
    return response.json()["data"]


def test_feedback_analysis_persists_and_reprocesses(client):
    token = _register(client, "analysis@example.com")
    workspace_id = _workspace(client, token)
    dataset = _dataset(client, token, workspace_id)
    upload = client.post(f"/api/v1/datasets/{dataset['id']}/upload", headers={"Authorization": f"Bearer {token}"}, files={"file": ("feedback.csv", b"text\nPayment failed and app is slow\n", "text/csv")})
    assert upload.status_code == 200
    feedback_id = client.get(f"/api/v1/datasets/{dataset['id']}/feedback", headers={"Authorization": f"Bearer {token}"}).json()["data"][0]["id"]

    response = client.post(f"/api/v1/feedback/{feedback_id}/analyze", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["status"] == "completed"
    assert payload["analysis"]["complaint_label"] in {True, False, None}
    assert payload["analysis"]["language"] in {"en", "hi", "other"}

    rerun = client.post(f"/api/v1/feedback/{feedback_id}/analyze", headers={"Authorization": f"Bearer {token}"})
    assert rerun.status_code == 200
    assert rerun.json()["data"]["analysis"]["feedback_id"] == feedback_id


def test_dataset_analysis_status_and_workspace_isolation(client):
    token = _register(client, "workspace-check@example.com")
    workspace_id = _workspace(client, token)
    dataset = _dataset(client, token, workspace_id)
    client.post(f"/api/v1/datasets/{dataset['id']}/upload", headers={"Authorization": f"Bearer {token}"}, files={"file": ("feedback.csv", b"text\nApp is great\n", "text/csv")})

    status_response = client.get(f"/api/v1/datasets/{dataset['id']}/analysis-status", headers={"Authorization": f"Bearer {token}"})
    assert status_response.status_code == 200
    assert status_response.json()["data"]["feedback_count"] == 1

    other_token = _register(client, "other-analysis@example.com")
    other_workspace = _workspace(client, other_token)
    other_dataset = _dataset(client, other_token, other_workspace)
    protected = client.get(f"/api/v1/datasets/{dataset['id']}/analysis-status", headers={"Authorization": f"Bearer {other_token}"})
    assert protected.status_code == 403
