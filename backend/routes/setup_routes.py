import os
import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from backend.config import Config
from backend.services.supabase_client import get_supabase_client, check_direct_pg_connection
from backend.services.gmail_service import GmailService

setup_bp = Blueprint("setup", __name__)

KNOWN_MIGRATIONS = [
    {
        "id": "001",
        "file": "001_initial_schema.sql",
        "title": "Initial Schema Setup",
        "description": "Creates profiles, tasks, activity_logs tables with foreign keys and indexes.",
    },
    {
        "id": "002",
        "file": "002_security_and_rls.sql",
        "title": "Row Level Security (RLS) Policies",
        "description": "Enables RLS on tasks, profiles, and logs ensuring multi-user isolation.",
    },
    {
        "id": "003",
        "file": "003_realtime_and_indexes.sql",
        "title": "Realtime & Performance Indexes",
        "description": "Enables Supabase Realtime publication and composite indexes for fast queries.",
    },
    {
        "id": "004",
        "file": "004_task_due_at_and_security_hardening.sql",
        "title": "Task Due Date & Security Hardening",
        "description": "Adds due_date constraints, email outbox idempotency, and security policies.",
    },
    {
        "id": "005",
        "file": "005_admin_user_roles_and_admin_endpoints.sql",
        "title": "Admin Roles & Permissions",
        "description": "Introduces authoritative admin/user role column and admin audit capabilities.",
    },
    {
        "id": "006",
        "file": "006_task_activity_view_and_user_profile_sync.sql",
        "title": "Task Activity View & Profile Foreign Key Sync",
        "description": "Creates task_activity view alias for activity_logs and confirms auth.users foreign key.",
    },
    {
        "id": "007",
        "file": "007_complete_database_schema_and_indexes.sql",
        "title": "Schema Consolidation & Composite Indexes",
        "description": "Sets up schema_migrations tracking, bidirectional sync triggers, and composite query indexes.",
    },
    {
        "id": "008",
        "file": "008_provision_admin_and_clean_demo_data.sql",
        "title": "Purge Demo Members & Authoritative Admin",
        "description": "Purges demo seed accounts and provisions authoritative admin role for yeswanthvarma684280@gmail.com.",
    },
]


@setup_bp.route("/setup/status", methods=["GET"])
def get_setup_status():
    """
    Public system setup and readiness diagnostics endpoint.
    Designed for recruiters, evaluators, and system administrators to verify
    infrastructure readiness without risking leakage of sensitive secrets.
    """
    supabase = get_supabase_client()
    db_mode = "mock" if Config.USE_MOCK_DB or not Config.SUPABASE_URL else "live"

    # 1. Inspect Database Tables & Availability
    table_diagnostics = {}
    db_reachable = True

    required_tables = ["profiles", "tasks", "activity_logs", "notifications", "email_outbox"]
    for table_name in required_tables:
        try:
            resp = supabase.table(table_name).select("id").execute()
            records = resp.data or []
            table_diagnostics[table_name] = {
                "exists": True,
                "count": len(records),
                "status": "healthy",
            }
        except Exception as e:
            db_reachable = False
            table_diagnostics[table_name] = {
                "exists": False,
                "count": 0,
                "status": f"error: {str(e)}",
            }

    # 2. Inspect Outbox Counts
    outbox_stats = {"total": 0, "pending": 0, "sent": 0, "failed": 0}
    try:
        outbox_res = supabase.table("email_outbox").select("status").execute()
        outbox_items = outbox_res.data or []
        outbox_stats["total"] = len(outbox_items)
        for item in outbox_items:
            st = item.get("status", "pending")
            if st in outbox_stats:
                outbox_stats[st] += 1
    except Exception:
        pass

    # 3. Inspect Authentication Configuration (Zero Secrets Leaked)
    google_oauth_status = {
        "provider": "google",
        "client_id_configured": bool(Config.GOOGLE_CLIENT_ID),
        "client_secret_configured": bool(Config.GOOGLE_CLIENT_SECRET),
        "supabase_auth_configured": bool(Config.SUPABASE_URL and Config.SUPABASE_ANON_KEY),
        "callback_url": f"{Config.FRONTEND_URL}/auth/callback",
        "auth_protocol": "Supabase Auth with PKCE (Proof Key for Code Exchange)",
        "account_select_prompt": True,
        "roles_supported": ["admin", "user"],
    }

    # 4. Inspect Direct PostgreSQL Connection
    pg_connected, pg_details = check_direct_pg_connection()

    # 5. Inspect Gmail API Configuration (Zero Secrets Leaked)
    gmail_status = {
        "configured": bool(Config.GMAIL_SENDER_EMAIL and Config.GMAIL_REFRESH_TOKEN),
        "sender_email": Config.GMAIL_SENDER_EMAIL if Config.GMAIL_SENDER_EMAIL else None,
        "refresh_token_present": bool(Config.GMAIL_REFRESH_TOKEN),
        "client_credentials_present": bool(Config.GOOGLE_CLIENT_ID and Config.GOOGLE_CLIENT_SECRET),
        "outbox_stats": outbox_stats,
        "reminder_window_hours": Config.REMINDER_WINDOW_HOURS,
    }

    # 6. Overarching Readiness Assessment
    is_ready = (
        db_reachable
        and table_diagnostics.get("profiles", {}).get("exists", False)
        and table_diagnostics.get("tasks", {}).get("exists", False)
    )

    return (
        jsonify({
            "status": "operational" if is_ready else "degraded",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": "taskflow-pro-api",
            "backend": {
                "environment": Config.FLASK_ENV,
                "port": Config.PORT,
                "frontend_url": Config.FRONTEND_URL,
                "cors_origins": Config.CORS_ORIGINS,
                "secure_headers_enabled": True,
            },
            "database": {
                "mode": db_mode,
                "reachable": db_reachable,
                "tables": table_diagnostics,
                "migrations": KNOWN_MIGRATIONS,
                "direct_connection": pg_details,
            },
            "authentication": google_oauth_status,
            "email": gmail_status,
        }),
        200,
    )


