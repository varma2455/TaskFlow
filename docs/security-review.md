# TaskFlow Pro — Comprehensive Application Security Review

## 1. Executive Summary & Architecture Overview

TaskFlow Pro is a production-oriented SaaS task management platform built for a software development recruitment assignment. The platform adheres to strict enterprise software security standards and defense-in-depth principles across its decoupled architecture:

- **Frontend Tier:** Next.js 14 App Router, TypeScript (Strict Mode), Tailwind CSS, TanStack Query.
- **Backend API Tier:** Python Flask REST API, Gunicorn WSGI server on Render.
- **Identity & Authentication Tier:** Supabase Auth with Google OAuth 2.0 utilizing Proof Key for Code Exchange (PKCE).
- **Persistence Tier:** Supabase PostgreSQL with versioned SQL migrations and PostgreSQL Row Level Security (RLS).
- **Transactional Notifications Tier:** Google Gmail API with OAuth 2.0 authorization, minimal `gmail.send` scope, and a durable transactional outbox pattern.

```
+-----------------------------------------------------------------------------------+
|                                 FRONTEND TIER                                     |
| Next.js App Router (Vercel)                                                       |
| - PKCE Code Exchange (/auth/callback)                                             |
| - Authoritative Role Redirection (/admin vs /dashboard)                           |
| - TanStack Query Cache Flushing on Sign-Out                                       |
+--------------------------+--------------------------------------------------------+
                           | Authorization: Bearer <JWT>
                           v
+-----------------------------------------------------------------------------------+
|                                 BACKEND API TIER                                  |
| Python Flask REST API (Render / Gunicorn)                                         |
| - Security Headers Middleware (nosniff, X-Frame-Options: DENY, HSTS)              |
| - CORS Origin Whitelist (Restricted to Configured Frontend Origins)                |
| - @require_auth: Verifies JWT Signature, Expiry, Issuer, Aud                      |
| - @require_role('admin'): Authoritative Role Read from DB (Never Client Tokens)  |
| - User Route Data Isolation: creator_id = user.id OR assignee_id = user.id        |
+--------------------------+--------------------------------------------------------+
                           | Service Role or User Scoped Connection
                           v
+-----------------------------------------------------------------------------------+
|                                PERSISTENCE TIER                                   |
| Supabase PostgreSQL Database                                                      |
| - Row Level Security (RLS) on profiles, tasks, activity_logs, email_outbox        |
| - Foreign Key Constraints with ON DELETE CASCADE / RESTRICT                       |
| - Versioned Migrations (/migrations 001 - 005)                                    |
+-----------------------------------------------------------------------------------+
```

---

## 2. Authentication Architecture

### 2.1 Google OAuth 2.0 with PKCE
- **Flow Standard:** The application implements RFC 7636 (Proof Key for Code Exchange) via Supabase Auth, preventing authorization code interception attacks on public clients.
- **Account Selection Prompt:** Sign-in requests explicitly provide `queryParams: { prompt: 'select_account' }`, ensuring that multi-account Google users can switch between accounts without being automatically bound to default browser sessions.
- **Strict Callback Routing:**
  - The OAuth authorization code is returned exclusively to `/auth/callback`.
  - Next.js server/client component exchanges the code via `supabase.auth.exchangeCodeForSession(code)`.
  - Prevents open-redirect attacks by asserting that post-authentication redirect targets are strictly relative paths or permitted workspace destinations (`/admin`, `/dashboard`).

### 2.2 Session Management & Cache Hygiene
- **Storage:** Verified Supabase session tokens are held in client storage and forwarded via standard `Authorization: Bearer <token>` HTTP headers.
- **Cache Invalidation on Logout:** Calling `signOut()` performs dual-action cache clearing:
  1. Revokes the Supabase Auth session.
  2. Discards stored tokens.
  3. Flushes the TanStack Query client cache (`clearQueryCache()`), preventing stale authenticated responses or profile data from leaking if another user signs in on the same browser device.

---

## 3. Authorization & Dual-Layer Role-Based Access Control (RBAC)

