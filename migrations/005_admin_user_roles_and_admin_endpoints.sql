-- =============================================================================
-- Migration 005: Strict Two-Role Architecture (admin & user) + Security Hardening
-- Enforces:
-- 1. Allowed roles strictly restricted to 'admin' and 'user'.
-- 2. New accounts strictly default to 'user'.
-- 3. Regular users cannot self-promote to 'admin'.
-- 4. Initial administrator provisioning procedure.
-- 5. Hardened RLS policies for role preservation and task isolation.
-- =============================================================================

-- 1. Migrate legacy role values in profiles to 'user'
UPDATE public.profiles
SET role = 'user'
WHERE role NOT IN ('admin', 'user');

-- 2. Update role constraint and column default on public.profiles
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';

DO $$
BEGIN
    -- Drop existing role checks if present
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_profiles_role;
    -- Apply strict two-role check
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'user'));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 3. Hardened Trigger: Automatically assign 'user' role to new Google accounts and preserve existing roles on update
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
            'TaskFlow User'
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            NEW.raw_user_meta_data->>'picture',
            ''
        ),
        'user', -- Strictly default new accounts to 'user'
        TRUE
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        -- PRESERVE EXISTING ROLE: Never overwrite assigned role on login/sync
        role = public.profiles.role,
        updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-bind trigger to auth.users if auth schema exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT OR UPDATE ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- 4. Hardened Profiles RLS Policy: Prevent self-promotion
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
    WITH CHECK (
        auth.uid() = id
        -- Regular users cannot alter their role column during profile updates
        AND (
            role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
            OR EXISTS (
                SELECT 1 FROM public.profiles p_admin
                WHERE p_admin.id = auth.uid() AND p_admin.role = 'admin'
            )
        )
    );

-- 5. Hardened Tasks RLS Policy: Strict Creator/Assignee Isolation for Users; Administrative Oversight for Admins
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
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
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
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        -- Enforce creator_id immutability
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

-- 6. Helper Function for Database Administrator Provisioning
-- Usage: SELECT public.promote_user_to_admin('target-user-email@domain.com');
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(target_email TEXT)
RETURNS TEXT AS $$
DECLARE
    found_id UUID;
BEGIN
    SELECT id INTO found_id FROM public.profiles WHERE LOWER(email) = LOWER(target_email);
    IF found_id IS NULL THEN
        RAISE EXCEPTION 'User profile with email % not found', target_email;
    END IF;

    UPDATE public.profiles SET role = 'admin', updated_at = TIMEZONE('utc', NOW()) WHERE id = found_id;
    RETURN format('User %s (%s) successfully promoted to admin.', target_email, found_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
