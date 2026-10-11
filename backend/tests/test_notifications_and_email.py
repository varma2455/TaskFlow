import json
import pytest
from backend.services.supabase_client import mock_store
from backend.services.gmail_service import GmailService

def test_task_assignment_notification_lifecycle(client, creator_headers, assignee_headers, unrelated_headers):
    # Creator creates task assigned to Assignee
    res = client.post("/api/tasks", headers=creator_headers, json={
        "title": "Build Realtime Feature",
        "assignee_id": "22222222-2222-2222-2222-222222222222"
    })
    assert res.status_code == 201

    # Check Assignee's notifications
    notif_res = client.get("/api/notifications", headers=assignee_headers)
    assert notif_res.status_code == 200
    data = notif_res.get_json()
    assert data["unread_count"] == 1
    assert len(data["notifications"]) == 1
    notif_id = data["notifications"][0]["id"]
    assert data["notifications"][0]["type"] == "task_assigned"

    # Check outbox has logged email
    outbox_entries = mock_store.email_outbox
    assert len(outbox_entries) >= 1
    assert outbox_entries[-1]["event_type"] == "task_assigned"

    # Unrelated user cannot mark this notification as read -> 403 Forbidden
    unrelated_res = client.patch(f"/api/notifications/{notif_id}/read", headers=unrelated_headers)
    assert unrelated_res.status_code == 403

    # Assignee marks it as read -> 200 OK
    read_res = client.patch(f"/api/notifications/{notif_id}/read", headers=assignee_headers)
    assert read_res.status_code == 200
    assert read_res.get_json()["notification"]["is_read"] is True

    # Check unread count is now 0
    notif_res_after = client.get("/api/notifications", headers=assignee_headers)
    assert notif_res_after.get_json()["unread_count"] == 0

def test_duplicate_email_prevention():
    """
    Verifies that calling send_email_with_outbox with the same idempotency key
    returns 'skipped' and prevents sending a second duplicate email.
    """
    idempotency_key = "test_event_idempotency_123"

    res1 = GmailService.send_email_with_outbox(
        recipient_email="test@taskflow.dev",
        recipient_name="Tester",
        subject="Test Notification",
        html_body="<p>Test</p>",
        text_body="Test",
        event_type="test_event",
        task_id="task-123",
        idempotency_key=idempotency_key,
    )
    # Status should be pending (or sent if creds present)
    assert res1["status"] in ("pending", "sent")

    # Manually simulate sent status on outbox entry
    for entry in mock_store.email_outbox:
        if entry["idempotency_key"] == idempotency_key:
            entry["status"] = "sent"

    # Second call with the same idempotency key
    res2 = GmailService.send_email_with_outbox(
        recipient_email="test@taskflow.dev",
        recipient_name="Tester",
        subject="Test Notification",
        html_body="<p>Test</p>",
        text_body="Test",
        event_type="test_event",
        task_id="task-123",
        idempotency_key=idempotency_key,
    )
    assert res2["status"] == "skipped"
    assert res2["reason"] == "already_sent"
