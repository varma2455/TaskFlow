#!/usr/bin/env python3
"""
TaskFlow Pro - Secure Server-Side Administrator Provisioning Script
Usage:
    python scripts/promote_admin.py <user_email_or_uuid>
"""
import sys
import os

# Add root directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.config import Config
from backend.services.supabase_client import get_supabase_client

def promote_admin(identifier: str):
    identifier = identifier.strip().lower()
    if not identifier:
        print("Error: Please provide a valid email or user UUID.")
        sys.exit(1)

    print(f"[*] Looking up user profile for: '{identifier}'...")
    supabase = get_supabase_client()

    # Query by UUID or Email
    res = supabase.table("profiles").select("*").execute()
    profiles = res.data or []

    target = None
    for p in profiles:
        if str(p.get("id")).lower() == identifier or str(p.get("email")).lower() == identifier:
            target = p
            break

    if not target:
        print(f"[!] Error: No profile found for '{identifier}'.")
        print("    Ensure the user has signed in via Google OAuth at least once.")
        sys.exit(1)

    user_id = target["id"]
    email = target.get("email")
    current_role = target.get("role")

    print(f"[+] Found User: {target.get('full_name')} ({email}) [ID: {user_id}]")
    print(f"[*] Current role: {current_role}")

    if current_role == "admin":
        print(f"[*] User '{email}' is already an administrator. No changes made.")
        return

    # Update role to admin
    upd_res = supabase.table("profiles").update({"role": "admin"}).eq("id", user_id).execute()
    if upd_res.data:
        print(f"[SUCCESS] User '{email}' promoted to role 'admin' successfully.")
        # Log to activity audit
        try:
            supabase.table("activity_logs").insert({
                "task_id": None,
                "user_id": user_id,
                "action": "role_promoted_via_cli",
                "details": {"promoted_user": email, "previous_role": current_role, "new_role": "admin"}
            }).execute()
        except Exception:
            pass
    else:
        print("[!] Failed to update profile in database.")
        sys.exit(1)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="TaskFlow Pro - Administrator Provisioning CLI")
    parser.add_argument("identifier", nargs="?", default="", help="User email address or user UUID to promote")
    parser.add_argument("--email", "-e", dest="email_flag", default="", help="User email address to promote")
    args = parser.parse_args()

    target = args.email_flag or args.identifier or "yeswanthvarma684280@gmail.com"
    promote_admin(target)
