#!/usr/bin/env python3
"""
TaskFlow Pro - Production Supabase PostgreSQL Migration Runner
Applies versioned SQL migrations in strict numerical order under /migrations.
Tracks execution in public.schema_migrations and validates database schema integrity.

Usage:
    python scripts/apply_migrations.py [--status] [--validate] [--database-url <URL>]
"""
import os
import sys
import argparse
import glob
import re
from urllib.parse import urlparse

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    import psycopg2
    from psycopg2 import sql
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False


def sanitize_db_url(url: str) -> str:
    """Mask credentials for safe terminal logging."""
    if not url:
        return ""
    try:
        parsed = urlparse(url)
        netloc = parsed.hostname or ""
        if parsed.port:
            netloc += f":{parsed.port}"
        if parsed.username:
            netloc = f"{parsed.username}:****@{netloc}"
        return f"{parsed.scheme}://{netloc}{parsed.path}"
    except Exception:
        return "[DATABASE_URL provided (masked)]"


def get_migrations_dir() -> str:
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    mig_dir = os.path.join(base_dir, "migrations")
    if not os.path.isdir(mig_dir):
        raise FileNotFoundError(f"Migrations directory not found at: {mig_dir}")
    return mig_dir


def load_migration_files(migrations_dir: str):
    """Load all *.sql files sorted by filename/prefix."""
    pattern = os.path.join(migrations_dir, "*.sql")
    files = sorted(glob.glob(pattern))
    migrations = []
    for filepath in files:
        filename = os.path.basename(filepath)
        # Extract version prefix (e.g., '001', '002')
        match = re.match(r"^(\d+)_", filename)
        version = match.group(1) if match else filename.split(".")[0]
        migrations.append({
            "version": version,
            "filename": filename,
            "filepath": filepath,
        })
    return migrations


def ensure_migrations_table(cursor):
    """Ensure the schema_migrations tracking table exists."""
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS public.schema_migrations (
            version TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
        );
    """)


def get_applied_migrations(cursor) -> set:
    """Return set of applied migration versions."""
    cursor.execute("SELECT version FROM public.schema_migrations;")
    rows = cursor.fetchall()
    return {row[0] for row in rows}


def run_validations(cursor):
    """Run table count and structural integrity validations."""
    print("\n" + "=" * 60)
    print("  RUNNING POST-MIGRATION INTEGRITY CHECKS")
    print("=" * 60)

    tables = ["profiles", "tasks", "activity_logs", "notifications", "email_outbox", "schema_migrations"]
    for t in tables:
        try:
            cursor.execute(sql.SQL("SELECT count(*) FROM public.{}").format(sql.Identifier(t)))
            count = cursor.fetchone()[0]
            print(f"  [PASS] Table 'public.{t}': EXISTS ({count} records)")
        except Exception as e:
            print(f"  [FAIL] Table 'public.{t}': ERROR ({e})")

    # Check View
    try:
        cursor.execute("SELECT count(*) FROM public.task_activity;")
        v_count = cursor.fetchone()[0]
        print(f"  [PASS] View 'public.task_activity': EXISTS ({v_count} records)")
    except Exception as e:
        print(f"  [INFO] View 'public.task_activity': {e}")

    # Check Constraints
    try:
        cursor.execute("""
            SELECT conname, pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE n.nspname = 'public' AND conname LIKE '%check%';
        """)
        constraints = cursor.fetchall()
        print(f"  [INFO] Active CHECK constraints verified: {len(constraints)} rules active.")
    except Exception:
        pass
    print("=" * 60 + "\n")


def apply_migrations(db_url: str, check_only: bool = False, validate_only: bool = False):
    if not PSYCOPG2_AVAILABLE:
        print("[!] ERROR: psycopg2-binary is not installed.")
        print("    Run: pip install psycopg2-binary")
        sys.exit(1)

    mig_dir = get_migrations_dir()
    migrations = load_migration_files(mig_dir)
    print(f"[*] Discovered {len(migrations)} migration script(s) in {mig_dir}")

    safe_url = sanitize_db_url(db_url)
    print(f"[*] Target database: {safe_url}")

    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = False
    except Exception as e:
        print(f"\n[!] ERROR: Failed to connect to PostgreSQL database: {e}")
        print("\n[*] To apply migrations to your Supabase project:")
        print("  1. Copy the connection URI from your Supabase Dashboard:")
        print("     Settings -> Database -> Connection string -> URI (Transaction / Session pooler)")
        print("  2. Set DATABASE_URL in .env or provide via --database-url:")
        print("     DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres")
        print("  3. Alternatively, copy migration files directly into the Supabase SQL Editor.")
        sys.exit(1)

    try:
        with conn.cursor() as cur:
            ensure_migrations_table(cur)
            applied = get_applied_migrations(cur)

            if validate_only:
                run_validations(cur)
                return

            print("\nMigration Execution Status:")
            print("-" * 60)
            pending = []
            for m in migrations:
                is_applied = m["version"] in applied
                status_str = "[APPLIED]" if is_applied else "[PENDING]"
                print(f"  {m['version']:<5} {m['filename']:<45} {status_str}")
                if not is_applied:
                    pending.append(m)
            print("-" * 60)

            if check_only:
                print(f"\nStatus check complete. {len(pending)} pending migration(s).")
                return

            if not pending:
                print("\n[+] Database is up to date! All migrations have already been applied.")
                run_validations(cur)
                return

            print(f"\n[*] Applying {len(pending)} pending migration(s)...")
            for m in pending:
                print(f"  Applying {m['filename']} ...", end=" ", flush=True)
                with open(m["filepath"], "r", encoding="utf-8") as f:
                    sql_content = f.read()

                try:
                    cur.execute(sql_content)
                    cur.execute(
                        "INSERT INTO public.schema_migrations (version, name) VALUES (%s, %s) ON CONFLICT (version) DO NOTHING;",
                        (m["version"], m["filename"])
                    )
                    conn.commit()
                    print("SUCCESS")
                except Exception as err:
                    conn.rollback()
                    print("FAILED")
                    print(f"\n[!] Migration failed in {m['filename']}: {err}")
                    sys.exit(1)

            print("\n[SUCCESS] All pending migrations executed successfully!")
            run_validations(cur)

    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description="TaskFlow Pro Supabase Database Migration Tool")
    parser.add_argument("--database-url", help="PostgreSQL connection URI (overrides DATABASE_URL env var)")
    parser.add_argument("--status", action="store_true", help="Inspect applied vs pending migrations without applying")
    parser.add_argument("--validate", action="store_true", help="Run table structure and row count checks")
    args = parser.parse_args()

    db_url = args.database_url or os.getenv("DATABASE_URL")
    if not db_url:
        print("[!] Note: DATABASE_URL is not set.")
        print("    Usage: python scripts/apply_migrations.py --database-url \"postgresql://...\"")
        print("\nAvailable migrations ready to execute in Supabase SQL Editor:")
        mig_dir = get_migrations_dir()
        for m in load_migration_files(mig_dir):
            print(f"  - {m['filename']}")
        sys.exit(0)

    apply_migrations(db_url, check_only=args.status, validate_only=args.validate)


if __name__ == "__main__":
    main()
