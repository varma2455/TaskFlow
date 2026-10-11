# TaskFlow Security Review & Threat Model Analysis
**Hairdrama Tech Full-Stack Internship Assignment | Part 2: Security & Production Readiness**

---

## 1. Executive Summary

This document details the security architecture, threat model, authorization controls, and defensive mechanisms implemented across the **TaskFlow** platform. 

The application adheres to the principle of least privilege, zero trust for client-supplied identity, server-side cryptographic token validation, database-level Row Level Security (RLS), and durable idempotency for external integrations.

---

## 2. Authentication Architecture

### 2.1 Server-Side Token Verification
- **Mechanism**: Supabase JWT tokens are validated cryptographically on the Flask backend (`backend/services/auth_service.py`) using `PyJWT` with the `HS256` signature algorithm and expiration verification (`verify_exp=True`).
- **Claim Extraction**: The authenticated subject (`sub`) is derived exclusively from validated JWT claims. 
- **Zero Client Trust**: The backend **never** trusts user IDs submitted in request bodies, URL paths, or query parameters for authentication. Client-supplied user IDs are discarded in favor of `request.current_user['id']`.
- **Rejection of Invalid Sessions**:
  - Missing `Authorization` header: `HTTP 401 Unauthorized` (`AUTH_REQUIRED`)
  - Malformed header (not `Bearer <token>`): `HTTP 401 Unauthorized` (`TOKEN_INVALID`)
  - Expired tokens: `HTTP 401 Unauthorized` (`TOKEN_INVALID`)
  - Tampered or corrupted signatures: `HTTP 401 Unauthorized` (`AUTH_FAILED`)

---

## 3. Authorization & Access Control (RBAC & ABAC)

### 3.1 Task Operations
Access control logic is enforced both in the Flask service layer (`backend/services/task_service.py`) and in Supabase Row Level Security (`migrations/002_security_and_rls.sql`):

| Action | Allowed Roles / Entities | Enforcement Mechanism | Failure Response |
| :--- | :--- | :--- | :--- |
| **List Tasks** | Task Creator, Task Assignee, Workspace Admins | Filtered query + post-check | Only authorized tasks returned |
| **View Task Details** | Task Creator, Task Assignee, Workspace Admins | `TaskService.get_task_by_id` | `HTTP 403 Forbidden` |
| **Create Task** | Authenticated User (as Creator) | Creator forced to `auth.uid()` | `HTTP 401` if unauthenticated |
| **Update Task Details** | Task Creator, Task Assignee, Workspace Admins | Permission check on task ownership | `HTTP 403 Forbidden` |
| **Change Status** | Task Creator, Task Assignee, Workspace Admins | State validation (`todo`, `in_progress`, `completed`) | `HTTP 403 Forbidden` |
| **Delete Task** | **Task Creator ONLY** or Workspace Admin | Strict creator/admin check | `HTTP 403 Forbidden` |

### 3.2 Notification Ownership
- Users can only query notifications where `user_id = auth.uid()`.
- Marking a notification as read (`PATCH /api/notifications/<id>/read`) performs explicit database verification that `notification.user_id == current_user.id`. Unauthorized attempts return `HTTP 403 Forbidden`.

---

## 4. Database Security & Row Level Security (RLS)

### 4.1 RLS Policies (`migrations/002_security_and_rls.sql`)
1. **`public.profiles`**:
   - `SELECT`: Authenticated users can view teammate profiles (enabling assignee dropdown and avatars).
   - `UPDATE`: Enforced via `USING (auth.uid() = id) WITH CHECK (auth.uid() = id)`. Users cannot modify other profiles.
2. **`public.tasks`**:
   - `SELECT`: Restricted to `creator_id = auth.uid() OR assignee_id = auth.uid() OR role IN ('admin', 'manager')`.
   - `INSERT`: Enforces `WITH CHECK (creator_id = auth.uid())`.
   - `UPDATE`: Restricted to creator, assignee, or admin.
   - `DELETE`: Restricted to creator or admin.
3. **`public.notifications`**:
   - Strictly isolated by `user_id = auth.uid()`.
4. **`public.email_outbox`**:
   - Restricted exclusively to the `service_role`. Regular web clients have no direct access to email queue tables.

### 4.2 Foreign Keys & Cascading
- `tasks.creator_id` references `profiles.id` with `ON DELETE CASCADE`.
- `tasks.assignee_id` references `profiles.id` with `ON DELETE SET NULL` (preventing orphan task errors if a teammate is deactivated).
- `activity_logs.task_id` and `notifications.task_id` reference `tasks.id` with `ON DELETE CASCADE`.

---

## 5. Gmail Integration & Email Delivery Security

1. **OAuth 2.0 Scopes**:
   - Scoped strictly to `https://www.googleapis.com/auth/gmail.send`. No mailbox read (`gmail.readonly`) or delete scopes are requested or granted.
2. **Durable Outbox Pattern**:
   - Transactional emails are staged in `public.email_outbox` with unique `idempotency_key` values (e.g. `task_assigned_{task_id}_{assignee_id}`).
   - Duplicate prevention prevents repeated email blasts if a request is retried.
3. **No Credential Leakage**:
   - Refresh tokens and client secrets are stored exclusively in backend server environment variables (`GMAIL_REFRESH_TOKEN`, `GOOGLE_CLIENT_SECRET`).
   - Private keys are never prefixed with `NEXT_PUBLIC_` or bundled in client scripts.
4. **Graceful Degradation**:
   - When Gmail credentials are not configured or undergoing OAuth verification, the system logs a safe warning, stages the outbox entry, and does not crash the database transaction.

---

## 6. Frontend & Network Security

1. **Cross-Origin Resource Sharing (CORS)**:
   - Configured via `flask_cors.CORS` in `backend/app.py`.
   - Origin is strictly bound to `Config.CORS_ORIGINS` (deployed Vercel domain and localhost development ports). Wildcard `*` origins are blocked.
2. **HTTP Security Headers**:
   - `X-Content-Type-Options: nosniff` (mitigates MIME-type sniffing).
   - `X-Frame-Options: DENY` (mitigates clickjacking attacks).
   - `X-XSS-Protection: 1; mode=block`.
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (enforces HTTPS).
3. **Input Sanitization & Output Encoding**:
   - Client-side React JSX automatically encodes rendered text strings, preventing reflected and stored XSS from untrusted task titles or descriptions.
   - No `dangerouslySetInnerHTML` is used in task rendering.
4. **Safe Error Handling**:
   - Production 500 error handler in Flask (`backend/app.py`) returns a sanitized generic JSON message (`{"error": "Internal Server Error"}`), suppressing Python stack traces and server internals.

---

## 7. Remaining Considerations & Production Recommendations

1. **API Rate Limiting**:
   - In high-throughput production, attach `Flask-Limiter` with a Redis backend to protect `/api/tasks` and `/api/auth` from distributed denial-of-service (DDoS).
2. **Google OAuth Verification**:
   - While in Google Cloud "Testing" mode, only designated test Google accounts can authenticate. Moving to production requires publishing the OAuth consent screen with Hairdrama Tech’s privacy policy.
3. **Automated Database Backups**:
   - Supabase Point-in-Time Recovery (PITR) should be enabled for production databases.
