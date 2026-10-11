import os
from flask import Blueprint, jsonify, request
from backend.services.reminder_service import ReminderService

reminder_bp = Blueprint("reminders", __name__)

@reminder_bp.route("/process", methods=["POST"])
def process_reminders():
    """
    Endpoint triggered by scheduled cron job or worker to scan deadlines.
    Protected by CRON_SECRET if configured.
    """
    cron_secret = os.getenv("CRON_SECRET", "")
    if cron_secret:
        header_key = request.headers.get("X-CRON-KEY", "")
        if header_key != cron_secret:
            return jsonify({"error": "Unauthorized cron request"}), 401

    results = ReminderService.check_and_send_deadline_reminders()
    return jsonify({
        "message": "Deadline reminders processed",
        "results": results
    }), 200
