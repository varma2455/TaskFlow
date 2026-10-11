from flask import Blueprint, jsonify, request
from backend.services.auth_service import require_auth
from backend.services.supabase_client import get_supabase_client

notification_bp = Blueprint("notifications", __name__)

@notification_bp.route("", methods=["GET"])
@require_auth
def get_user_notifications():
    user = request.current_user
    supabase = get_supabase_client()

    res = (
        supabase.table("notifications")
        .select("*")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    notifications = res.data or []
    unread_count = sum(1 for n in notifications if not n.get("is_read"))

    return jsonify({
        "notifications": notifications,
        "unread_count": unread_count
    }), 200

@notification_bp.route("/<notification_id>/read", methods=["PATCH"])
@require_auth
def mark_notification_read(notification_id):
    user = request.current_user
    supabase = get_supabase_client()

    # Verify ownership before updating
    existing = (
        supabase.table("notifications")
        .select("*")
        .eq("id", notification_id)
        .execute()
    )
    if not existing.data or len(existing.data) == 0:
        return jsonify({"error": "Notification not found"}), 404

    notif = existing.data[0]
    if str(notif.get("user_id")) != user["id"]:
        return jsonify({"error": "Forbidden: You do not own this notification"}), 403

    upd_res = (
        supabase.table("notifications")
        .update({"is_read": True})
        .eq("id", notification_id)
        .execute()
    )
    updated = upd_res.data[0] if upd_res.data else notif

    return jsonify({"message": "Notification marked as read", "notification": updated}), 200

@notification_bp.route("/mark-all-read", methods=["POST"])
@require_auth
def mark_all_notifications_read():
    user = request.current_user
    supabase = get_supabase_client()

    supabase.table("notifications").update({"is_read": True}).eq("user_id", user["id"]).execute()
    return jsonify({"message": "All notifications marked as read"}), 200
