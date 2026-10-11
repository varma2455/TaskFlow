import logging
from flask import Blueprint, jsonify, request
from backend.config import Config
from backend.services.auth_service import require_auth
from backend.services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/profile", methods=["GET"])
@auth_bp.route("/me", methods=["GET"])
@require_auth
def get_current_user_profile():
    """
    Returns authenticated user profile from database.
    """
    user = request.current_user
    supabase = get_supabase_client()
    res = supabase.table("profiles").select("*").eq("id", user["id"]).execute()

    if res.data and len(res.data) > 0:
        profile_data = res.data[0]
        return jsonify({"profile": profile_data, "user": profile_data}), 200

    # Auto-create if not yet stored
    new_profile = {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "avatar_url": user.get("avatar_url", ""),
        "role": user.get("role", "user"),
        "reminder_preference": True,
    }
    ins_res = supabase.table("profiles").insert(new_profile).execute()
    created = ins_res.data[0] if ins_res.data else new_profile
    return jsonify({"profile": created, "user": created}), 200

@auth_bp.route("/sync-user", methods=["POST"])
@require_auth
def sync_user():
    """
    Syncs user information upon Google OAuth callback.
    Guarantees user profile exists in Supabase PostgreSQL database.
    Ignores any client-supplied role to prevent unauthorized self-promotion.
    """
    user = request.current_user
    body = request.get_json(silent=True) or {}
    supabase = get_supabase_client()

    full_name = body.get("full_name") or user.get("full_name")
    avatar_url = body.get("avatar_url") or user.get("avatar_url")

    # Check if designated admin
    user_email = (user.get("email") or "").lower()
    admin_emails = [e.lower() for e in getattr(Config, "ADMIN_EMAILS", ["yeswanthvarma684280@gmail.com"])]
    is_designated_admin = user_email in admin_emails

    # Upsert into profiles (never overwrite existing role except to guarantee designated admin)
    existing = supabase.table("profiles").select("*").eq("id", user["id"]).execute()
    if existing.data and len(existing.data) > 0:
        update_data = {
            "full_name": full_name,
            "avatar_url": avatar_url,
        }
        if is_designated_admin:
            update_data["role"] = "admin"
        supabase.table("profiles").update(update_data).eq("id", user["id"]).execute()
    else:
        assigned_role = "admin" if is_designated_admin else user.get("role", "user")
        supabase.table("profiles").insert({
            "id": user["id"],
            "email": user["email"],
            "full_name": full_name,
            "avatar_url": avatar_url,
            "role": assigned_role,
            "reminder_preference": True,
        }).execute()

    profile_res = supabase.table("profiles").select("*").eq("id", user["id"]).execute()
    profile = profile_res.data[0] if profile_res.data else user

    return jsonify({"message": "User profile synced successfully", "profile": profile}), 200

@auth_bp.route("/preferences", methods=["PUT"])
@require_auth
def update_preferences():
    """
    Updates user reminder preferences.
    """
    user = request.current_user
    body = request.get_json(silent=True) or {}
    reminder_preference = body.get("reminder_preference")

    if reminder_preference is None:
        return jsonify({"error": "reminder_preference is required"}), 400

    supabase = get_supabase_client()
    supabase.table("profiles").update({
        "reminder_preference": bool(reminder_preference)
    }).eq("id", user["id"]).execute()

    return jsonify({"message": "Preferences updated", "reminder_preference": bool(reminder_preference)}), 200
