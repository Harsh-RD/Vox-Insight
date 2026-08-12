import io


def register(client, email: str, name: str = "Dataset User") -> str:
    response = client.post("/api/v1/auth/register", json={"email": email, "password": "Password123!", "name": name})
    return response.json()["data"]["access_token"]


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def personal_workspace(client, token: str) -> str:
    response = client.get("/api/v1/workspaces", headers=auth(token))
    return response.json()["data"][0]["id"]


def create_dataset(client, token: str, workspace_id: str, name: str = "Reviews") -> dict:
    response = client.post("/api/v1/datasets", headers=auth(token), json={"workspace_id": workspace_id, "name": name, "source": "csv"})
    assert response.status_code == 201
    return response.json()["data"]


def upload(client, token: str, dataset_id: str, content: str, filename: str = "reviews.csv"):
    return client.post(f"/api/v1/datasets/{dataset_id}/upload", headers=auth(token), files={"file": (filename, content.encode(), "text/csv")})


def test_create_list_and_get_dataset(client):
    token = register(client, "datasets@example.com")
    workspace_id = personal_workspace(client, token)
    dataset = create_dataset(client, token, workspace_id)

    listed = client.get(f"/api/v1/datasets?workspace_id={workspace_id}", headers=auth(token))
    assert listed.status_code == 200
    assert listed.json()["data"][0]["id"] == dataset["id"]

    fetched = client.get(f"/api/v1/datasets/{dataset['id']}", headers=auth(token))
    assert fetched.status_code == 200
    assert fetched.json()["data"]["workspace_id"] == workspace_id


def test_dataset_requires_workspace_membership(client):
    token = register(client, "member@example.com")
    response = client.post("/api/v1/datasets", headers=auth(token), json={"workspace_id": "00000000-0000-0000-0000-000000000001", "name": "No access"})
    assert response.status_code == 403


def test_cross_workspace_dataset_access_is_denied(client):
    owner_token = register(client, "owner@example.com", "Owner")
    dataset = create_dataset(client, owner_token, personal_workspace(client, owner_token))
    other_token = register(client, "other@example.com", "Other")

    response = client.get(f"/api/v1/datasets/{dataset['id']}", headers=auth(other_token))
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_csv_upload_preserves_rows_and_exposes_feedback(client):
    token = register(client, "upload@example.com")
    dataset = create_dataset(client, token, personal_workspace(client, token))
    response = upload(token=token, client=client, dataset_id=dataset["id"], content="text,rating,source,timestamp,language\nGreat service,4.5,app,2026-08-01T10:00:00Z,en\nGreat service,4.5,app,2026-08-01T10:00:00Z,en\n")
    assert response.status_code == 200
    summary = response.json()["data"]
    assert summary["rows_read"] == 2
    assert summary["rows_imported"] == 2
    assert summary["dataset"]["row_count"] == 2
    assert summary["dataset"]["status"] == "completed"

    feedback = client.get(f"/api/v1/datasets/{dataset['id']}/feedback", headers=auth(token))
    assert len(feedback.json()["data"]) == 2
    first = feedback.json()["data"][0]
    assert first["processing_status"] == "pending"
    detail = client.get(f"/api/v1/feedback/{first['id']}", headers=auth(token))
    assert detail.status_code == 200
    assert detail.json()["data"]["original_text"] == "Great service"


def test_csv_missing_text_column_fails(client):
    token = register(client, "missing-text@example.com")
    dataset = create_dataset(client, token, personal_workspace(client, token))
    response = upload(client, token, dataset["id"], "comment,rating\nhello,5\n")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_CSV"


def test_csv_invalid_rows_are_reported_and_empty_values_become_null(client):
    token = register(client, "invalid-rows@example.com")
    dataset = create_dataset(client, token, personal_workspace(client, token))
    response = upload(client, token, dataset["id"], "text,rating,source,timestamp,language\n,4,,,\nValid row,bad,,,\nValid second,,,,\n")
    assert response.status_code == 200
    summary = response.json()["data"]
    assert summary["rows_read"] == 3
    assert summary["rows_imported"] == 1
    assert summary["rows_skipped"] == 2
    assert len(summary["invalid_rows"]) == 2
    assert summary["dataset"]["row_count"] == 1


def test_dataset_deletion_removes_related_feedback_and_hides_data(client):
    token = register(client, "delete@example.com")
    dataset = create_dataset(client, token, personal_workspace(client, token))
    upload(client, token, dataset["id"], "text\nTo be deleted\n")
    feedback_id = client.get(f"/api/v1/datasets/{dataset['id']}/feedback", headers=auth(token)).json()["data"][0]["id"]

    deleted = client.delete(f"/api/v1/datasets/{dataset['id']}", headers=auth(token))
    assert deleted.status_code == 200
    assert client.get(f"/api/v1/datasets/{dataset['id']}", headers=auth(token)).status_code == 404
    assert client.get(f"/api/v1/feedback/{feedback_id}", headers=auth(token)).status_code == 404
