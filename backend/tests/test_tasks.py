import json
import pytest

def test_create_task_success(client, creator_headers):
    payload = {
        "title": "Complete Part 2 Assessment",
        "description": "Deliver production code and tests",
        "priority": "high",
        "assignee_id": "22222222-2222-2222-2222-222222222222",
        "due_date": "2026-10-15T18:00:00Z"
    }
    res = client.post("/api/tasks", headers=creator_headers, json=payload)
    assert res.status_code == 201
    data = res.get_json()["task"]
    assert data["title"] == "Complete Part 2 Assessment"
    assert data["status"] == "todo"
    assert data["priority"] == "high"
    assert data["creator_id"] == "11111111-1111-1111-1111-111111111111"
    assert data["assignee_id"] == "22222222-2222-2222-2222-222222222222"

def test_create_task_missing_title(client, creator_headers):
    payload = {
        "description": "Missing title test",
        "priority": "low"
    }
    res = client.post("/api/tasks", headers=creator_headers, json=payload)
    assert res.status_code == 400
    assert "title is required" in res.get_json()["details"]

def test_create_task_invalid_priority(client, creator_headers):
    payload = {
        "title": "Invalid Priority Task",
        "priority": "ultra-mega"
    }
    res = client.post("/api/tasks", headers=creator_headers, json=payload)
    assert res.status_code == 400
    assert "Invalid priority" in res.get_json()["details"]

def test_create_task_invalid_assignee(client, creator_headers):
    payload = {
        "title": "Bad Assignee Task",
        "assignee_id": "99999999-9999-9999-9999-999999999999"
    }
    res = client.post("/api/tasks", headers=creator_headers, json=payload)
    assert res.status_code == 400
    assert "does not exist" in res.get_json()["details"]

def test_list_tasks_and_filters(client, creator_headers):
    # Create two tasks
    client.post("/api/tasks", headers=creator_headers, json={"title": "Task A", "priority": "low"})
    client.post("/api/tasks", headers=creator_headers, json={"title": "Task B", "priority": "high"})

    # List all
    res = client.get("/api/tasks", headers=creator_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["tasks"]) == 2

    # Filter by priority
    res_high = client.get("/api/tasks?priority=high", headers=creator_headers)
    assert len(res_high.get_json()["tasks"]) == 1
    assert res_high.get_json()["tasks"][0]["title"] == "Task B"

    # Search filter
    res_search = client.get("/api/tasks?search=Task A", headers=creator_headers)
    assert len(res_search.get_json()["tasks"]) == 1
    assert res_search.get_json()["tasks"][0]["title"] == "Task A"

def test_update_task_status_and_completion(client, creator_headers):
    create_res = client.post("/api/tasks", headers=creator_headers, json={
        "title": "Status Workflow Task",
        "priority": "medium"
    })
    task_id = create_res.get_json()["task"]["id"]

    # Move to in_progress
    patch_res = client.patch(f"/api/tasks/{task_id}/status", headers=creator_headers, json={"status": "in_progress"})
    assert patch_res.status_code == 200
    assert patch_res.get_json()["task"]["status"] == "in_progress"
    assert patch_res.get_json()["task"]["completed_at"] is None

    # Move to completed
    complete_res = client.patch(f"/api/tasks/{task_id}/status", headers=creator_headers, json={"status": "completed"})
    assert complete_res.status_code == 200
    task_data = complete_res.get_json()["task"]
    assert task_data["status"] == "completed"
    assert task_data["completed_at"] is not None

    # Verify activity history has recorded transitions
    act_res = client.get(f"/api/tasks/{task_id}/activity", headers=creator_headers)
    assert act_res.status_code == 200
    logs = act_res.get_json()["activity"]
    assert len(logs) >= 3  # created, updated (in_progress), updated (completed)
