-- =============================================================================
-- Migration 007: Complete Database Schema Consolidation, Triggers, & Indexes
-- Authoritative unified schema aligning all table columns, bidirectional
-- synchronization triggers, composite performance indexes, and schema tracking.
-- =============================================================================

-- 1. SCHEMA MIGRATIONS TRACKING TABLE
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Record prior migrations if not present
INSERT INTO public.schema_migrations (version, name) VALUES
    ('001', '001_initial_schema.sql'),
    ('002', '002_security_and_rls.sql'),
    ('003', '003_realtime_and_indexes.sql'),
    ('004', '004_task_due_at_and_security_hardening.sql'),
    ('005', '005_admin_user_roles_and_admin_endpoints.sql'),
    ('006', '006_task_activity_view_and_user_profile_sync.sql'),
    ('007', '007_complete_database_schema_and_indexes.sql')
ON CONFLICT (version) DO NOTHING;

-- 2. TASKS TABLE REFINEMENTS (Status checks & completed_at constraints)
DO $$
BEGIN
    -- Update status check constraint to encompass all modern workflow states
    ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
    ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS check_tasks_status;
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
        CHECK (status IN ('todo', 'in_progress', 'completed', 'blocked', 'canceled'));

    -- Update priority check constraint
    ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
    ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS check_tasks_priority;
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_check 
        CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 3. ACTIVITY LOGS: ACTOR_ID COLUMN & BIDIRECTIONAL SYNC
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_logs' AND column_name = 'actor_id'
    ) THEN
        ALTER TABLE public.activity_logs ADD COLUMN actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
        UPDATE public.activity_logs SET actor_id = user_id WHERE actor_id IS NULL;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_activity_log_actor_user()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.actor_id IS NULL AND NEW.user_id IS NOT NULL THEN
        NEW.actor_id = NEW.user_id;
    ELSIF NEW.user_id IS NULL AND NEW.actor_id IS NOT NULL THEN
        NEW.user_id = NEW.actor_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_activity_log_actor_user ON public.activity_logs;
CREATE TRIGGER trg_sync_activity_log_actor_user
    BEFORE INSERT OR UPDATE ON public.activity_logs
    FOR EACH ROW EXECUTE FUNCTION public.sync_activity_log_actor_user();

-- Recreate task_activity view providing both user_id and actor_id
CREATE OR REPLACE VIEW public.task_activity AS
SELECT
    id,
    task_id,
    COALESCE(actor_id, user_id) AS actor_id,
    COALESCE(user_id, actor_id) AS user_id,
    action,
    details,
    created_at
FROM public.activity_logs;

GRANT SELECT ON public.task_activity TO authenticated;
GRANT ALL ON public.task_activity TO service_role;

-- 4. NOTIFICATIONS: RECIPIENT_ID, READ_AT & SYNC
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'recipient_id'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
        UPDATE public.notifications SET recipient_id = user_id WHERE recipient_id IS NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'read_at'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN read_at TIMESTAMPTZ;
        UPDATE public.notifications SET read_at = created_at WHERE is_read = TRUE AND read_at IS NULL;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_notifications_recipient_read()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync recipient_id and user_id
    IF NEW.recipient_id IS NULL AND NEW.user_id IS NOT NULL THEN
        NEW.recipient_id = NEW.user_id;
    ELSIF NEW.user_id IS NULL AND NEW.recipient_id IS NOT NULL THEN
        NEW.user_id = NEW.recipient_id;
    END IF;

    -- Sync is_read and read_at
    IF NEW.read_at IS NOT NULL THEN
        NEW.is_read = TRUE;
    ELSIF NEW.is_read = TRUE AND NEW.read_at IS NULL THEN
        NEW.read_at = TIMEZONE('utc', NOW());
    ELSIF NEW.is_read = FALSE THEN
        NEW.read_at = NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_notifications_recipient_read ON public.notifications;
CREATE TRIGGER trg_sync_notifications_recipient_read
    BEFORE INSERT OR UPDATE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.sync_notifications_recipient_read();

-- 5. EMAIL OUTBOX: EVENT_KEY, PAYLOAD, ATTEMPT_COUNT & COMPATIBILITY
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_outbox' AND column_name = 'event_key'
    ) THEN
        ALTER TABLE public.email_outbox ADD COLUMN event_key TEXT;
        UPDATE public.email_outbox SET event_key = idempotency_key WHERE event_key IS NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_outbox' AND column_name = 'payload'
    ) THEN
        ALTER TABLE public.email_outbox ADD COLUMN payload JSONB DEFAULT '{}'::jsonb;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_outbox' AND column_name = 'attempt_count'
    ) THEN
        ALTER TABLE public.email_outbox ADD COLUMN attempt_count INT DEFAULT 0;
        UPDATE public.email_outbox SET attempt_count = retry_count WHERE attempt_count = 0;
    END IF;

    -- Update status check constraint
    ALTER TABLE public.email_outbox DROP CONSTRAINT IF EXISTS email_outbox_status_check;
    ALTER TABLE public.email_outbox ADD CONSTRAINT email_outbox_status_check
        CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'simulated'));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

CREATE OR REPLACE FUNCTION public.sync_email_outbox_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync event_key and idempotency_key
    IF NEW.event_key IS NULL AND NEW.idempotency_key IS NOT NULL THEN
        NEW.event_key = NEW.idempotency_key;
    ELSIF NEW.idempotency_key IS NULL AND NEW.event_key IS NOT NULL THEN
        NEW.idempotency_key = NEW.event_key;
    END IF;

    -- Sync attempt_count and retry_count
    IF NEW.attempt_count IS NOT NULL AND NEW.retry_count = 0 THEN
        NEW.retry_count = NEW.attempt_count;
    ELSIF NEW.retry_count IS NOT NULL AND NEW.attempt_count = 0 THEN
        NEW.attempt_count = NEW.retry_count;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_email_outbox_columns ON public.email_outbox;
CREATE TRIGGER trg_sync_email_outbox_columns
    BEFORE INSERT OR UPDATE ON public.email_outbox
    FOR EACH ROW EXECUTE FUNCTION public.sync_email_outbox_columns();

-- 6. COMPREHENSIVE PERFORMANCE & QUERY INDEXES
CREATE INDEX IF NOT EXISTS idx_tasks_creator_id ON public.tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON public.tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON public.tasks(assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_creator_status ON public.tasks(creator_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_status_due_at ON public.tasks(status, due_at);

CREATE INDEX IF NOT EXISTS idx_activity_logs_task_id ON public.activity_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_id ON public.activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON public.notifications(recipient_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_outbox_status_created ON public.email_outbox(status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_email_outbox_event_key ON public.email_outbox(event_key);
