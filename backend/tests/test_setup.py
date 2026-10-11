import json
import pytest
from backend.app import create_app
from backend.services.supabase_client import mock_store

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_setup_status_structure(client):
    """Verify that /api/setup/status returns complete operational status."""
    response = client.get("/api/setup/status")
    assert response.status_code == 200
    data = response.get_json()

    assert data["status"] in ("operational", "degraded")
    assert "backend" in data
    assert "database" in data
    assert "authentication" in data
    assert "email" in data

    # Verify tables
    tables = data["database"]["tables"]
    for expected_table in ["profiles", "tasks", "activity_logs", "notifications", "email_outbox"]:
        assert expected_table in tables
        assert tables[expected_table]["exists"] is True

    # Verify migrations
    migrations = data["database"]["migrations"]
    assert len(migrations) == 8
    migration_files = [m["file"] for m in migrations]
    assert "001_initial_schema.sql" in migration_files
    assert "005_admin_user_roles_and_admin_endpoints.sql" in migration_files
    assert "006_task_activity_view_and_user_profile_sync.sql" in migration_files
    assert "007_complete_database_schema_and_indexes.sql" in migration_files
    assert "008_provision_admin_and_clean_demo_data.sql" in migration_files
    assert "direct_connection" in data["database"]

    # Verify authentication
    auth = data["authentication"]
    assert auth["provider"] == "google"
    assert "PKCE" in auth["auth_protocol"]
    assert "admin" in auth["roles_supported"]
    assert "user" in auth["roles_supported"]

def test_setup_status_zero_secrets_leakage(client):
    """Assert that /api/setup/status never reveals secrets or private keys."""
    response = client.get("/api/setup/status")
    assert response.status_code == 200
    raw_text = response.get_data(as_text=True)

    # Asserts that sensitive secret keys are not leaked
    forbidden_terms = [
        "service_role",
        "SUPABASE_SERVICE_ROLE_KEY",
        "GOOGLE_CLIENT_SECRET",
        "GMAIL_REFRESH_TOKEN",
        "SUPABASE_JWT_SECRET",
        "taskflow-secret-key",
    ]
    for term in forbidden_terms:
        assert term not in raw_text

def test_setup_test_email_invalid(client):
    """Verify that /api/setup/test-email rejects invalid recipient email."""
    response = client.post(
        "/api/setup/test-email",
        data=json.dumps({"recipient_email": "invalid-address"}),
        content_type="application/json"
    )
    assert response.status_code == 400

def test_setup_test_email_dry_run(client):
    """Verify that /api/setup/test-email creates outbox entry in dry-run mode."""
    initial_outbox_count = len(mock_store.email_outbox)
    response = client.post(
        "/api/setup/test-email",
        data=json.dumps({"recipient_email": "evaluator@taskflow.dev", "dry_run": True}),
        content_type="application/json"
    )
    assert response.status_code == 200
    data = response.get_json()

    assert data["success"] is True
    assert data["mode"] == "dry_run"
    assert "idempotency_key" in data
    assert data["recipient"] == "evaluator@taskflow.dev"

    # Verify outbox entry
    assert len(mock_store.email_outbox) == initial_outbox_count + 1
    newest = mock_store.email_outbox[-1]
    assert newest["recipient_email"] == "evaluator@taskflow.dev"
    assert newest["event_type"] == "setup_test"
