import pytest
from backend.app import create_app
from backend.config import Config
from backend.services.supabase_client import mock_store

class TestConfig(Config):
    TESTING = True
    DEBUG = False
    USE_MOCK_DB = True
    SECRET_KEY = "test-secret-key-12345"
    SUPABASE_JWT_SECRET = ""  # Uses test-token format

@pytest.fixture(autouse=True)
def reset_db():
    """Resets mock data store before each test run and sets up isolated test accounts."""
    mock_store.reset()
    mock_store.profiles = [
        {
            "id": "11111111-1111-1111-1111-111111111111",
            "email": "test-admin@test.local",
            "full_name": "Test Administrator",
            "avatar_url": "",
            "role": "admin",
            "reminder_preference": True,
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z",
        },
        {
            "id": "22222222-2222-2222-2222-222222222222",
            "email": "test-user-b@test.local",
            "full_name": "Test User B",
            "avatar_url": "",
            "role": "user",
            "reminder_preference": True,
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z",
        },
        {
            "id": "33333333-3333-3333-3333-333333333333",
            "email": "test-muted@test.local",
            "full_name": "Test Muted User",
            "avatar_url": "",
            "role": "user",
            "reminder_preference": False,
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z",
        }
    ]
    yield
    mock_store.reset()

@pytest.fixture
def app():
    app = create_app(TestConfig)
    return app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def admin_headers():
    return {
        "Authorization": "Bearer test-token-11111111-1111-1111-1111-111111111111-admin",
        "Content-Type": "application/json"
    }

@pytest.fixture
def creator_headers():
    return {
        "Authorization": "Bearer test-token-11111111-1111-1111-1111-111111111111-user",
        "Content-Type": "application/json"
    }

@pytest.fixture
def assignee_headers():
    return {
        "Authorization": "Bearer test-token-22222222-2222-2222-2222-222222222222-user",
        "Content-Type": "application/json"
    }

@pytest.fixture
def unrelated_headers():
    return {
        "Authorization": "Bearer test-token-33333333-3333-3333-3333-333333333333-user",
        "Content-Type": "application/json"
    }
