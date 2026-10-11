import logging
from flask import Blueprint, jsonify, request
from backend.services.auth_service import require_auth
from backend.services.task_service import TaskService

logger = logging.getLogger(__name__)
task_bp = Blueprint("tasks", __name__)

@task_bp.route("", methods=["GET"])
@require_auth
def list_tasks():
    try:
        result = TaskService.list_tasks(request.current_user, request.args.to_dict())
        return jsonify(result), 200
    except Exception as e:
        logger.error("Error listing tasks: %s", e)
        return jsonify({"error": "Failed to retrieve tasks", "details": str(e)}), 500

@task_bp.route("", methods=["POST"])
@require_auth
def create_task():
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    try:
        task = TaskService.create_task(body, request.current_user)
        return jsonify({"message": "Task created successfully", "task": task}), 201
    except ValueError as e:
        return jsonify({"error": "Invalid Input", "details": str(e)}), 400
    except Exception as e:
        logger.error("Error creating task: %s", e)
        return jsonify({"error": "Failed to create task", "details": str(e)}), 500

@task_bp.route("/<task_id>", methods=["GET"])
@require_auth
def get_task(task_id):
    try:
        task = TaskService.get_task_by_id(task_id, request.current_user)
        return jsonify({"task": task}), 200
    except KeyError:
        return jsonify({"error": "Task not found"}), 404
    except PermissionError as e:
        return jsonify({"error": "Forbidden", "details": str(e)}), 403
    except Exception as e:
        return jsonify({"error": "Error retrieving task", "details": str(e)}), 500

@task_bp.route("/<task_id>", methods=["PUT", "PATCH"])
@require_auth
def update_task(task_id):
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    try:
        updated = TaskService.update_task(task_id, body, request.current_user)
        return jsonify({"message": "Task updated successfully", "task": updated}), 200
    except KeyError:
        return jsonify({"error": "Task not found"}), 404
    except PermissionError as e:
        return jsonify({"error": "Forbidden", "details": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": "Invalid Input", "details": str(e)}), 400
    except Exception as e:
        logger.error("Error updating task: %s", e)
        return jsonify({"error": "Failed to update task", "details": str(e)}), 500

@task_bp.route("/<task_id>/status", methods=["PATCH"])
@require_auth
def update_task_status(task_id):
    body = request.get_json(silent=True)
    if not body or "status" not in body:
        return jsonify({"error": "'status' field is required"}), 400

    try:
        updated = TaskService.update_task(task_id, {"status": body["status"]}, request.current_user)
        return jsonify({"message": "Status updated successfully", "task": updated}), 200
    except KeyError:
        return jsonify({"error": "Task not found"}), 404
    except PermissionError as e:
        return jsonify({"error": "Forbidden", "details": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": "Invalid Input", "details": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "Failed to update status", "details": str(e)}), 500

@task_bp.route("/<task_id>", methods=["DELETE"])
@require_auth
def delete_task(task_id):
    try:
        res = TaskService.delete_task(task_id, request.current_user)
        return jsonify({"message": "Task deleted successfully", "details": res}), 200
    except KeyError:
        return jsonify({"error": "Task not found"}), 404
    except PermissionError as e:
        return jsonify({"error": "Forbidden", "details": str(e)}), 403
    except Exception as e:
        logger.error("Error deleting task: %s", e)
        return jsonify({"error": "Failed to delete task", "details": str(e)}), 500

@task_bp.route("/<task_id>/activity", methods=["GET"])
@require_auth
def get_activity_log(task_id):
    try:
        logs = TaskService.get_task_activity(task_id, request.current_user)
        return jsonify({"activity": logs}), 200
    except KeyError:
        return jsonify({"error": "Task not found"}), 404
    except PermissionError as e:
        return jsonify({"error": "Forbidden", "details": str(e)}), 403
    except Exception as e:
        return jsonify({"error": "Failed to retrieve activity log", "details": str(e)}), 500
