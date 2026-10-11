import pytest
import time
import jwt
from backend.app import create_app
from backend.config import Config
from backend.services.supabase_client import mock_store

USER_A_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
USER_B_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
USER_C_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc"
ADMIN_ID  = "11111111-1111-1111-1111-111111111111"

def make_headers(user_id: str, role: str = "user"):
    return {
        "Authorization": f"Bearer test-token-{user_id}-{role}",
        "Content-Type": "application/json"
    }

class TestMultiUserSecurity:
    """
    Comprehensive Multi-User and Role-Based Authorization Test Suite
    verifying Google OAuth UUID mapping, Admin/User boundaries, task isolation, and token security.
    """

    # 1. User A signs in with Google and receives a unique UUID
    def test_01_user_a_signs_in_and_receives_unique_uuid(self, client):
        headers_a = make_headers(USER_A_ID, "user")
        res = client.get("/api/me", headers=headers_a)
        assert res.status_code == 200
        user = res.get_json()["user"]
        assert user["id"] == USER_A_ID
        assert user["email"].startswith("user-aaaaaaaa")
        assert "full_name" in user

    # 2. User B signs in with another Google account and receives a different UUID
    def test_02_user_b_signs_in_and_receives_different_uuid(self, client):
        headers_a = make_headers(USER_A_ID, "user")
        headers_b = make_headers(USER_B_ID, "user")

        res_a = client.get("/api/me", headers=headers_a).get_json()["user"]
        res_b = client.get("/api/me", headers=headers_b).get_json()["user"]

        assert res_a["id"] != res_b["id"]
        assert res_b["id"] == USER_B_ID

    # 3. User A creates a task and sees it on their dashboard
    def test_03_user_a_creates_task_and_sees_on_dashboard(self, client):
        headers_a = make_headers(USER_A_ID, "user")
        create_res = client.post("/api/tasks", headers=headers_a, json={
            "title": "User A Core Architecture Task",
            "description": "Proprietary design",
            "priority": "high"
        })
        assert create_res.status_code == 201
        task = create_res.get_json()["task"]
        assert task["creator_id"] == USER_A_ID

        # Read back
        list_res = client.get("/api/tasks", headers=headers_a).get_json()
        assert any(t["id"] == task["id"] for t in list_res["tasks"])

    # 4. User B cannot access User A's unrelated task
    def test_04_user_b_cannot_access_user_a_unrelated_task(self, client):
        headers_a = make_headers(USER_A_ID, "user")
        headers_b = make_headers(USER_B_ID, "user")

        create_res = client.post("/api/tasks", headers=headers_a, json={
            "title": "Private User A Secret",
            "priority": "low"
        })
        task_id = create_res.get_json()["task"]["id"]

        # User B cannot read
        get_res = client.get(f"/api/tasks/{task_id}", headers=headers_b)
        assert get_res.status_code in (403, 404)

        # User B cannot edit
        patch_res = client.patch(f"/api/tasks/{task_id}", headers=headers_b, json={"title": "Hacked"})
        assert patch_res.status_code == 403

        # User B cannot delete
        del_res = client.delete(f"/api/tasks/{task_id}", headers=headers_b)
        assert del_res.status_code == 403

    # 5. User B can access a task explicitly assigned to them according to permissions
    def test_05_user_b_can_access_task_explicitly_assigned_to_them(self, client):
        headers_a = make_headers(USER_A_ID, "user")
        headers_b = make_headers(USER_B_ID, "user")

        # Ensure User B's profile exists
        client.get("/api/me", headers=headers_b)

        # User A creates and assigns to User B
        create_res = client.post("/api/tasks", headers=headers_a, json={
            "title": "Assigned Feature Implementation",
            "assignee_id": USER_B_ID,
            "priority": "medium"
        })
        task_id = create_res.get_json()["task"]["id"]

        # User B can view
        get_res = client.get(f"/api/tasks/{task_id}", headers=headers_b)
        assert get_res.status_code == 200
        assert get_res.get_json()["task"]["assignee_id"] == USER_B_ID

        # User B can update status
        patch_res = client.patch(f"/api/tasks/{task_id}/status", headers=headers_b, json={"status": "in_progress"})
        assert patch_res.status_code == 200
        assert patch_res.get_json()["task"]["status"] == "in_progress"

    # 6. A newly registered account receives role 'user'
    def test_06_newly_registered_account_receives_role_user(self, client):
        new_user_headers = make_headers("99999999-9999-9999-9999-999999999999", "user")
        res = client.get("/api/me", headers=new_user_headers)
        assert res.status_code == 200
        user = res.get_json()["user"]
        assert user["role"] == "user"

    # 7. A normal user cannot change their role to 'admin'
    def test_07_normal_user_cannot_change_role_to_admin(self, client):
        user_headers = make_headers(USER_A_ID, "user")

        # Try self-promotion via sync-user
        sync_res = client.post("/api/auth/sync-user", headers=user_headers, json={
            "role": "admin",
            "full_name": "Wannabe Admin"
        })
        assert sync_res.status_code == 200
        profile = sync_res.get_json()["profile"]
        assert profile["role"] == "user"

        # Verify via GET /api/me
        me_res = client.get("/api/me", headers=user_headers).get_json()["user"]
        assert me_res["role"] == "user"

        # Try self-promotion via admin endpoint directly
        tamper_res = client.patch(f"/api/admin/users/{USER_A_ID}/role", headers=user_headers, json={"role": "admin"})
        assert tamper_res.status_code == 403

    # 8. A normal user receives 403 for admin endpoints
    def test_08_normal_user_receives_403_for_admin_endpoints(self, client):
        user_headers = make_headers(USER_A_ID, "user")

        assert client.get("/api/admin/stats", headers=user_headers).status_code == 403
        assert client.get("/api/admin/users", headers=user_headers).status_code == 403
        assert client.get("/api/admin/tasks", headers=user_headers).status_code == 403
        assert client.get("/api/admin/activity", headers=user_headers).status_code == 403
        assert client.get("/api/admin/notifications", headers=user_headers).status_code == 403

    # 9. An administrator can access authorized admin features
    def test_09_administrator_can_access_authorized_admin_features(self, client):
        admin_headers = make_headers(ADMIN_ID, "admin")
        user_b_headers = make_headers(USER_B_ID, "user")

        # Ensure user b exists
        client.get("/api/me", headers=user_b_headers)

        # Admin gets stats
        stats_res = client.get("/api/admin/stats", headers=admin_headers)
        assert stats_res.status_code == 200
        stats = stats_res.get_json()["stats"]
        assert "total_tasks" in stats
        assert "total_users" in stats

        # Admin lists users
        users_res = client.get("/api/admin/users", headers=admin_headers)
        assert users_res.status_code == 200
        assert len(users_res.get_json()["users"]) > 0

        # Admin lists tasks
        tasks_res = client.get("/api/admin/tasks", headers=admin_headers)
        assert tasks_res.status_code == 200

        # Admin promotes User B
        promote_res = client.patch(f"/api/admin/users/{USER_B_ID}/role", headers=admin_headers, json={"role": "admin"})
        assert promote_res.status_code == 200
        assert promote_res.get_json()["user"]["role"] == "admin"

        # Admin cannot demote self
        self_demote = client.patch(f"/api/admin/users/{ADMIN_ID}/role", headers=admin_headers, json={"role": "user"})
        assert self_demote.status_code == 403

    # 10. Invalid or expired tokens are rejected
    def test_10_invalid_or_expired_tokens_are_rejected(self, app):
        test_secret = "test-verification-secret-32-chars-long"

        class SignedJWTConfig(Config):
            TESTING = False
            USE_MOCK_DB = False
            SUPABASE_JWT_SECRET = test_secret
            SUPABASE_URL = ""

        signed_app = create_app(SignedJWTConfig)
        signed_client = signed_app.test_client()

        # 10a. Missing token
        unauth_res = signed_client.get("/api/me")
        assert unauth_res.status_code == 401

        # 10b. Invalid signature
        bad_sig = jwt.encode({"sub": USER_A_ID, "exp": int(time.time()) + 3600}, "wrong-secret", algorithm="HS256")
        assert signed_client.get("/api/me", headers={"Authorization": f"Bearer {bad_sig}"}).status_code == 401

        # 10c. Expired token
        expired = jwt.encode({"sub": USER_A_ID, "exp": int(time.time()) - 3600}, test_secret, algorithm="HS256")
        assert signed_client.get("/api/me", headers={"Authorization": f"Bearer {expired}"}).status_code == 401

    # 11. Logging out and switching accounts does not leak cached task data
    def test_11_logging_out_and_switching_accounts_does_not_leak_tasks(self, client):
        headers_a = make_headers(USER_A_ID, "user")
        headers_b = make_headers(USER_B_ID, "user")

        client.post("/api/tasks", headers=headers_a, json={"title": "A Private Item"})
        client.post("/api/tasks", headers=headers_b, json={"title": "B Private Item"})

        list_a = client.get("/api/tasks", headers=headers_a).get_json()
        assert all(t["creator_id"] == USER_A_ID for t in list_a["tasks"])
        assert not any("B Private Item" in t["title"] for t in list_a["tasks"])

        list_b = client.get("/api/tasks", headers=headers_b).get_json()
        assert all(t["creator_id"] == USER_B_ID for t in list_b["tasks"])
        assert not any("A Private Item" in t["title"] for t in list_b["tasks"])

    # 12. Notifications are isolated by recipient
    def test_12_notifications_are_isolated_by_recipient(self, client):
        headers_a = make_headers(USER_A_ID, "user")
        headers_b = make_headers(USER_B_ID, "user")

        client.get("/api/me", headers=headers_a)
        client.get("/api/me", headers=headers_b)

        # Assign task from B to A triggers notification for A
        client.post("/api/tasks", headers=headers_b, json={
            "title": "Alert Task For A",
            "assignee_id": USER_A_ID
        })

        notifs_a = client.get("/api/notifications", headers=headers_a).get_json()["notifications"]
        assert len(notifs_a) > 0
        notif_a_id = notifs_a[0]["id"]

        # B cannot see A's notification
        notifs_b = client.get("/api/notifications", headers=headers_b).get_json()["notifications"]
        assert all(n["id"] != notif_a_id for n in notifs_b)

        # B cannot mark A's notification as read
        tamper = client.patch(f"/api/notifications/{notif_a_id}/read", headers=headers_b)
        assert tamper.status_code == 403
