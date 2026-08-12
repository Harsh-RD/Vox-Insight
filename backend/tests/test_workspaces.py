def test_list_workspaces_success(client):
    """Verify user can list their assigned workspaces."""
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "w1@example.com", "password": "Password123!", "name": "W1 User"},
    )
    token = reg.json()["data"]["access_token"]

    res = client.get("/api/v1/workspaces", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data) == 1
    assert "W1 User's Personal Workspace" in data[0]["name"]


def test_create_workspace_success(client):
    """Verify authenticated user can create a new workspace."""
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "w2@example.com", "password": "Password123!", "name": "W2 User"},
    )
    token = reg.json()["data"]["access_token"]

    res = client.post(
        "/api/v1/workspaces",
        json={"name": "Analytics Squad"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["name"] == "Analytics Squad"
    assert data["role"] == "owner"
    assert "analytics-squad" in data["slug"]


def test_get_workspace_details_success(client):
    """Verify member can fetch workspace details."""
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "w3@example.com", "password": "Password123!", "name": "W3 User"},
    )
    token = reg.json()["data"]["access_token"]

    create_res = client.post(
        "/api/v1/workspaces",
        json={"name": "Engineering Core"},
        headers={"Authorization": f"Bearer {token}"},
    )
    workspace_id = create_res.json()["data"]["id"]

    res = client.get(
        f"/api/v1/workspaces/{workspace_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["data"]["name"] == "Engineering Core"


def test_get_workspace_without_membership_fails(client):
    """Verify user cannot inspect a workspace they are not a member of."""
    reg1 = client.post(
        "/api/v1/auth/register",
        json={"email": "userA@example.com", "password": "Password123!", "name": "User A"},
    )
    tokenA = reg1.json()["data"]["access_token"]

    reg2 = client.post(
        "/api/v1/auth/register",
        json={"email": "userB@example.com", "password": "Password123!", "name": "User B"},
    )
    tokenB = reg2.json()["data"]["access_token"]

    ws_res = client.post(
        "/api/v1/workspaces",
        json={"name": "User A Private Workspace"},
        headers={"Authorization": f"Bearer {tokenA}"},
    )
    workspace_id = ws_res.json()["data"]["id"]

    # User B tries to access User A's workspace
    res = client.get(
        f"/api/v1/workspaces/{workspace_id}",
        headers={"Authorization": f"Bearer {tokenB}"},
    )
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "FORBIDDEN"


def test_workspace_unauthenticated_fails(client):
    """Verify unauthenticated workspace requests return 422/401."""
    res = client.get("/api/v1/workspaces")
    assert res.status_code in (401, 422)
