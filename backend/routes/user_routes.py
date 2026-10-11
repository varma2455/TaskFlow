from flask import Blueprint, jsonify, request
from backend.services.auth_service import require_auth
from backend.services.supabase_client import get_supabase_client

user_bp = Blueprint("users", __name__)

@user_bp.route("", methods=["GET"])
@require_auth
def list_team_members():
    """
    Returns list of all active registered teammates for assignment dropdown.
    Restricts sensitive attributes (returns id, email, full_name, avatar_url, role).
    """
    supabase = get_supabase_client()
    res = supabase.table("profiles").select("id, email, full_name, avatar_url, role").execute()
    users = res.data or []
    return jsonify({"users": users}), 200
