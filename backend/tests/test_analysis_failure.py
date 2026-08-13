def _register(client, email: str) -> str:
    resp = client.post("/api/v1/auth/register", json={"email": email, "password": "Password123!", "name": "Test"})
    return resp.json()["data"]["access_token"]


def _workspace(client, token: str) -> str:
    resp = client.get("/api/v1/workspaces", headers={"Authorization": f"Bearer {token}"})
    return resp.json()["data"][0]["id"]


def _dataset(client, token: str, workspace_id: str) -> dict:
    resp = client.post("/api/v1/datasets", headers={"Authorization": f"Bearer {token}"}, json={"workspace_id": workspace_id, "name": "Failures", "source": "api"})
    return resp.json()["data"]


def test_analysis_failure_sets_failed_status(client):
    token = _register(client, "fail-analysis@example.com")
    workspace_id = _workspace(client, token)
    dataset = _dataset(client, token, workspace_id)
    upload = client.post(f"/api/v1/datasets/{dataset['id']}/upload", headers={"Authorization": f"Bearer {token}"}, files={"file": ("feedback.csv", b"text\nGood service\n", "text/csv")})
    feedback_id = client.get(f"/api/v1/datasets/{dataset['id']}/feedback", headers={"Authorization": f"Bearer {token}"}).json()["data"][0]["id"]

    from app.services import analysis as analysis_service

    def boom(*args, **kwargs):
        raise RuntimeError("simulated model failure")

    original = analysis_service.run_nlp_pipeline
    analysis_service.run_nlp_pipeline = boom
    try:
        result = client.post(f"/api/v1/feedback/{feedback_id}/analyze", headers={"Authorization": f"Bearer {token}"})
    finally:
        analysis_service.run_nlp_pipeline = original

    assert result.status_code == 200
    assert result.json()["data"]["status"] == "failed"
