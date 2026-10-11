import argparse
import logging
import time
from datetime import datetime, timezone
from backend.config import Config
from backend.services.reminder_service import ReminderService
from backend.services.supabase_client import get_supabase_client
from backend.services.gmail_service import GmailService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [WORKER] [%(levelname)s]: %(message)s"
)
logger = logging.getLogger("worker")

def process_email_outbox_retries():
    """
    Retries pending and retryable failed emails from the durable outbox table.
    """
    supabase = get_supabase_client()
    try:
        # Fetch pending or retryable emails
        res = (
            supabase.table("email_outbox")
            .select("*")
            .in_("status", ["pending", "failed"])
            .execute()
        )
        emails = res.data or []
        retryable = [
            e for e in emails
            if e.get("retry_count", 0) < e.get("max_retries", Config.MAX_EMAIL_RETRIES)
        ]

        if not retryable:
            return 0

        logger.info("Found %d pending/retryable email(s) in outbox.", len(retryable))
        retried_count = 0

        for item in retryable:
            outbox_id = item["id"]
            retried_count += 1
            logger.info("Processing outbox entry %s (event: %s, attempt: %d)",
                        outbox_id, item.get("event_type"), item.get("retry_count", 0) + 1)

            # Re-attempt delivery via Gmail API
            service = GmailService._get_gmail_client()
            if not service:
                logger.warning("Gmail API still unconfigured. Keeping outbox entry %s in queue.", outbox_id)
                continue

            try:
                import base64
                from email.mime.multipart import MIMEMultipart
                from email.mime.text import MIMEText

                message = MIMEMultipart("alternative")
                sender = Config.GMAIL_SENDER_EMAIL or "TaskFlow Notifications <notifications@taskflow.dev>"
                message["From"] = sender
                message["To"] = item["recipient_email"]
                message["Subject"] = item["subject"]
                message.attach(MIMEText(item.get("text_body") or "", "plain"))
                message.attach(MIMEText(item.get("html_body") or "", "html"))

                raw_msg = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
                resp = service.users().messages().send(userId="me", body={"raw": raw_msg}).execute()

                supabase.table("email_outbox").update({
                    "status": "sent",
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                    "last_error": None
                }).eq("id", outbox_id).execute()
                logger.info("Outbox entry %s delivered successfully. MsgId: %s", outbox_id, resp.get("id"))
            except Exception as e:
                err_msg = str(e)
                new_retry = item.get("retry_count", 0) + 1
                new_status = "failed" if new_retry >= item.get("max_retries", Config.MAX_EMAIL_RETRIES) else "pending"
                supabase.table("email_outbox").update({
                    "status": new_status,
                    "retry_count": new_retry,
                    "last_error": err_msg
                }).eq("id", outbox_id).execute()
                logger.error("Outbox entry %s delivery attempt failed: %s", outbox_id, err_msg)

        return retried_count
    except Exception as e:
        logger.error("Error during outbox retry processing: %s", e)
        return 0

def run_worker_cycle():
    """
    Executes a single pass of reminder scanning and outbox retry.
    """
    logger.info("Starting worker cycle...")
    # 1. Deadline reminders
    reminder_res = ReminderService.check_and_send_deadline_reminders()
    logger.info("Deadline reminders check complete: %s", reminder_res)

    # 2. Durable outbox retries
    retried = process_email_outbox_retries()
    logger.info("Outbox retry complete. Processed %d entries.", retried)

def main():
    parser = argparse.ArgumentParser(description="TaskFlow Production Background Worker")
    parser.add_argument("--run-once", action="store_true", help="Run a single cycle and exit (for cron jobs)")
    parser.add_argument("--interval", type=int, default=300, help="Sleep interval in seconds between cycles (default 300s = 5m)")
    args = parser.parse_args()

    logger.info("TaskFlow Worker Initialized (Mode: %s)", "Single-Run" if args.run_once else f"Daemon interval={args.interval}s")

    if args.run_once:
        run_worker_cycle()
        logger.info("Single worker cycle finished successfully.")
        return

    # Daemon loop for persistent worker
    while True:
        try:
            run_worker_cycle()
        except Exception as e:
            logger.error("Unexpected worker loop exception: %s", e)

        logger.info("Worker sleeping for %d seconds...", args.interval)
        time.sleep(args.interval)

if __name__ == "__main__":
    main()
