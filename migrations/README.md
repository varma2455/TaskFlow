# TaskFlow Pro — PostgreSQL Database Migrations

This directory contains versioned, idempotent, and production-hardened SQL migrations for the TaskFlow Pro application on Supabase PostgreSQL.

---

## Migration Index & Execution Order

All migrations must be applied in strict ascending numerical order:

| File | Title | Description |
|---|---|---|
| `001_initial_schema.sql` | **Initial Schema Setup** | Creates core tables: `profiles`, `tasks`, `activity_logs`, `notifications`, and `email_outbox` with foreign keys, timestamps, and triggers. |
| `002_security_and_rls.sql` | **Row Level Security (RLS)** | Enables Row Level Security across all tables, ensuring strict multi-user tenant isolation. |
| `003_realtime_and_indexes.sql` | **Realtime & Query Indexes** | Enables the `supabase_realtime` publication for WebSocket subscriptions and creates essential indexes. |
| `004_task_due_at_and_security_hardening.sql` | **Due Date & Hardening** | Introduces bidirectional `due_date` $\leftrightarrow$ `due_at` synchronization triggers and email outbox constraints. |
| `005_admin_user_roles_and_admin_endpoints.sql` | **Two-Role Architecture** | Restricts roles strictly to `admin` and `user`, prevents self-promotion, and provides `promote_user_to_admin()` function. |
| `006_task_activity_view_and_user_profile_sync.sql` | **Task Activity View** | Creates the `task_activity` SQL view for backwards-compatible activity querying and validates `auth.users(id)` foreign key constraint. |
| `007_complete_database_schema_and_indexes.sql` | **Schema Consolidation & Composite Indexes** | Sets up `schema_migrations` tracking, bidirectional `actor_id` / `recipient_id` / `read_at` sync triggers, and composite query indexes. |
| `008_provision_admin_and_clean_demo_data.sql` | **Purge Demo Members & Authoritative Admin** | Purges demo seed users (`demo.user@taskflow.dev`, etc.) and configures authoritative `admin` role provisioning for `yeswanthvarma684280@gmail.com`. |

---

## How to Apply Migrations

### Option 1: Automated Python CLI Runner (Recommended)

Set your Supabase PostgreSQL connection string in `.env` (or pass via command-line):

```bash
# Obtain from Supabase Dashboard: Project Settings -> Database -> Connection string (URI)
DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
```

Then execute:

```bash
# Check status of pending vs applied migrations
PYTHONPATH=. backend/venv/bin/python scripts/apply_migrations.py --status

# Apply all pending migrations in order
PYTHONPATH=. backend/venv/bin/python scripts/apply_migrations.py

# Run post-migration structural and row-count validation checks
PYTHONPATH=. backend/venv/bin/python scripts/apply_migrations.py --validate
```

---

### Option 2: Supabase Web Dashboard (SQL Editor)

1. Open your Supabase Dashboard: `https://supabase.com/dashboard/project/<your-project-ref>`
2. Navigate to the **SQL Editor** tab on the left sidebar.
3. Open a **New Query**.
4. In numerical order, copy and paste the contents of each file (`001` through `007`) and click **Run**.
5. All migrations are designed to be repeat-safe (`IF NOT EXISTS` / `CREATE OR REPLACE`).

---

### Option 3: Supabase CLI

If using the Supabase CLI locally:

```bash
# Link your local project to Supabase
supabase link --project-ref <your-project-ref>

# Push migrations to the remote database
supabase db push
```

---

## Verification & Integrity Queries

Execute the following queries in the Supabase SQL Editor to verify complete application:

```sql
-- 1. Check applied migrations in tracking table
SELECT version, name, applied_at 
FROM public.schema_migrations 
ORDER BY version ASC;

-- 2. Verify all core tables and record counts
SELECT 'profiles' AS table_name, count(*) AS count FROM public.profiles
UNION ALL
SELECT 'tasks', count(*) FROM public.tasks
UNION ALL
SELECT 'activity_logs', count(*) FROM public.activity_logs
UNION ALL
SELECT 'notifications', count(*) FROM public.notifications
UNION ALL
SELECT 'email_outbox', count(*) FROM public.email_outbox;

-- 3. Verify task_activity view
SELECT count(*) AS activity_count FROM public.task_activity;

-- 4. Verify RLS status on all tables (must all be enabled)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'tasks', 'activity_logs', 'notifications', 'email_outbox');
```

---

## Initial Administrator Provisioning

New Google OAuth accounts automatically receive the `user` role to prevent unauthorized administrative escalation.

To designate the first administrator account, use either:

### Method A: Server-Side CLI
```bash
PYTHONPATH=. backend/venv/bin/python scripts/promote_admin.py --email admin@example.com
```

### Method B: Supabase SQL Editor
```sql
SELECT public.promote_user_to_admin('admin@example.com');
```
