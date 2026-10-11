import logging
from datetime import datetime, timezone, timedelta
from flask import Blueprint, jsonify, request
from backend.services.auth_service import require_auth, require_role
from backend.services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/stats", methods=["GET"])
@require_role("admin")
def get_admin_stats():
    """
    Returns application-wide system and operational metrics for administrator dashboard.
    Only accessible by users with role 'admin'.
    """
    supabase = get_supabase_client()

    # 1. User stats
    users_res = supabase.table("profiles").select("id, role, created_at").execute()
    users = users_res.data or []
    total_users = len(users)
    admin_users = sum(1 for u in users if u.get("role") == "admin")
    regular_users = sum(1 for u in users if u.get("role") == "user")

    # 2. Task stats
    tasks_res = supabase.table("tasks").select("*").execute()
    tasks = tasks_res.data or []
    total_tasks = len(tasks)

    completed_tasks = sum(1 for t in tasks if t.get("status") == "completed")
    in_progress_tasks = sum(1 for t in tasks if t.get("status") == "in_progress")
    todo_tasks = sum(1 for t in tasks if t.get("status") == "todo")

    now = datetime.now(timezone.utc)
    def is_overdue(t):
        if t.get("status") == "completed" or not t.get("due_date"):
            return False
        try:
            due = datetime.fromisoformat(t["due_date"].replace("Z", "+00:00"))
            return due < now
        except Exception:
            return False

    overdue_tasks = sum(1 for t in tasks if is_overdue(t))
    completion_rate = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0

    # 3. Active Assignees
    active_assignee_ids = {str(t["assignee_id"]) for t in tasks if t.get("assignee_id")}
    active_users_count = len(active_assignee_ids)

    # 4. Email Outbox & Delivery Status
    outbox_res = supabase.table("email_outbox").select("id, status").execute()
    emails = outbox_res.data or []
    emails_sent = sum(1 for e in emails if e.get("status") == "sent")
    emails_pending = sum(1 for e in emails if e.get("status") == "pending")
    emails_failed = sum(1 for e in emails if e.get("status") == "failed")

    # 5. Activity logs count
    activity_res = supabase.table("activity_logs").select("id").execute()
    total_activity = len(activity_res.data or [])

    return jsonify({
        "stats": {
            "total_users": total_users,
            "admin_users": admin_users,
            "regular_users": regular_users,
            "active_users_count": active_users_count,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "in_progress_tasks": in_progress_tasks,
            "todo_tasks": todo_tasks,
            "overdue_tasks": overdue_tasks,
            "completion_rate": completion_rate,
            "total_activity": total_activity,
            "email_delivery": {
                "total": len(emails),
                "sent": emails_sent,
                "pending": emails_pending,
                "failed": emails_failed
            }
        }
    }), 200

@admin_bp.route("/users", methods=["GET"])
@require_role("admin")
def list_admin_users():
    """
    Returns registered users with pagination, role indicators, and task volume metrics.
    """
    supabase = get_supabase_client()
    page = max(1, int(request.args.get("page", 1)))
    limit = min(100, max(1, int(request.args.get("limit", 25))))
    search = request.args.get("search", "").strip().lower()
    role_filter = request.args.get("role", "").strip().lower()

    users_res = supabase.table("profiles").select("*").order("created_at", desc=True).execute()
    users = users_res.data or []

    # Get task counts for each user
    tasks_res = supabase.table("tasks").select("id, creator_id, assignee_id, status").execute()
    tasks = tasks_res.data or []

    task_stats_map = {}
    for t in tasks:
        cid = str(t.get("creator_id")) if t.get("creator_id") else None
        aid = str(t.get("assignee_id")) if t.get("assignee_id") else None
        status = t.get("status")

        if cid:
            task_stats_map.setdefault(cid, {"created": 0, "assigned": 0, "completed": 0})
            task_stats_map[cid]["created"] += 1
        if aid:
            task_stats_map.setdefault(aid, {"created": 0, "assigned": 0, "completed": 0})
            task_stats_map[aid]["assigned"] += 1
            if status == "completed":
                task_stats_map[aid]["completed"] += 1

    for u in users:
        uid = str(u["id"])
        stats = task_stats_map.get(uid, {"created": 0, "assigned": 0, "completed": 0})
        u["tasks_created"] = stats["created"]
        u["tasks_assigned"] = stats["assigned"]
        u["tasks_completed"] = stats["completed"]

    if search:
        users = [
            u for u in users
            if search in (u.get("full_name") or "").lower() or search in (u.get("email") or "").lower()
        ]

    if role_filter in ("admin", "user"):
        users = [u for u in users if u.get("role") == role_filter]

    total = len(users)
    offset = (page - 1) * limit
    paginated = users[offset: offset + limit]

    return jsonify({
        "users": paginated,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit if total > 0 else 1
    }), 200

