-- =============================================================================
-- Migration 002: Security, Authorization and Row Level Security (RLS)
-- Enables strict RLS policies on all tables
-- =============================================================================

-- Enable Row Level Security (RLS) on all core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 1. PROFILES POLICIES
-- -----------------------------------------------------------------------------
-- Authenticated users can view all team member profiles (for assignee dropdown & avatars)
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- Users can only update their own profile information and preferences
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- 2. TASKS POLICIES
-- -----------------------------------------------------------------------------
-- Users can view tasks if they are the creator, assignee, or have an admin role
DROP POLICY IF EXISTS "Users can view assigned or created tasks" ON public.tasks;
CREATE POLICY "Users can view assigned or created tasks"
    ON public.tasks FOR SELECT
    TO authenticated
    USING (
        creator_id = auth.uid()
        OR assignee_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
        )
    );

-- Users can create tasks only if they set creator_id to their own auth.uid()
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
CREATE POLICY "Users can create tasks"
    ON public.tasks FOR INSERT
    TO authenticated
    WITH CHECK (creator_id = auth.uid());

-- Users can update tasks if they are creator, assignee, or admin
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
CREATE POLICY "Users can update tasks"
    ON public.tasks FOR UPDATE
    TO authenticated
    USING (
        creator_id = auth.uid()
        OR assignee_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        creator_id = auth.uid()
        OR assignee_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
        )
    );

-- Only task creator or admin can delete tasks
DROP POLICY IF EXISTS "Creators or admins can delete tasks" ON public.tasks;
CREATE POLICY "Creators or admins can delete tasks"
    ON public.tasks FOR DELETE
    TO authenticated
    USING (
        creator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- -----------------------------------------------------------------------------
-- 3. ACTIVITY LOGS POLICIES
-- -----------------------------------------------------------------------------
-- Users can view activity logs for tasks they have access to
DROP POLICY IF EXISTS "Users can view activity logs for accessible tasks" ON public.activity_logs;
CREATE POLICY "Users can view activity logs for accessible tasks"
    ON public.activity_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = activity_logs.task_id
            AND (tasks.creator_id = auth.uid() OR tasks.assignee_id = auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
        )
    );

-- Authenticated users can insert activity logs for their actions
DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON public.activity_logs;
CREATE POLICY "Authenticated users can create activity logs"
    ON public.activity_logs FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 4. NOTIFICATIONS POLICIES
-- -----------------------------------------------------------------------------
-- Users can only view their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can only update their own notifications (e.g. mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 5. EMAIL OUTBOX POLICIES (Service Role only)
-- -----------------------------------------------------------------------------
-- Regular authenticated clients should not directly select or manipulate outbox.
-- Service-role bypasses RLS and handles email dispatch securely.
DROP POLICY IF EXISTS "Service role access for outbox" ON public.email_outbox;
CREATE POLICY "Service role access for outbox"
    ON public.email_outbox
    TO service_role
    USING (true)
    WITH CHECK (true);
