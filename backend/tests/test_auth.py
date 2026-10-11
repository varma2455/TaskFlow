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
