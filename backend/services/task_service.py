import logging
import uuid
from datetime import datetime, timezone, timedelta
from backend.services.supabase_client import get_supabase_client
from backend.services.gmail_service import GmailService

logger = logging.getLogger(__name__)

VALID_PRIORITIES = {"low", "medium", "high", "urgent"}
VALID_STATUSES = {"todo", "in_progress", "completed"}

class TaskService:
    @staticmethod
    def _get_user_profile(user_id: str) -> dict:
        supabase = get_supabase_client()
        res = supabase.table("profiles").select("*").eq("id", user_id).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
        return None

    @classmethod
    def list_tasks(cls, current_user: dict, params: dict) -> dict:
        """
        Retrieves tasks visible to current_user, supporting search, filters and pagination.
        Enforces authorization: users see tasks they created, are assigned to, or admin visibility.
        """
        supabase = get_supabase_client()
        is_admin = current_user.get("role") == "admin"
        user_id = current_user["id"]

        query = supabase.table("tasks").select("*")

        # RLS / Authorization enforcement
        # If not admin, restrict to tasks created by or assigned to current user
        status_filter = params.get("status")
        priority_filter = params.get("priority")
        search_query = params.get("search", "").strip()
        overdue_filter = params.get("overdue") in ("true", "1")
        due_soon_filter = params.get("due_soon") in ("true", "1")
        page = max(1, int(params.get("page", 1)))
        limit = min(100, max(1, int(params.get("limit", 50))))
        sort_by = params.get("sort_by", "created_at")
        sort_desc = params.get("sort_desc", "true") in ("true", "1")

        res = query.execute()
        all_tasks = res.data or []

        # Server-side authorization check: only return authorized tasks
        tasks = []
        for t in all_tasks:
            creator_id = str(t.get("creator_id"))
            assignee_id = str(t.get("assignee_id")) if t.get("assignee_id") else None
            if is_admin or creator_id == user_id or assignee_id == user_id:
                tasks.append(t)

        now = datetime.now(timezone.utc)

        # Apply Filters
        if status_filter and status_filter in VALID_STATUSES:
            tasks = [t for t in tasks if t.get("status") == status_filter]

        if priority_filter and priority_filter in VALID_PRIORITIES:
            tasks = [t for t in tasks if t.get("priority") == priority_filter]

        assignee_filter = params.get("assignee_id")
        if assignee_filter:
            tasks = [t for t in tasks if str(t.get("assignee_id")) == str(assignee_filter)]

        if search_query:
            q_lower = search_query.lower()
            tasks = [
                t for t in tasks
                if q_lower in (t.get("title") or "").lower() or q_lower in (t.get("description") or "").lower()
            ]

        if overdue_filter:
            def is_overdue(t):
                if t.get("status") == "completed" or not t.get("due_date"):
                    return False
                try:
                    due = datetime.fromisoformat(t["due_date"].replace("Z", "+00:00"))
                    return due < now
                except Exception:
                    return False
            tasks = [t for t in tasks if is_overdue(t)]

        if due_soon_filter:
            def is_due_soon(t):
                if t.get("status") == "completed" or not t.get("due_date"):
                    return False
                try:
                    due = datetime.fromisoformat(t["due_date"].replace("Z", "+00:00"))
                    return now <= due <= (now + timedelta(hours=48))
                except Exception:
                    return False
            tasks = [t for t in tasks if is_due_soon(t)]

        # Attach creator and assignee profile details
        profiles_map = {}
        prof_res = supabase.table("profiles").select("*").execute()
        if prof_res.data:
            profiles_map = {str(p["id"]): p for p in prof_res.data}

        for t in tasks:
            t["creator"] = profiles_map.get(str(t.get("creator_id")))
            t["assignee"] = profiles_map.get(str(t.get("assignee_id"))) if t.get("assignee_id") else None

        # Sort tasks
        tasks.sort(
            key=lambda t: (t.get(sort_by) is None, t.get(sort_by) or ""),
            reverse=sort_desc
        )

        total_count = len(tasks)
        offset = (page - 1) * limit
        paginated_tasks = tasks[offset: offset + limit]

        return {
            "tasks": paginated_tasks,
            "total": total_count,
            "page": page,
            "limit": limit,
            "total_pages": (total_count + limit - 1) // limit if total_count > 0 else 1
        }

    @classmethod
    def get_task_by_id(cls, task_id: str, current_user: dict) -> dict:
        supabase = get_supabase_client()
        res = supabase.table("tasks").select("*").eq("id", task_id).execute()
        if not res.data or len(res.data) == 0:
            raise KeyError(f"Task with ID '{task_id}' not found")

        task = res.data[0]
        creator_id = str(task.get("creator_id"))
        assignee_id = str(task.get("assignee_id")) if task.get("assignee_id") else None
        is_admin = current_user.get("role") == "admin"

        # Authorization check
        if not (is_admin or creator_id == current_user["id"] or assignee_id == current_user["id"]):
            raise PermissionError("You are not authorized to view this task")

        # Hydrate profiles
        task["creator"] = cls._get_user_profile(creator_id)
        task["assignee"] = cls._get_user_profile(assignee_id) if assignee_id else None

        return task

    @classmethod
    def create_task(cls, payload: dict, current_user: dict) -> dict:
        """
        Creates a new task, validates inputs, logs activity, and sends notifications.
        """
        title = (payload.get("title") or "").strip()
        if not title:
            raise ValueError("Task title is required")
        if len(title) > 255:
            raise ValueError("Task title cannot exceed 255 characters")

        priority = (payload.get("priority") or "medium").lower()
        if priority not in VALID_PRIORITIES:
            raise ValueError(f"Invalid priority. Allowed values: {', '.join(sorted(VALID_PRIORITIES))}")

        assignee_id = payload.get("assignee_id")
        if assignee_id:
            assignee = cls._get_user_profile(str(assignee_id))
            if not assignee:
                raise ValueError(f"Assignee with ID '{assignee_id}' does not exist")
        else:
            assignee = None

        due_val = payload.get("due_at") or payload.get("due_date")
        if due_val:
            try:
                # Validate ISO datetime format
                datetime.fromisoformat(due_val.replace("Z", "+00:00"))
            except Exception:
                raise ValueError("Invalid due_date format. Must be an ISO-8601 timestamp")

        supabase = get_supabase_client()
        task_data = {
            "title": title,
            "description": payload.get("description", ""),
            "status": "todo",
            "priority": priority,
            "creator_id": current_user["id"],
            "assignee_id": assignee_id if assignee_id else None,
            "due_date": due_val,
            "due_at": due_val,
        }

        insert_res = supabase.table("tasks").insert(task_data).execute()
        if not insert_res.data:
            raise RuntimeError("Failed to persist task in database")

        created_task = insert_res.data[0]
        task_id = str(created_task["id"])

        # Record activity log
        supabase.table("activity_logs").insert({
            "task_id": task_id,
            "user_id": current_user["id"],
            "action": "created",
            "details": {
                "title": title,
                "priority": priority,
                "assignee_id": assignee_id
            }
        }).execute()

        # Handle notifications if assigned to someone else
        if assignee and str(assignee["id"]) != current_user["id"]:
            # In-app notification
            supabase.table("notifications").insert({
                "user_id": str(assignee["id"]),
                "task_id": task_id,
                "type": "task_assigned",
                "title": "New Task Assigned",
                "message": f"{current_user.get('full_name', 'A teammate')} assigned you '{title}'"
            }).execute()

            # Email notification via Gmail Service
            creator_profile = cls._get_user_profile(current_user["id"]) or current_user
            GmailService.send_task_assigned_notification(created_task, assignee, creator_profile)

        created_task["creator"] = cls._get_user_profile(current_user["id"])
        created_task["assignee"] = assignee
        return created_task

    @classmethod
    def update_task(cls, task_id: str, payload: dict, current_user: dict) -> dict:
        """
        Updates task fields with authorization checks and activity logging.
        """
        task = cls.get_task_by_id(task_id, current_user)
        supabase = get_supabase_client()
        update_data = {}
        activity_details = {}

        # Enforce that creator_id can never be changed
        if "creator_id" in payload and str(payload["creator_id"]) != str(task.get("creator_id")):
            raise PermissionError("Cannot modify task creator ID")

        if "title" in payload:
            new_title = (payload["title"] or "").strip()
            if not new_title:
                raise ValueError("Task title cannot be empty")
            update_data["title"] = new_title
            activity_details["title"] = new_title

        if "description" in payload:
            update_data["description"] = payload["description"]

        if "priority" in payload:
            new_pri = payload["priority"].lower()
            if new_pri not in VALID_PRIORITIES:
                raise ValueError(f"Invalid priority: {new_pri}")
            update_data["priority"] = new_pri
            activity_details["priority"] = new_pri

        if "due_date" in payload or "due_at" in payload:
            new_due = payload.get("due_at") or payload.get("due_date")
            if new_due:
                try:
                    datetime.fromisoformat(new_due.replace("Z", "+00:00"))
                except Exception:
                    raise ValueError("Invalid due_date format. Must be an ISO-8601 timestamp")
            update_data["due_date"] = new_due
            update_data["due_at"] = new_due
            activity_details["due_date"] = new_due

        if "assignee_id" in payload:
            new_assignee_id = payload["assignee_id"]
            if new_assignee_id and str(new_assignee_id) != str(task.get("assignee_id")):
                new_assignee = cls._get_user_profile(str(new_assignee_id))
                if not new_assignee:
                    raise ValueError(f"Assignee ID '{new_assignee_id}' does not exist")
                update_data["assignee_id"] = str(new_assignee_id)
                activity_details["assignee_changed_to"] = new_assignee.get("full_name")

                # In-app notification
                supabase.table("notifications").insert({
                    "user_id": str(new_assignee["id"]),
                    "task_id": task_id,
                    "type": "task_assigned",
                    "title": "Task Assigned",
                    "message": f"You were assigned to task '{task.get('title')}' by {current_user.get('full_name')}"
                }).execute()

                # Email notification
                creator_profile = cls._get_user_profile(current_user["id"]) or current_user
                GmailService.send_task_assigned_notification(task, new_assignee, creator_profile)
            elif not new_assignee_id:
                update_data["assignee_id"] = None

        if "status" in payload:
            new_status = payload["status"].lower()
            if new_status not in VALID_STATUSES:
                raise ValueError(f"Invalid status: {new_status}")
            old_status = task.get("status")
            if new_status != old_status:
                update_data["status"] = new_status
                activity_details["status_changed"] = f"{old_status} -> {new_status}"
                if new_status == "completed":
                    update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
                    cls._handle_completion_notifications(task, current_user)
                else:
                    update_data["completed_at"] = None

        if not update_data:
            return task

        upd_res = supabase.table("tasks").update(update_data).eq("id", task_id).execute()
        updated_task = upd_res.data[0] if upd_res.data else task
        updated_task.update(update_data)

        # Log activity
        supabase.table("activity_logs").insert({
            "task_id": task_id,
            "user_id": current_user["id"],
            "action": "updated",
            "details": activity_details
        }).execute()

        updated_task["creator"] = cls._get_user_profile(str(updated_task.get("creator_id")))
        updated_task["assignee"] = cls._get_user_profile(str(updated_task.get("assignee_id"))) if updated_task.get("assignee_id") else None

        return updated_task

    @classmethod
    def _handle_completion_notifications(cls, task: dict, completed_by: dict):
        supabase = get_supabase_client()
        task_id = str(task["id"])
        creator_id = str(task.get("creator_id"))
        assignee_id = str(task.get("assignee_id")) if task.get("assignee_id") else None
        completer_id = completed_by["id"]

        recipients = set()
        if creator_id != completer_id:
            recipients.add(creator_id)
        if assignee_id and assignee_id != completer_id:
            recipients.add(assignee_id)

        for rec_id in recipients:
            rec_profile = cls._get_user_profile(rec_id)
            if not rec_profile:
                continue

            supabase.table("notifications").insert({
                "user_id": rec_id,
                "task_id": task_id,
                "type": "task_completed",
                "title": "Task Completed",
                "message": f"'{task.get('title')}' was marked as completed by {completed_by.get('full_name', 'a teammate')}"
            }).execute()

            GmailService.send_task_completed_notification(task, rec_profile, completed_by)

    @classmethod
    def delete_task(cls, task_id: str, current_user: dict) -> dict:
        """
        Deletes a task with strict authorization: only creator or admin can delete.
        """
        task = cls.get_task_by_id(task_id, current_user)
        is_creator = str(task.get("creator_id")) == current_user["id"]
        is_admin = current_user.get("role") == "admin"

        if not (is_creator or is_admin):
            raise PermissionError("Only the task creator or an administrator can delete this task")

        supabase = get_supabase_client()
        supabase.table("tasks").delete().eq("id", task_id).execute()
        return {"deleted": True, "task_id": task_id, "title": task.get("title")}

    @classmethod
    def get_task_activity(cls, task_id: str, current_user: dict) -> list:
        # Check authorization to task
        cls.get_task_by_id(task_id, current_user)
        supabase = get_supabase_client()
        res = (
            supabase.table("activity_logs")
            .select("*")
            .eq("task_id", task_id)
            .order("created_at", desc=True)
            .execute()
        )
        logs = res.data or []

        # Hydrate user details for each log
        profiles_res = supabase.table("profiles").select("*").execute()
        prof_map = {str(p["id"]): p for p in (profiles_res.data or [])}

        for log in logs:
            log["user"] = prof_map.get(str(log.get("user_id")))

        return logs