### 3.1 Authoritative Database Roles
Client-side identity tokens can be decoded, but user roles (`admin` vs `user`) are **never** trusted from client payload parameters.

- The application maintains a canonical `role` column in the PostgreSQL `profiles` table:
  ```sql
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user'))
  ```
- Backend decorators (`@require_auth`, `@require_role('admin')`) in `backend/services/auth_service.py` authenticate the JWT, resolve the user's UUID, and query `profiles` to confirm role permissions before executing sensitive endpoints.

### 3.2 Endpoint Protection Breakdown

| Endpoint Group | Route Prefix | Required Role | Authorization Logic |
| :--- | :--- | :--- | :--- |
| **Public Status** | `GET /api/setup/status` | Public / None | Returns operational flags without disclosing keys or secrets. |
| **Current User** | `GET /api/me` | Authenticated | Decodes JWT, returns caller's verified profile. |
| **User Tasks** | `/api/tasks/*` | Authenticated | Queries scoped to `creator_id == caller.id` OR `assignee_id == caller.id`. |
| **User Dashboard** | `/api/dashboard/stats` | Authenticated | Aggregates KPIs only for caller's assigned/created tasks. |
| **Admin Stats** | `GET /api/admin/stats` | `admin` | Aggregates system-wide task counts, completion rates, member stats. |
| **Admin Users** | `GET /api/admin/users` | `admin` | Lists all profiles across the organization. |
| **Admin Role Update** | `PATCH /api/admin/users/<id>/role` | `admin` | Modifies user role with safety checks preventing orphan admin state. |
| **Admin Tasks** | `GET /api/admin/tasks` | `admin` | Full visibility into system-wide tasks with search and filtering. |
| **Admin Activity** | `GET /api/admin/activity` | `admin` | Full organization audit log with actor attribution. |
| **Admin Notifications**| `GET /api/admin/notifications` | `admin` | Full transactional email outbox records and delivery status. |

---

## 4. User Data Isolation & Row Level Security (RLS)

### 4.1 Backend Service Isolation
When a standard user queries tasks via `GET /api/tasks`, `backend/services/task_service.py` enforces isolation programmatically:
```python
# Isolated User Task Query
query = supabase.table("tasks").select("*, creator:profiles!creator_id(*), assignee:profiles!assignee_id(*)")
if current_user.role != "admin":
    # Restrict to caller's own created or assigned tasks
    query = query.or_(f"creator_id.eq.{current_user.id},assignee_id.eq.{current_user.id}")
```
Even if a standard user accesses the API directly using `curl` or Postman with their JWT, they receive zero data for tasks belonging to other users.

### 4.2 Database Row Level Security Policies
In PostgreSQL, RLS policies defined in `/migrations/002_security_and_rls.sql` and `/migrations/005_admin_user_roles_and_admin_endpoints.sql` enforce database-level isolation:
```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Select Policy: Users read own tasks; Admins read all
CREATE POLICY "tasks_select_policy" ON tasks
  FOR SELECT USING (
    auth.uid() = creator_id
    OR auth.uid() = assignee_id
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Update Policy: Creators, assignees, or admins can update
CREATE POLICY "tasks_update_policy" ON tasks
  FOR UPDATE USING (
    auth.uid() = creator_id
    OR auth.uid() = assignee_id
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Delete Policy: Task creators or admins only
CREATE POLICY "tasks_delete_policy" ON tasks
  FOR DELETE USING (
    auth.uid() = creator_id
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );
```

---

## 5. Secrets Management & Zero-Leak Guarantee

### 5.1 Environment Variable Segregation
Environment variables are strictly partitioned between frontend and backend deployments:

1. **Frontend (Vercel) Client-Side Variables:**
   - `NEXT_PUBLIC_SUPABASE_URL`: Public Supabase API Gateway URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Safe public anonymous JWT key with RLS enforcement.
   - `NEXT_PUBLIC_API_URL`: Backend URL for REST endpoints.
   - *No secret keys or service role tokens are ever included in the frontend build.*

