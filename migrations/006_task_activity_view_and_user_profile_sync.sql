-- =============================================================================
-- Migration 006: Task Activity View & Profile Foreign Key Sync
-- Creates task_activity view alias for activity_logs and confirms auth.users foreign key.
-- =============================================================================

-- 1. Create task_activity view for seamless interoperability
CREATE OR REPLACE VIEW public.task_activity AS
SELECT
    id,
    task_id,
    user_id,
    action,
    details,
    created_at
FROM public.activity_logs;

-- 2. Grant permissions on view to authenticated and service_role
GRANT SELECT ON public.task_activity TO authenticated;
GRANT ALL ON public.task_activity TO service_role;

-- 3. Ensure profile reference to auth.users is enforced
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'profiles_id_fkey'
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_id_fkey
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
