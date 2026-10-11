-- =============================================================================
-- Migration 004: Task due_at support, constraints, and multi-user security hardening
-- =============================================================================

-- 1. Ensure due_at column exists on tasks and synchronize with due_date
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'due_at'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN due_at TIMESTAMPTZ;
        -- Backfill due_at from due_date
        UPDATE public.tasks SET due_at = due_date WHERE due_date IS NOT NULL;
    END IF;
END $$;

-- 2. Trigger function to keep due_at and due_date in sync for full compatibility
CREATE OR REPLACE FUNCTION public.sync_task_due_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.due_at IS NOT NULL AND NEW.due_date IS NULL THEN
        NEW.due_date = NEW.due_at;
    ELSIF NEW.due_date IS NOT NULL AND NEW.due_at IS NULL THEN
        NEW.due_at = NEW.due_date;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_task_due_fields ON public.tasks;
CREATE TRIGGER trg_sync_task_due_fields
    BEFORE INSERT OR UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.sync_task_due_fields();

-- 3. Additional Composite Indexes for strict multi-user queries
CREATE INDEX IF NOT EXISTS idx_tasks_creator_due_at ON public.tasks(creator_id, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_due_at ON public.tasks(assignee_id, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_creator_status ON public.tasks(creator_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON public.tasks(assignee_id, status);

-- 4. Hardened RLS Policy for Profiles: Users can view teammates but only update own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 5. Hardened RLS Policy for Tasks: Strict isolation and collaborative assignment
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
CREATE POLICY "Users can create tasks"
    ON public.tasks FOR INSERT
    TO authenticated
    WITH CHECK (creator_id = auth.uid());

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
        -- Enforce that creator_id cannot be changed to another user during update
        creator_id = (SELECT t.creator_id FROM public.tasks t WHERE t.id = tasks.id)
    );

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

-- 6. Hardened RLS Policy for Notifications: Strictly private per user
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 7. Hardened Profile Creation Trigger for Google OAuth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, role, reminder_preference)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1),
            'TaskFlow Member'
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            NEW.raw_user_meta_data->>'picture',
            ''
        ),
        'member',
        TRUE
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-bind trigger to auth.users if auth schema is present
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT OR UPDATE ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;