2. **Backend (Render) Server-Side Variables:**
   - `SUPABASE_SERVICE_ROLE_KEY`: Privileged backend key used solely for authoritative lookups and background workers.
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: OAuth client credentials.
   - `GMAIL_SENDER_EMAIL` / `GMAIL_REFRESH_TOKEN`: Gmail OAuth refresh credentials.
   - `SECRET_KEY`: Flask session secret key.

### 5.2 Zero-Leak Setup Diagnostics Endpoint
The `/api/setup/status` endpoint exposes system readiness flags (`true` / `false`) and configuration summaries for evaluators without returning sensitive values:
- `client_id_configured`: Boolean flag.
- `client_secret_configured`: Boolean flag (value never serialized).
- `refresh_token_present`: Boolean flag (value never serialized).
- `supabase_auth_configured`: Boolean flag (service key never serialized).

---

## 6. Cross-Origin Resource Sharing (CORS) & Transport Security

### 6.1 CORS Whitelisting
Cross-Origin Resource Sharing is restricted in `backend/app.py` via `flask-cors`:
- Allowed origins are read strictly from `Config.CORS_ORIGINS` (defaulting to the verified frontend URL).
- Wildcard `*` origins are strictly prohibited.
- `allow_headers` restricts inputs to `Content-Type`, `Authorization`, `X-CRON-KEY`, and `Accept`.

### 6.2 HTTP Security Headers
Every HTTP response from the Flask API is enriched with defense headers:
- `X-Content-Type-Options: nosniff`: Prevents MIME-sniffing exploits.
- `X-Frame-Options: DENY`: Prevents UI redressing and clickjacking.
- `X-XSS-Protection: 1; mode=block`: Mitigates cross-site scripting in legacy browsers.
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`: Forces encrypted HTTPS connections.

---

## 7. Transactional Email Security (Gmail API)

### 7.1 Minimal OAuth Scopes
The Gmail API integration requests only the specific scope required for sending notifications:
- Requested Scope: `https://www.googleapis.com/auth/gmail.send`
- Unrequested Scopes: `gmail.readonly`, `gmail.modify`, `gmail.compose` are omitted to enforce the principle of least privilege.

### 7.2 Durable Outbox Pattern & Idempotency
- Every transactional notification is assigned a unique `idempotency_key` prior to delivery.
- If a delivery attempt fails due to transient network failure or API throttling:
  - The failure is logged in `email_outbox` with status `pending` or `failed`.
  - The background worker executes retries with exponential backoff up to `MAX_EMAIL_RETRIES` (3).
  - Subsequent requests with an identical `idempotency_key` return existing records, preventing duplicate email dispatch to end users.

---

## 8. Deployment Hardening Checklist

| Verification Check | Target Component | Status | Verification Detail |
| :--- | :--- | :--- | :--- |
| **PKCE OAuth Exchange** | Supabase Auth + Next.js | PASS | `prompt: select_account` & SSR callback handler active. |
| **Authoritative RBAC** | Flask `@require_role('admin')` | PASS | Roles validated against DB `profiles` table on each request. |
| **User Data Isolation** | Flask `task_service` | PASS | Non-admin queries filtered to user's own tasks. |
| **PostgreSQL RLS** | Supabase Database | PASS | RLS enabled on all core tables in `/migrations`. |
| **Public Secret Scrubbing** | Next.js Bundle | PASS | Zero service-role or client secret keys in client bundle. |
| **CORS Origins** | Flask Backend | PASS | Whitelisted to authorized frontend domains. |
| **Security Headers** | Flask Backend | PASS | nosniff, DENY frame options, and HSTS applied globally. |
| **Outbox Idempotency** | Gmail Service | PASS | Idempotent message deduplication active. |
| **Admin Promotion CLI** | Repository Tooling | PASS | Secure script `scripts/promote_admin.py` for administrator bootstrap. |

---

*Document compiled and verified for the TaskFlow Pro Software Development Recruitment Assignment.*
