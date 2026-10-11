from flask import Blueprint, jsonify, request
from backend.services.auth_service import require_auth
from backend.services.reminder_service import ReminderService

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/stats", methods=["GET"])
@require_auth
def get_stats():
    """
    Returns dashboard statistics (total, completed, in_progress, overdue, due_soon, completion_rate).
    """
    stats = ReminderService.get_dashboard_deadline_stats(request.current_user)
    return jsonify({"stats": stats}), 200
