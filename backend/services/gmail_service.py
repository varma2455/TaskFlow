import base64
import email
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
from datetime import datetime, timezone
from backend.config import Config
from backend.services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.send"]

class GmailService:
    @staticmethod
    def _get_gmail_client():
        """
        Builds an authenticated Google Gmail API service resource using refresh token.
        """
        if not (Config.GOOGLE_CLIENT_ID and Config.GOOGLE_CLIENT_SECRET and Config.GMAIL_REFRESH_TOKEN):
            return None

        try:
            from google.oauth2.credentials import Credentials
            from googleapiclient.discovery import build

            creds = Credentials(
                None,
                refresh_token=Config.GMAIL_REFRESH_TOKEN,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=Config.GOOGLE_CLIENT_ID,
                client_secret=Config.GOOGLE_CLIENT_SECRET,
                scopes=GMAIL_SCOPES,
            )
            return build("gmail", "v1", credentials=creds, cache_discovery=False)
        except Exception as e:
            logger.error("Failed to build Gmail API client: %s", e)
            return None

    @classmethod
    def send_email_with_outbox(
        cls,
        recipient_email: str,
        recipient_name: str,
        subject: str,
        html_body: str,
        text_body: str,
        event_type: str,
        task_id: str,
        idempotency_key: str,
    ) -> dict:
        """
        Durable Outbox Pattern:
        1. Checks idempotency_key to prevent duplicate emails for identical event.
        2. Records entry in email_outbox.
        3. Attempts delivery via Gmail API.
        4. Updates outbox record with status 'sent' or 'failed'.
        """
        supabase = get_supabase_client()

        # Step 1: Duplicate Prevention Check
        try:
            existing = (
                supabase.table("email_outbox")
                .select("*")
                .eq("idempotency_key", idempotency_key)
                .execute()
            )
            if existing.data and len(existing.data) > 0:
                record = existing.data[0]
                if record.get("status") == "sent":
                    logger.info("Email with idempotency key '%s' was already sent. Skipping duplicate.", idempotency_key)
                    return {"status": "skipped", "reason": "already_sent", "outbox_id": record.get("id")}
                # If existing is pending or failed, we can reuse this record
                outbox_id = record.get("id")
            else:
                # Step 2: Insert into outbox as pending
                insert_res = (
                    supabase.table("email_outbox")
                    .insert({
                        "recipient_email": recipient_email,
                        "recipient_name": recipient_name,
                        "subject": subject,
                        "html_body": html_body,
                        "text_body": text_body,
                        "event_type": event_type,
                        "task_id": task_id,
                        "idempotency_key": idempotency_key,
                        "status": "pending",
                        "retry_count": 0,
                        "max_retries": Config.MAX_EMAIL_RETRIES,
                    })
                    .execute()
                )
                outbox_id = insert_res.data[0]["id"] if insert_res.data else None
        except Exception as e:
            logger.error("Database error while checking/inserting outbox: %s", e)
            outbox_id = None

        # Step 3: Check Gmail Configuration
        service = cls._get_gmail_client()
        if not service:
            err_msg = "Gmail integration not configured (Missing client credentials or refresh token). Stored in outbox for retry."
            logger.warning(err_msg)
            if outbox_id:
                try:
                    supabase.table("email_outbox").update({
                        "last_error": err_msg,
                        "status": "pending"
                    }).eq("id", outbox_id).execute()
                except Exception:
                    pass
            return {"status": "pending", "reason": "unconfigured_credentials", "outbox_id": outbox_id}

        # Step 4: Dispatch via Gmail API
        try:
            message = MIMEMultipart("alternative")
            sender = Config.GMAIL_SENDER_EMAIL or "TaskFlow Notifications <notifications@taskflow.dev>"
            message["From"] = sender
            message["To"] = f"{recipient_name} <{recipient_email}>" if recipient_name else recipient_email
            message["Subject"] = subject

            message.attach(MIMEText(text_body or "", "plain"))
            message.attach(MIMEText(html_body, "html"))

            raw_msg = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
            response = service.users().messages().send(userId="me", body={"raw": raw_msg}).execute()

            now_iso = datetime.now(timezone.utc).isoformat()
            if outbox_id:
                supabase.table("email_outbox").update({
                    "status": "sent",
                    "sent_at": now_iso,
                    "last_error": None
                }).eq("id", outbox_id).execute()

            logger.info("Email sent successfully to %s for event %s. MsgId: %s", recipient_email, event_type, response.get("id"))
            return {"status": "sent", "message_id": response.get("id"), "outbox_id": outbox_id}

        except Exception as e:
            err_str = str(e)
            logger.error("Failed to deliver email to %s: %s", recipient_email, err_str)
            if outbox_id:
                try:
                    supabase.table("email_outbox").update({
                        "status": "failed",
                        "retry_count": 1,
                        "last_error": err_str
                    }).eq("id", outbox_id).execute()
                except Exception:
                    pass
            return {"status": "failed", "error": err_str, "outbox_id": outbox_id}

    # --------------------------------------------------------------------------
    # Notification Templates
    # --------------------------------------------------------------------------
    @classmethod
    def send_task_assigned_notification(cls, task: dict, assignee: dict, creator: dict):
        """
        Triggered when a task is assigned or created for a teammate.
        """
        task_id = str(task["id"])
        assignee_id = str(assignee["id"])
        assignee_email = assignee.get("email")
        assignee_name = assignee.get("full_name", "Teammate")
        creator_name = creator.get("full_name", "A team member")
        title = task.get("title", "Untitled Task")
        priority = (task.get("priority") or "medium").upper()
        due_date = task.get("due_date", "No deadline set")
        task_url = f"{Config.APP_URL}/tasks?id={task_id}"

        subject = f"[TaskFlow] New Task Assigned: {title}"

        # HTML Template with violet and navy theme
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
            .card {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
            .header {{ background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%); padding: 32px 28px; color: #ffffff; }}
            .header h1 {{ margin: 0 0 6px 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }}
            .content {{ padding: 28px; }}
            .badge {{ display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: 600; border-radius: 6px; background-color: #ede9fe; color: #6d28d9; text-transform: uppercase; }}
            .meta-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            .meta-table td {{ padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }}
            .meta-label {{ color: #64748b; font-weight: 500; width: 120px; }}
            .btn {{ display: inline-block; background-color: #6d28d9; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 16px; text-align: center; }}
            .footer {{ padding: 20px 28px; background-color: #f8fafc; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>New Task Assigned</h1>
              <p style="margin: 0; opacity: 0.9; font-size: 14px;">TaskFlow Collaboration Alert</p>
            </div>
            <div class="content">
              <p>Hi <strong>{assignee_name}</strong>,</p>
              <p><strong>{creator_name}</strong> assigned a new task to you on TaskFlow:</p>
              
              <h2 style="font-size: 18px; color: #0f172a; margin: 16px 0 8px 0;">{title}</h2>
              <p style="color: #475569; font-size: 14px; line-height: 1.5;">{task.get('description') or 'No description provided.'}</p>
              
              <table class="meta-table">
                <tr>
                  <td class="meta-label">Priority</td>
                  <td><span class="badge">{priority}</span></td>
                </tr>
                <tr>
                  <td class="meta-label">Due Date</td>
                  <td><strong>{due_date}</strong></td>
                </tr>
                <tr>
                  <td class="meta-label">Assigned By</td>
                  <td>{creator_name}</td>
                </tr>
              </table>

              <a href="{task_url}" class="btn">View Task in TaskFlow &rarr;</a>
            </div>
            <div class="footer">
              Sent by TaskFlow &bull; Hairdrama Tech Assignment Delivery
            </div>
          </div>
        </body>
        </html>
        """

        text_body = f"""
New Task Assigned: {title}
Assigned to: {assignee_name}
Assigned by: {creator_name}
Priority: {priority}
Due Date: {due_date}

Description:
{task.get('description') or 'No description provided.'}

View task: {task_url}
        """

        idempotency_key = f"task_assigned_{task_id}_{assignee_id}"

        return cls.send_email_with_outbox(
            recipient_email=assignee_email,
            recipient_name=assignee_name,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            event_type="task_assigned",
            task_id=task_id,
            idempotency_key=idempotency_key,
        )

    @classmethod
    def send_task_completed_notification(cls, task: dict, recipient: dict, completed_by: dict):
        """
        Triggered when a task status moves to completed.
        """
        task_id = str(task["id"])
        recipient_id = str(recipient["id"])
        recipient_email = recipient.get("email")
        recipient_name = recipient.get("full_name", "Teammate")
        completer_name = completed_by.get("full_name", "A team member")
        title = task.get("title", "Untitled Task")
        task_url = f"{Config.APP_URL}/tasks?id={task_id}"

        subject = f"[TaskFlow] Task Completed: {title}"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
            .card {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
            .header {{ background: linear-gradient(135deg, #065f46 0%, #059669 100%); padding: 32px 28px; color: #ffffff; }}
            .header h1 {{ margin: 0 0 6px 0; font-size: 22px; font-weight: 700; }}
            .content {{ padding: 28px; }}
            .badge {{ display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: 600; border-radius: 6px; background-color: #d1fae5; color: #065f46; text-transform: uppercase; }}
            .btn {{ display: inline-block; background-color: #059669; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 16px; text-align: center; }}
            .footer {{ padding: 20px 28px; background-color: #f8fafc; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>Task Completed &#10004;</h1>
              <p style="margin: 0; opacity: 0.9; font-size: 14px;">Good job! Another goal achieved.</p>
            </div>
            <div class="content">
              <p>Hi <strong>{recipient_name}</strong>,</p>
              <p><strong>{completer_name}</strong> has marked the following task as <span class="badge">Completed</span>:</p>
              <h2 style="font-size: 18px; color: #0f172a; margin: 16px 0 8px 0;">{title}</h2>
              <a href="{task_url}" class="btn">View Activity Log &rarr;</a>
            </div>
            <div class="footer">
              Sent by TaskFlow &bull; Hairdrama Tech Assignment Delivery
            </div>
          </div>
        </body>
        </html>
        """

        text_body = f"""
Task Completed: {title}
Completed by: {completer_name}
Recipient: {recipient_name}
Status: COMPLETED

View task: {task_url}
        """

        idempotency_key = f"task_completed_{task_id}_{recipient_id}"

        return cls.send_email_with_outbox(
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            event_type="task_completed",
            task_id=task_id,
            idempotency_key=idempotency_key,
        )

    @classmethod
    def send_deadline_reminder_notification(cls, task: dict, assignee: dict, hours_remaining: int):
        """
        Triggered when a task deadline is approaching.
        """
        task_id = str(task["id"])
        assignee_id = str(assignee["id"])
        assignee_email = assignee.get("email")
        assignee_name = assignee.get("full_name", "Teammate")
        title = task.get("title", "Untitled Task")
        due_date = task.get("due_date", "Soon")
        task_url = f"{Config.APP_URL}/tasks?id={task_id}"

        subject = f"[Reminder] Deadline Approaching: {title}"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
            .card {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
            .header {{ background: linear-gradient(135deg, #b45309 0%, #d97706 100%); padding: 32px 28px; color: #ffffff; }}
            .header h1 {{ margin: 0 0 6px 0; font-size: 22px; font-weight: 700; }}
            .content {{ padding: 28px; }}
            .btn {{ display: inline-block; background-color: #d97706; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 16px; text-align: center; }}
            .footer {{ padding: 20px 28px; background-color: #f8fafc; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>Upcoming Deadline Alert</h1>
              <p style="margin: 0; opacity: 0.9; font-size: 14px;">Due within {hours_remaining} hours</p>
            </div>
            <div class="content">
              <p>Hi <strong>{assignee_name}</strong>,</p>
              <p>This is a reminder that the task below is approaching its due date:</p>
              <h2 style="font-size: 18px; color: #0f172a; margin: 16px 0 8px 0;">{title}</h2>
              <p><strong>Due:</strong> {due_date}</p>
              <a href="{task_url}" class="btn">Open Task &rarr;</a>
            </div>
            <div class="footer">
              Sent by TaskFlow &bull; Hairdrama Tech Assignment Delivery
            </div>
          </div>
        </body>
        </html>
        """

        text_body = f"""
Upcoming Deadline Alert: {title}
Assignee: {assignee_name}
Due Date: {due_date} (approx. {hours_remaining} hours remaining)

Open task: {task_url}
        """

        idempotency_key = f"deadline_reminder_{task_id}_{assignee_id}_{hours_remaining}h"

        return cls.send_email_with_outbox(
            recipient_email=assignee_email,
            recipient_name=assignee_name,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            event_type="deadline_reminder",
            task_id=task_id,
            idempotency_key=idempotency_key,
        )
