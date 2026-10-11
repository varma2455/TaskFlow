import json
import pytest

def test_unrelated_user_cannot_access_private_task(client, creator_headers, assignee_headers, unrelated_headers):
    # Creator creates a task assigned to Assignee
    res = client.post("/api/tasks", headers=creator_headers, json={
        "title": "Confidential Task",
        "description": "Internal team only",
        "assignee_id": "22222222-2222-2222-2222-222222222222"
    })
    task_id = res.get_json()["task"]["id"]

    # Assignee CAN view
    res_assignee = client.get(f"/api/tasks/{task_id}", headers=assignee_headers)
    assert res_assignee.status_code == 200

    # Unrelated user CANNOT view (Forbidden 403)
    res_unrelated = client.get(f"/api/tasks/{task_id}", headers=unrelated_headers)
    assert res_unrelated.status_code == 403
    assert "not authorized" in res_unrelated.get_json()["details"]

    # Unrelated user does not see it in task listing
    res_list = client.get("/api/tasks", headers=unrelated_headers)
    assert res_list.status_code == 200
    assert len(res_list.get_json()["tasks"]) == 0

def test_unrelated_user_cannot_modify_task(client, creator_headers, unrelated_headers):
    res = client.post("/api/tasks", headers=creator_headers, json={"title": "Original Title"})
    task_id = res.get_json()["task"]["id"]

    # Unrelated user attempts update -> 403 Forbidden
    res_mod = client.put(f"/api/tasks/{task_id}", headers=unrelated_headers, json={"title": "Hacked Title"})
    assert res_mod.status_code == 403

def test_only_creator_or_admin_can_delete_task(client, creator_headers, assignee_headers, admin_headers):
    res = client.post("/api/tasks", headers=creator_headers, json={
        "title": "Deletion Test Task",
        "assignee_id": "22222222-2222-2222-2222-222222222222"
    })
    task_id = res.get_json()["task"]["id"]

    # Assignee tries to delete -> 403 Forbidden
    del_assignee = client.delete(f"/api/tasks/{task_id}", headers=assignee_headers)
    assert del_assignee.status_code == 403

    # Creator CAN delete -> 200 OK
    del_creator = client.delete(f"/api/tasks/{task_id}", headers=creator_headers)
    assert del_creator.status_code == 200
    assert del_creator.get_json()["details"]["deleted"] is True
