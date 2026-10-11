import json
import pytest

def test_health_check(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert data["service"] == "taskflow-api"

def test_missing_auth_header(client):
    res = client.get("/api/auth/profile")
    assert res.status_code == 401
    data = res.get_json()
    assert data["error"] == "Unauthorized"

def test_invalid_auth_header_format(client):
    res = client.get("/api/auth/profile", headers={"Authorization": "Basic 123456"})
    assert res.status_code == 401
    data = res.get_json()
    assert "Bearer" in data["message"]

def test_get_current_user_profile(client, creator_headers):
    res = client.get("/api/auth/profile", headers=creator_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert "profile" in data
    assert data["profile"]["id"] == "11111111-1111-1111-1111-111111111111"

def test_sync_user(client, creator_headers):
    payload = {
        "full_name": "Updated Admin Name",
        "avatar_url": "https://example.com/avatar.png"
    }
    res = client.post("/api/auth/sync-user", headers=creator_headers, json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["profile"]["full_name"] == "Updated Admin Name"
    assert data["profile"]["avatar_url"] == "https://example.com/avatar.png"

def test_update_reminder_preferences(client, creator_headers):
    res = client.put("/api/auth/preferences", headers=creator_headers, json={"reminder_preference": False})
    assert res.status_code == 200
    assert res.get_json()["reminder_preference"] is False

def test_designated_admin_auto_provisioning(client):
    """Verify that yeswanthvarma684280@gmail.com automatically receives the admin role."""
    admin_email = "yeswanthvarma684280@gmail.com"
    uuid_str = "aaaa1111-2222-3333-4444-555566667777"
    headers = {
        "Authorization": f"Bearer test-token-email:{admin_email}:{uuid_str}:user",
        "Content-Type": "application/json"
    }

    # Initial profile query (auto-creation on signup)
    res = client.get("/api/auth/profile", headers=headers)
    assert res.status_code == 200
    profile = res.get_json()["profile"]
    assert profile["email"] == admin_email
    assert profile["role"] == "admin"
    assert profile["id"] == uuid_str

    # Profile sync on login
    sync_res = client.post("/api/auth/sync-user", headers=headers, json={"full_name": "Yeswanth Varma"})
    assert sync_res.status_code == 200
    synced_prof = sync_res.get_json()["profile"]
    assert synced_prof["role"] == "admin"
    assert synced_prof["full_name"] == "Yeswanth Varma"

    # Verify admin dashboard access is granted
    stats_res = client.get("/api/admin/stats", headers=headers)
    assert stats_res.status_code == 200

def test_standard_user_strictly_defaults_to_user_role(client):
    """Verify that any other user strictly receives user role and cannot promote themselves."""
    user_email = "regular.person@example.com"
    uuid_str = "bbbb1111-2222-3333-4444-555566667777"
    headers = {
        "Authorization": f"Bearer test-token-email:{user_email}:{uuid_str}:user",
        "Content-Type": "application/json"
    }

    res = client.get("/api/auth/profile", headers=headers)
    assert res.status_code == 200
    profile = res.get_json()["profile"]
    assert profile["role"] == "user"

    # User cannot access admin stats
    stats_res = client.get("/api/admin/stats", headers=headers)
    assert stats_res.status_code == 403

def test_mock_store_reset_contains_zero_demo_members():
    """Verify that MockDataStore.reset() does not generate disposable demo accounts."""
    from backend.services.supabase_client import MockDataStore
    store = MockDataStore()
    assert len(store.profiles) == 0
    demo_emails = [p["email"] for p in store.profiles]
    assert "demo.user@taskflow.dev" not in demo_emails
    assert "teammate@taskflow.dev" not in demo_emails
    assert "external.user@taskflow.dev" not in demo_emails

def test_designated_admin_cannot_be_demoted(client):
    """Verify that designated primary administrator cannot be demoted by another admin."""
    admin_headers = {
        "Authorization": "Bearer test-token-11111111-1111-1111-1111-111111111111-admin",
        "Content-Type": "application/json"
    }
    target_admin_email = "yeswanthvarma684280@gmail.com"
    target_uuid = "aaaa1111-2222-3333-4444-555566667777"
    # Ensure profile exists as admin
    client.get(
        "/api/auth/profile",
        headers={"Authorization": f"Bearer test-token-email:{target_admin_email}:{target_uuid}:user"}
    )

    # Attempt to demote designated admin
    demote_res = client.patch(
        f"/api/admin/users/{target_uuid}/role",
        headers=admin_headers,
        json={"role": "user"}
    )
    assert demote_res.status_code == 403
    assert "cannot be demoted" in demote_res.get_json()["message"]

