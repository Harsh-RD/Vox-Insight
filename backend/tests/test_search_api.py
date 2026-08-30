import numpy as np

from app.vector_store.faiss_store import DatasetFaissStore


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def register(client, email):
    return client.post("/api/v1/auth/register", json={"email": email, "password": "Password123!", "name": "Search user"}).json()["data"]["access_token"]


def workspace(client, token):
    return client.get("/api/v1/workspaces", headers=auth(token)).json()["data"][0]["id"]


def dataset(client, token, workspace_id, name):
    return client.post("/api/v1/datasets", headers=auth(token), json={"workspace_id": workspace_id, "name": name}).json()["data"]


def fake_embeddings(texts):
    vectors = np.zeros((len(texts), 384), dtype=np.float32)
    for index, text in enumerate(texts):
        vectors[index, 0 if "payment" in text.lower() else 1] = 1.0
    return vectors


def test_build_search_dataset_filter_and_deleted_feedback(client, monkeypatch, tmp_path):
    monkeypatch.setattr("app.services.search.embed_texts", fake_embeddings)
    monkeypatch.setattr("app.services.search.embed_text", lambda text: fake_embeddings([text])[0])
    monkeypatch.setattr("app.vector_store.faiss_store.settings.FAISS_INDEX_DIR", tmp_path)
    token = register(client, "semantic@example.com")
    workspace_id = workspace(client, token)
    first, second = dataset(client, token, workspace_id, "Payments"), dataset(client, token, workspace_id, "Support")
    for item, contents in ((first, "text\nPayment failed repeatedly\n"), (second, "text\nSupport team was helpful\n")):
        assert client.post(f"/api/v1/datasets/{item['id']}/upload", headers=auth(token), files={"file": ("feedback.csv", contents.encode(), "text/csv")}).status_code == 200
        assert client.post(f"/api/v1/datasets/{item['id']}/index", headers=auth(token)).status_code == 200
    searched = client.post("/api/v1/search", headers=auth(token), json={"workspace_id": workspace_id, "query": "payment issue", "top_k": 5})
    assert searched.status_code == 200
    assert searched.json()["data"]["results"][0]["dataset_id"] == first["id"]
    filtered = client.post("/api/v1/search", headers=auth(token), json={"workspace_id": workspace_id, "dataset_id": second["id"], "query": "payment issue", "top_k": 5})
    assert len(filtered.json()["data"]["results"]) == 1
    assert filtered.json()["data"]["results"][0]["dataset_id"] == second["id"]
    assert client.delete(f"/api/v1/datasets/{first['id']}", headers=auth(token)).status_code == 200
    after_delete = client.post("/api/v1/search", headers=auth(token), json={"workspace_id": workspace_id, "query": "payment issue", "top_k": 5})
    assert all(item["dataset_id"] != first["id"] for item in after_delete.json()["data"]["results"])


def test_index_api_is_workspace_isolated_and_validates_search(client, monkeypatch, tmp_path):
    monkeypatch.setattr("app.services.search.embed_texts", fake_embeddings)
    monkeypatch.setattr("app.services.search.embed_text", lambda text: fake_embeddings([text])[0])
    monkeypatch.setattr("app.vector_store.faiss_store.settings.FAISS_INDEX_DIR", tmp_path)
    owner = register(client, "owner-search@example.com")
    owner_workspace = workspace(client, owner)
    protected_dataset = dataset(client, owner, owner_workspace, "Protected")
    other = register(client, "other-search@example.com")
    assert client.post(f"/api/v1/datasets/{protected_dataset['id']}/index", headers=auth(other)).status_code == 403
    denied = client.post("/api/v1/search", headers=auth(other), json={"workspace_id": owner_workspace, "query": "anything", "top_k": 1})
    assert denied.status_code == 403
    assert client.post("/api/v1/search", headers=auth(owner), json={"workspace_id": owner_workspace, "query": "   ", "top_k": 1}).status_code == 422
    assert client.post("/api/v1/search", headers=auth(owner), json={"workspace_id": owner_workspace, "query": "anything", "top_k": 0}).status_code == 422


def test_empty_dataset_can_be_built_and_incremental_add_requires_existing_index(client, monkeypatch, tmp_path):
    monkeypatch.setattr("app.services.search.embed_texts", fake_embeddings)
    monkeypatch.setattr("app.vector_store.faiss_store.settings.FAISS_INDEX_DIR", tmp_path)
    token = register(client, "empty-search@example.com")
    data = dataset(client, token, workspace(client, token), "Empty")
    assert client.post(f"/api/v1/datasets/{data['id']}/index/add", headers=auth(token)).status_code == 409
    build = client.post(f"/api/v1/datasets/{data['id']}/index", headers=auth(token))
    assert build.status_code == 200 and build.json()["data"]["indexed_count"] == 0
    status = client.get(f"/api/v1/datasets/{data['id']}/index-status", headers=auth(token))
    assert status.json()["data"]["status"] == "completed"


def test_corrupt_index_fails_safely_and_marks_status_failed(client, monkeypatch, tmp_path):
    monkeypatch.setattr("app.services.search.embed_texts", fake_embeddings)
    monkeypatch.setattr("app.services.search.embed_text", lambda text: fake_embeddings([text])[0])
    monkeypatch.setattr("app.vector_store.faiss_store.settings.FAISS_INDEX_DIR", tmp_path)
    token = register(client, "corrupt-search@example.com")
    workspace_id = workspace(client, token)
    data = dataset(client, token, workspace_id, "Corrupt")
    client.post(f"/api/v1/datasets/{data['id']}/upload", headers=auth(token), files={"file": ("feedback.csv", b"text\nPayment failed\n", "text/csv")})
    assert client.post(f"/api/v1/datasets/{data['id']}/index", headers=auth(token)).status_code == 200
    DatasetFaissStore(workspace_id, data["id"]).index_path.write_bytes(b"corrupt")
    response = client.post("/api/v1/search", headers=auth(token), json={"workspace_id": workspace_id, "query": "payment", "top_k": 1})
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "INDEX_UNAVAILABLE"
    status = client.get(f"/api/v1/datasets/{data['id']}/index-status", headers=auth(token))
    assert status.json()["data"]["status"] == "failed"
