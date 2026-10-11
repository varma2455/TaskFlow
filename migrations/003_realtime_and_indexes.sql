-- =============================================================================
-- Migration 003: Indexes, Performance Optimization & Realtime Publication
-- =============================================================================

-- 1. INDEXES FOR TASKS
CREATE INDEX IF NOT EXISTS idx_tasks_creator_id ON public.tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_composite_filter ON public.tasks(assignee_id, status, due_date);

-- 2. INDEXES FOR ACTIVITY LOGS
CREATE INDEX IF NOT EXISTS idx_activity_logs_task_id ON public.activity_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- 3. INDEXES FOR NOTIFICATIONS
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 4. INDEXES FOR EMAIL OUTBOX
CREATE INDEX IF NOT EXISTS idx_email_outbox_status_retries ON public.email_outbox(status, retry_count);
CREATE INDEX IF NOT EXISTS idx_email_outbox_idempotency ON public.email_outbox(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_email_outbox_task_id ON public.email_outbox(task_id);

-- 5. REALTIME REPLICATION PUBLICATION SETUP (Supabase Realtime)
DO $$
BEGIN
    -- Check if supabase_realtime publication exists (default in Supabase projects)
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- Add tasks table to realtime publication
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_rel pr
            JOIN pg_class pc ON pr.prrelid = pc.oid
            JOIN pg_publication p ON pr.prpubid = p.oid
            WHERE p.pubname = 'supabase_realtime' AND pc.relname = 'tasks'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
        END IF;

        -- Add notifications table to realtime publication
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_rel pr
            JOIN pg_class pc ON pr.prrelid = pc.oid
            JOIN pg_publication p ON pr.prpubid = p.oid
            WHERE p.pubname = 'supabase_realtime' AND pc.relname = 'notifications'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
        END IF;
    END IF;
END $$;
