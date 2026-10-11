import os
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "taskflow-secret-key-change-in-production-123456")
    FLASK_ENV = os.getenv("FLASK_ENV", "production")
    DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")
    PORT = int(os.getenv("PORT", 5000))

    # Frontend URLs allowed for CORS
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
    # Additional allowed origins (e.g., localhost:5173, production Vercel domains)
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", f"{FRONTEND_URL},http://localhost:3000,http://localhost:5173").split(",")
        if origin.strip()
    ]

    # Supabase Configuration
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
    SUPABASE_JWT_ISSUER = os.getenv("SUPABASE_JWT_ISSUER", "")

    # Google OAuth & Gmail API
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GMAIL_SENDER_EMAIL = os.getenv("GMAIL_SENDER_EMAIL", "")
    GMAIL_REFRESH_TOKEN = os.getenv("GMAIL_REFRESH_TOKEN", "")

    # Business Rules & Reminders
    REMINDER_WINDOW_HOURS = int(os.getenv("REMINDER_WINDOW_HOURS", 24))
    APP_URL = os.getenv("APP_URL", FRONTEND_URL)
    MAX_EMAIL_RETRIES = int(os.getenv("MAX_EMAIL_RETRIES", 3))

    # Testing & Mock flag
    USE_MOCK_DB = os.getenv("USE_MOCK_DB", "False").lower() in ("true", "1", "yes") or not SUPABASE_URL
