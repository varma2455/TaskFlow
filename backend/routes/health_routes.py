from datetime import datetime, timezone
from flask import Blueprint, jsonify
from backend.services.supabase_client import get_supabase_client

health_bp = Blueprint("health", __name__)

@health_bp.route("/health", methods=["GET"])
def health_check():
    """
    Production health check endpoint for Render/Kubernetes.
    Verifies API and database connectivity.
    """
    db_status = "ok"
    try:
        supabase = get_supabase_client()
        supabase.table("profiles").select("id").limit(1).execute()
    except Exception as e:
        db_status = f"unreachable ({str(e)})"

    return jsonify({
        "status": "healthy" if db_status == "ok" else "degraded",
        "service": "taskflow-api",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db_status
    }), 200 if db_status == "ok" else 503
