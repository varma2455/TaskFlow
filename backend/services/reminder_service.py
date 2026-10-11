import logging
from datetime import datetime, timezone, timedelta
from backend.config import Config
from backend.services.supabase_client import get_supabase_client
from backend.services.gmail_service import GmailService

logger = logging.getLogger(__name__)

class ReminderService:
    @classmethod
    def check_and_send_deadline_reminders(cls) -> dict:
        """
        Scans all pending tasks and sends email/in-app reminders for upcoming deadlines.
        Guarantees:
        1. Only sends if task is not completed.
        2. Only sends if assignee exists and has reminder_preference enabled.
        3. Prevents duplicate reminder emails for the same window.
        4. Safe timezone handling in UTC.
        """
        supabase = get_supabase_client()
        now = datetime.now(timezone.utc)
        window_hours = Config.REMINDER_WINDOW_HOURS
        window_delta = timedelta(hours=window_hours)

        # 1. Fetch non-completed tasks with a due date
        res = (
            supabase.table("tasks")
            .select("*")
            .neq("status", "completed")
            .execute()
        )
        tasks = res.data or []

        # 2. Fetch all profiles
        prof_res = supabase.table("profiles").select("*").execute()
        profiles_map = {str(p["id"]): p for p in (prof_res.data or [])}

        processed = 0
        reminders_sent = 0
        skipped = 0

        for task in tasks:
            due_date_str = task.get("due_date")
            if not due_date_str:
                continue

            assignee_id = task.get("assignee_id")
            if not assignee_id:
                continue

            assignee = profiles_map.get(str(assignee_id))
            if not assignee:
                continue

            # Check assignee preference
            if assignee.get("reminder_preference") is False:
                skipped += 1
                continue

            try:
                due_date = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
            except Exception:
                continue

            processed += 1
            time_remaining = due_date - now

            # If task is due within the configured window (e.g., 0 to 24 hours remaining)
            if timedelta(seconds=0) <= time_remaining <= window_delta:
                hours_remaining = max(1, int(time_remaining.total_seconds() // 3600))
                task_id = str(task["id"])

                # Check if reminder was already sent recently (within last 18 hours)
                reminder_sent_at_str = task.get("reminder_sent_at")
                if reminder_sent_at_str:
                    try:
                        sent_at = datetime.fromisoformat(reminder_sent_at_str.replace("Z", "+00:00"))
                        if now - sent_at < timedelta(hours=18):
                            # Already notified for this deadline cycle
                            skipped += 1
                            continue
                    except Exception:
                        pass

                # Dispatch reminder notification
                logger.info("Sending deadline reminder for task %s to %s", task_id, assignee.get("email"))

                # In-app notification
                supabase.table("notifications").insert({
                    "user_id": str(assignee["id"]),
                    "task_id": task_id,
                    "type": "deadline_reminder",
                    "title": "Upcoming Deadline",
                    "message": f"Task '{task.get('title')}' is due in approx. {hours_remaining} hours."
                }).execute()

                # Dispatch email via Gmail Service
                email_result = GmailService.send_deadline_reminder_notification(
                    task, assignee, hours_remaining
                )

                # Mark reminder_sent_at on task record
                supabase.table("tasks").update({
                    "reminder_sent_at": now.isoformat()
                }).eq("id", task_id).execute()

                reminders_sent += 1

        logger.info(
            "Deadline reminder check completed. Processed: %d, Sent: %d, Skipped: %d",
            processed, reminders_sent, skipped
        )
        return {
            "processed": processed,
            "reminders_sent": reminders_sent,
            "skipped": skipped,
            "timestamp": now.isoformat()
        }

    @classmethod
    def get_dashboard_deadline_stats(cls, current_user: dict) -> dict:
        """
        Calculates overdue and due-soon statistics for the user's dashboard.
        """
        supabase = get_supabase_client()
        user_id = current_user["id"]
        is_admin = current_user.get("role") == "admin"

        res = supabase.table("tasks").select("*").execute()
        all_tasks = res.data or []

        # Scope strictly to tasks the current user created or was assigned to
        user_tasks = [
            t for t in all_tasks
            if str(t.get("creator_id")) == user_id or str(t.get("assignee_id")) == user_id
        ]

        now = datetime.now(timezone.utc)
        total = len(user_tasks)
        completed = 0
        in_progress = 0
        todo = 0
        overdue = 0
        due_soon = 0

        for t in user_tasks:
            status = t.get("status")
            if status == "completed":
                completed += 1
                continue
            elif status == "in_progress":
                in_progress += 1
            else:
                todo += 1

            due_str = t.get("due_date")
            if due_str:
                try:
                    due = datetime.fromisoformat(due_str.replace("Z", "+00:00"))
                    if due < now:
                        overdue += 1
                    elif now <= due <= (now + timedelta(hours=48)):
                        due_soon += 1
                except Exception:
                    pass

        completion_rate = round((completed / total * 100), 1) if total > 0 else 0.0

        return {
            "total_tasks": total,
            "completed": completed,
            "in_progress": in_progress,
            "todo": todo,
            "overdue": overdue,
            "due_soon": due_soon,
            "completion_rate": completion_rate,
        }
