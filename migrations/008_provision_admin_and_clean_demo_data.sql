-- =============================================================================
-- Migration 008: Remove Demo Members and Provision Authoritative Admin Account
-- 1. Purge disposable demo seed members and their associated records:
--    - Demo Admin (demo.user@taskflow.dev)
--    - Sarah Connor (teammate@taskflow.dev)
--    - Unrelated User (external.user@taskflow.dev)
-- 2. Configure authoritative admin role for designated account: yeswanthvarma684280@gmail.com.
-- 3. Update public.handle_new_user() trigger to automatically grant 'admin' role
--    strictly to yeswanthvarma684280@gmail.com, while defaulting all other accounts to 'user'.
-- 4. Record migration 008 in public.schema_migrations.
-- =============================================================================

-- 1. PURGE DISPOSABLE DEMO MEMBERS AND ASSOCIATED DATA
DO $$
DECLARE
    demo_ids UUID[];
BEGIN
    -- Collect IDs of disposable demo accounts
    SELECT ARRAY_AGG(id) INTO demo_ids
    FROM public.profiles
    WHERE LOWER(email) IN (
        'demo.user@taskflow.dev',
        'teammate@taskflow.dev',
        'external.user@taskflow.dev'
    );

    IF demo_ids IS NOT NULL AND array_length(demo_ids, 1) > 0 THEN
        -- Delete dependent activity logs
        DELETE FROM public.activity_logs
        WHERE user_id = ANY(demo_ids)
           OR (actor_id IS NOT NULL AND actor_id = ANY(demo_ids));

        -- Delete dependent notifications
        DELETE FROM public.notifications
        WHERE user_id = ANY(demo_ids)
           OR (recipient_id IS NOT NULL AND recipient_id = ANY(demo_ids));

        -- Delete tasks associated with demo accounts
        DELETE FROM public.tasks
        WHERE creator_id = ANY(demo_ids)
           OR assignee_id = ANY(demo_ids);

        -- Delete demo profiles
        DELETE FROM public.profiles
        WHERE id = ANY(demo_ids);
    END IF;
END $$;

-- 2. AUTHORITATIVE TRIGGER: Automatically assign 'admin' role to yeswanthvarma684280@gmail.com
-- and default all other new signups to 'user'. Preserve roles on update.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    assigned_role TEXT;
BEGIN
    -- Determine role: only designated admin gets 'admin', all others strictly 'user'
    IF LOWER(COALESCE(NEW.email, '')) = 'yeswanthvarma684280@gmail.com' THEN
        assigned_role := 'admin';
    ELSE
        assigned_role := 'user';
    END IF;

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
        assigned_role,
        TRUE
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        -- If designated admin, ensure admin role is assigned; otherwise preserve existing role
        role = CASE
            WHEN LOWER(EXCLUDED.email) = 'yeswanthvarma684280@gmail.com' THEN 'admin'
            ELSE public.profiles.role
        END,
        updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-bind trigger to auth.users if auth schema is available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT OR UPDATE ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- 3. PROVISION ADMIN ROLE IF ACCOUNT ALREADY EXISTS IN PROFILES
UPDATE public.profiles
SET role = 'admin', updated_at = TIMEZONE('utc', NOW())
WHERE LOWER(email) = 'yeswanthvarma684280@gmail.com';

-- 4. PROVISION FROM AUTH.USERS IF ALREADY REGISTERED IN SUPABASE AUTH
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        INSERT INTO public.profiles (id, email, full_name, avatar_url, role, reminder_preference)
        SELECT
            u.id,
            u.email,
            COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1), 'Admin User'),
            COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture', ''),
            'admin',
            TRUE
        FROM auth.users u
        WHERE LOWER(u.email) = 'yeswanthvarma684280@gmail.com'
        ON CONFLICT (id) DO UPDATE SET
            role = 'admin',
            updated_at = TIMEZONE('utc', NOW());
    END IF;
END $$;

-- 5. RECORD MIGRATION IN SCHEMA_MIGRATIONS
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

INSERT INTO public.schema_migrations (version, name)
VALUES ('008', '008_provision_admin_and_clean_demo_data.sql')
ON CONFLICT (version) DO NOTHING;
