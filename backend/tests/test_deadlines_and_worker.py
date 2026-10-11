import json
from datetime import datetime, timezone, timedelta
import pytest
from backend.services.supabase_client import mock_store
from backend.services.reminder_service import ReminderService
from backend.worker import run_worker_cycle

def test_overdue_tasks_and_dashboard_stats(client, creator_headers):
    now = datetime.now(timezone.utc)
    past_due = (now - timedelta(days=2)).isoformat()
    future_due = (now + timedelta(hours=10)).isoformat()

    # Create overdue task
    client.post("/api/tasks", headers=creator_headers, json={
        "title": "Overdue Bug Fix",
        "due_date": past_due
    })

    # Create due soon task
    client.post("/api/tasks", headers=creator_headers, json={
        "title": "Due Soon Feature",
        "due_date": future_due
    })

    # Create completed task
    comp_res = client.post("/api/tasks", headers=creator_headers, json={
        "title": "Finished Task",
        "due_date": past_due
    })
    client.patch(f"/api/tasks/{comp_res.get_json()['task']['id']}/status", headers=creator_headers, json={"status": "completed"})

    # Check dashboard stats
    stats_res = client.get("/api/dashboard/stats", headers=creator_headers)
    assert stats_res.status_code == 200
    stats = stats_res.get_json()["stats"]
    assert stats["total_tasks"] == 3
    assert stats["completed"] == 1
    assert stats["overdue"] == 1  # only non-completed past due task
    assert stats["due_soon"] == 1

def test_deadline_reminders_and_exclusions(client, creator_headers):
    now = datetime.now(timezone.utc)
    soon_due = (now + timedelta(hours=8)).isoformat()

    # 1. Normal task due soon -> Should trigger reminder
    client.post("/api/tasks", headers=creator_headers, json={
        "title": "Eligible Task",
        "assignee_id": "22222222-2222-2222-2222-222222222222", # Test User B (reminder_preference=True)
        "due_date": soon_due
    })

    # 2. Task with reminder_preference = False -> Should be skipped
    client.post("/api/tasks", headers=creator_headers, json={
        "title": "Muted User Task",
        "assignee_id": "33333333-3333-3333-3333-333333333333", # Test Muted User (reminder_preference=False)
        "due_date": soon_due
    })

    # 3. Completed task due soon -> Should be excluded
    comp_task = client.post("/api/tasks", headers=creator_headers, json={
        "title": "Completed Task",
        "assignee_id": "22222222-2222-2222-2222-222222222222",
        "due_date": soon_due
    })
    client.patch(f"/api/tasks/{comp_task.get_json()['task']['id']}/status", headers=creator_headers, json={"status": "completed"})

    # Run reminder process
    result = ReminderService.check_and_send_deadline_reminders()
    assert result["reminders_sent"] == 1
    assert result["skipped"] == 1

    # Second pass immediately -> Duplicate prevention should skip already reminded task
    result2 = ReminderService.check_and_send_deadline_reminders()
    assert result2["reminders_sent"] == 0
    assert result2["skipped"] >= 1

def test_worker_cycle_execution():
    # Verify worker cycle executes without errors
    run_worker_cycle()