@admin_bp.route("/users/<user_id>/role", methods=["PATCH"])
@require_role("admin")
def update_user_role(user_id):
    """
    Updates a user's role between 'admin' and 'user'.
    Enforces authorization, prevents self-demotion, and logs the administrative action.
    """
    current_admin = request.current_user
    body = request.get_json(silent=True) or {}
    new_role = (body.get("role") or "").strip().lower()

    if new_role not in ("admin", "user"):
        return jsonify({
            "error": "Invalid role",
            "message": "Role must be either 'admin' or 'user'"
        }), 400

    # Prevent self-demotion
    if str(user_id) == str(current_admin["id"]) and new_role != "admin":
        return jsonify({
            "error": "Forbidden",
            "message": "Administrators cannot demote their own account. Another administrator must perform this action."
        }), 403

    supabase = get_supabase_client()
    target_res = supabase.table("profiles").select("*").eq("id", str(user_id)).execute()
    if not target_res.data or len(target_res.data) == 0:
        return jsonify({"error": "User not found", "message": f"User ID '{user_id}' does not exist"}), 404

    target_user = target_res.data[0]
    old_role = target_user.get("role", "user")

    # Prevent demoting designated primary administrator
    from backend.config import Config
    admin_emails = [e.lower() for e in getattr(Config, "ADMIN_EMAILS", ["yeswanthvarma684280@gmail.com"])]
    if (target_user.get("email") or "").lower() in admin_emails and new_role != "admin":
        return jsonify({
            "error": "Forbidden",
            "message": "The designated primary administrator account cannot be demoted."
        }), 403

    if old_role == new_role:
        return jsonify({
            "message": f"User is already assigned role '{new_role}'",
            "user": target_user
        }), 200

    # Update role in database
    upd_res = (
        supabase.table("profiles")
        .update({"role": new_role, "updated_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", str(user_id))
        .execute()
    )
    updated_user = upd_res.data[0] if upd_res.data else target_user
    updated_user["role"] = new_role

    # Audit log the administrative promotion / demotion
    try:
        supabase.table("activity_logs").insert({
            "task_id": None,
            "user_id": current_admin["id"],
            "action": "role_changed",
            "details": {
                "target_user_id": str(user_id),
                "target_email": target_user.get("email"),
                "previous_role": old_role,
                "new_role": new_role,
                "performed_by": current_admin.get("email")
            }
        }).execute()
    except Exception as e:
        logger.warning("Failed to record role change audit log: %s", e)

    return jsonify({
        "message": f"User role successfully updated to '{new_role}'",
        "user": updated_user
    }), 200

@admin_bp.route("/tasks", methods=["GET"])
@require_role("admin")
def list_admin_tasks():
    """
    Returns system-wide tasks across all creators and assignees with filters and pagination.
    Only accessible by users with role 'admin'.
    """
    from backend.services.task_service import TaskService
    params = request.args.to_dict()
    # Force admin scope so list_tasks returns all tasks
    result = TaskService.list_tasks(request.current_user, params)
    return jsonify(result), 200

@admin_bp.route("/activity", methods=["GET"])
@require_role("admin")
def list_admin_activity():
    """
    Returns system-wide audit activity logs across all tasks and administrative operations.
    """
    supabase = get_supabase_client()
    page = max(1, int(request.args.get("page", 1)))
    limit = min(100, max(1, int(request.args.get("limit", 50))))

    logs_res = (
        supabase.table("activity_logs")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    logs = logs_res.data or []

    # Hydrate profiles and tasks
    profiles_res = supabase.table("profiles").select("id, full_name, email, avatar_url, role").execute()
    profiles_map = {str(p["id"]): p for p in (profiles_res.data or [])}

    tasks_res = supabase.table("tasks").select("id, title").execute()
    tasks_map = {str(t["id"]): t.get("title") for t in (tasks_res.data or [])}

    for log in logs:
        uid = str(log.get("user_id")) if log.get("user_id") else None
        tid = str(log.get("task_id")) if log.get("task_id") else None
        log["user"] = profiles_map.get(uid) if uid else None
        log["task_title"] = tasks_map.get(tid) if tid else None

    total = len(logs)
    offset = (page - 1) * limit
    paginated = logs[offset: offset + limit]

    return jsonify({
        "activity": paginated,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit if total > 0 else 1
    }), 200

@admin_bp.route("/notifications", methods=["GET"])
@require_role("admin")
def list_admin_notifications():
    """
    Returns system-wide notification delivery audit and email outbox delivery log.
    """
    supabase = get_supabase_client()

    notifs_res = (
        supabase.table("notifications")
        .select("*")
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )
    notifications = notifs_res.data or []

    emails_res = (
        supabase.table("email_outbox")
        .select("*")
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )
    emails = emails_res.data or []

    # Hydrate profiles
    profiles_res = supabase.table("profiles").select("id, full_name, email").execute()
    profiles_map = {str(p["id"]): p for p in (profiles_res.data or [])}

    for n in notifications:
        n["user"] = profiles_map.get(str(n.get("user_id")))

    return jsonify({
        "notifications": notifications,
        "email_outbox": emails,
        "total_notifications": len(notifications),
        "total_emails": len(emails)
    }), 200