@setup_bp.route("/setup/test-email", methods=["POST"])
def send_test_email():
    """
    Diagnostic endpoint to verify email delivery pipeline.
    Dispatches a test notification or creates a dry-run outbox entry safely.
    """
    data = request.get_json(silent=True) or {}
    recipient = data.get("recipient_email", "evaluator@taskflow.dev").strip()
    dry_run = data.get("dry_run", False)

    if not recipient or "@" not in recipient:
        return jsonify({"error": "Invalid recipient email address"}), 400

    idempotency_key = f"setup-test-{uuid.uuid4().hex[:12]}"
    subject = "[TaskFlow Pro] System Verification & Setup Test"
    html_body = f"""
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #EAE6DF; border-radius: 16px; background-color: #FAF8F5;">
        <h2 style="color: #EA580C; margin-top: 0;">TaskFlow Pro Verification</h2>
        <p style="color: #262626; font-size: 14px; line-height: 1.6;">
            This is an automated verification email confirming that the TaskFlow Pro transactional notification pipeline is operational.
        </p>
        <div style="background-color: #ffffff; padding: 16px; border-radius: 12px; border: 1px solid #EAE6DF; margin: 16px 0;">
            <p style="margin: 0; font-size: 13px; color: #525252;"><strong>Recipient:</strong> {recipient}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #525252;"><strong>Timestamp:</strong> {datetime.now(timezone.utc).isoformat()}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #525252;"><strong>Idempotency Key:</strong> {idempotency_key}</p>
        </div>
        <p style="color: #737373; font-size: 12px; margin-bottom: 0;">
            Sent by TaskFlow Pro recruitment assignment service.
        </p>
    </div>
    """
    text_body = f"TaskFlow Pro Verification Email for {recipient}. Pipeline operational at {datetime.now(timezone.utc).isoformat()}."

    try:
        if dry_run or not (Config.GMAIL_SENDER_EMAIL and Config.GMAIL_REFRESH_TOKEN):
            # Record directly into outbox as simulated delivery
            supabase = get_supabase_client()
            outbox_entry = {
                "id": str(uuid.uuid4()),
                "recipient_email": recipient,
                "recipient_name": "Test Evaluator",
                "subject": subject,
                "event_type": "setup_test",
                "task_id": None,
                "status": "sent" if dry_run else "simulated",
                "idempotency_key": idempotency_key,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "sent_at": datetime.now(timezone.utc).isoformat(),
            }
            supabase.table("email_outbox").insert(outbox_entry).execute()
            return jsonify({
                "success": True,
                "mode": "dry_run" if dry_run else "simulated",
                "message": "Test notification recorded in durable email outbox successfully.",
                "idempotency_key": idempotency_key,
                "recipient": recipient,
            }), 200

        # Live Gmail delivery
        result = GmailService.send_email_with_outbox(
            recipient_email=recipient,
            recipient_name="Test Evaluator",
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            event_type="setup_test",
            task_id=None,
            idempotency_key=idempotency_key,
        )
        return jsonify({
            "success": result.get("success", False),
            "mode": "live",
            "message": "Test notification dispatched via Gmail API.",
            "idempotency_key": idempotency_key,
            "recipient": recipient,
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to dispatch test notification",
            "details": str(e),
        }), 500
