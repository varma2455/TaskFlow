# TaskFlow Technical Interview Preparation Guide
**Hairdrama Tech Full-Stack Internship | Master Defense Guide**

This guide provides student-friendly, technically rigorous explanations of the TaskFlow architecture, design decisions, and real source code implementation. Use this guide to prepare for and confidently defend your project during your Hairdrama Tech interview.

---

## Part 1: Core System Architecture & Explanations

### 1. Why Next.js and TypeScript are used
- **Next.js 14 App Router**: Provides server-side rendering (SSR), static site generation (SSG), optimized image handling, fast client-side navigation, and unified route structure (`src/app`).
- **TypeScript**: Catches type mismatches at compile time rather than runtime. In `src/lib/api.ts`, interfaces (`UserProfile`, `Task`, `ActivityLog`, `DashboardStats`) ensure exact data contracts between frontend UI components and the backend Flask API.

### 2. What Flask does and why it is separate from the frontend
- **Decoupled Architecture**: Separating the frontend (Next.js on Vercel) from the backend (Flask on Render) creates clean architectural boundaries:
  - The frontend focuses on presentation, UI states, optimistic updates, and client-side subscriptions.
  - The Flask backend acts as the authoritative business logic and security gateway: it cryptographically verifies tokens, enforces authorization policies, executes durable email outbox queues, and runs scheduled worker tasks.
  - Independent horizontal scaling: backend workers and API instances scale independently of the static CDN-hosted frontend.

### 3. How Supabase PostgreSQL stores users, tasks, activity, and notifications
- **`public.profiles`**: Mirrors `auth.users` via a PostgreSQL trigger (`handle_new_user()`), storing user metadata, full name, avatar URL, role, and reminder preferences.
- **`public.tasks`**: Stores task records with foreign keys `creator_id` and `assignee_id`, priority, status (`todo`, `in_progress`, `completed`), and timestamps.
- **`public.activity_logs`**: An immutable audit trail table recording every change (`created`, `updated`, `status_changed`, `assigned`) with structured JSONB details.
- **`public.notifications`**: In-app notifications bound to `user_id` with an `is_read` boolean flag.
- **`public.email_outbox`**: Durable queue for transactional email dispatch with idempotency keys.

### 4. How Google OAuth works
1. The user clicks **Sign in with Google** on the frontend (`src/app/login/page.tsx`).
2. Supabase client triggers `supabase.auth.signInWithOAuth({ provider: 'google', ... })`.
3. The user is redirected to Google's consent screen. Upon granting permission, Google redirects back to Supabase's OAuth callback handler with an authorization code.
4. Supabase exchanges the authorization code for a signed JWT access token and refreshes the user session.
5. The Supabase database trigger `on_auth_user_created` creates or updates the user profile record in `public.profiles`.

### 5. How frontend sessions and backend token verification work
- The frontend extracts the Supabase session JWT (`access_token`) and stores it in `localStorage` under `taskflow_auth_token`.
- Every API request dispatched via `ApiClient` (`src/lib/api.ts`) adds the header: `Authorization: Bearer <token>`.
- The Flask `@require_auth` decorator (`backend/services/auth_service.py`):
  1. Parses the header.
  2. Cryptographically validates the JWT against `SUPABASE_JWT_SECRET` using `PyJWT` (verifying expiration and signature).
  3. Extracts the subject claim (`sub`) as the authenticated user's UUID.
  4. Never trusts user IDs submitted in the request body.

### 6. How task permissions are enforced
- In `backend/services/task_service.py`:
  - `get_task_by_id`: Verifies that `current_user['id']` matches `task.creator_id` or `task.assignee_id`, or `current_user['role'] == 'admin'`. Unauthorized requests receive `HTTP 403 Forbidden`.
  - `update_task`: Only creator, assignee, or admin can update details or transition status.
  - `delete_task`: **Only the task creator or an administrator** can delete a task. Assignees cannot delete tasks.
- At the database level, Row Level Security (`migrations/002_security_and_rls.sql`) enforces identical constraints.

### 7. How task creation moves through the frontend, API, and database
1. **Frontend**: User fills out the modal form (`src/components/TaskModal.tsx`) and submits.
2. **Client API**: `ApiClient.createTask` sends `POST /api/tasks` with JSON payload and Bearer token.
3. **Backend Route**: `create_task()` in `backend/routes/task_routes.py` validates request structure.
4. **Service Logic**: `TaskService.create_task` (`backend/services/task_service.py`):
   - Validates title and priority (`low`, `medium`, `high`, `urgent`).
   - Verifies assignee existence.
   - Sets `creator_id = request.current_user['id']`.
   - Inserts task record into PostgreSQL `tasks` table.
   - Inserts audit record into `activity_logs`.
   - Dispatches in-app notification and stages transactional email in `email_outbox`.
5. **Response**: Returns HTTP 201 with created task; frontend updates state and triggers Realtime event.

### 8. How task assignment works
- Assignee selection is populated dynamically by querying `GET /api/users`, which returns registered teammates from `public.profiles`.
- When an assignee is specified or changed, `TaskService` checks that `assignee_id` exists.
- An assignment event triggers an in-app notification to the assignee and queues a transactional email alert with task details and direct link.

### 9. How Gmail notifications are authorized and delivered
- Uses official Google API Python Client with OAuth 2.0 refresh token (`backend/services/gmail_service.py`).
- Sender scopes are restricted strictly to `https://www.googleapis.com/auth/gmail.send`.
- Outbox pattern: Every email is first recorded in `email_outbox` with an `idempotency_key`. If sending succeeds, status is updated to `sent`. If Gmail is temporarily unreachable, status is set to `failed`/`pending` for the background worker to retry.

### 10. How Realtime updates work
- Supabase Realtime uses PostgreSQL replication logs (Logical Decoding / WAL).
- `migrations/003_realtime_and_indexes.sql` adds tables to the `supabase_realtime` publication:
  `ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;`
- Frontend components (`src/app/dashboard/page.tsx`, `src/app/tasks/page.tsx`) subscribe to changes:
  ```ts
  supabase.channel('tasks').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, callback).subscribe();
  ```
- Any insert, update, or delete in PostgreSQL broadcasts instantly to all active client sessions via WebSockets.

### 11. How database migrations are applied
- Stored as ordered, numbered SQL files in `migrations/`:
  - `001_initial_schema.sql`: Core tables, check constraints, timestamps, auth trigger.
  - `002_security_and_rls.sql`: RLS enablement and granular policies.
  - `003_realtime_and_indexes.sql`: B-tree composite indexes and Realtime publication.
- Applied using Supabase CLI (`supabase db push`) or the Supabase SQL Editor.

### 12. How API errors are handled
- Consistent JSON error response format:
  ```json
  { "error": "Error Title", "message": "Human readable detail", "code": "ERROR_CODE" }
  ```
- Clean HTTP status codes: `400` (Validation), `401` (Unauthenticated), `403` (Forbidden), `404` (Not Found), `500` (Internal Server Error with suppressed stack traces).

### 13. How the project is deployed
- **Frontend (Vercel)**: Next.js production build (`npm run build`), deployed to Vercel edge network with root directory set to `frontend/`.
- **Backend (Render)**: Python 3 service defined in `render.yaml` running `gunicorn backend.wsgi:app --workers 2 --bind 0.0.0.0:$PORT`.
- **Database (Supabase)**: Managed PostgreSQL with connection pooling, Row Level Security, and Realtime replication.
- **Worker (Render Worker)**: Separate background process running `python -m backend.worker --interval 300` for reminders and retries.

### 14. What security risks were considered
- Token forgery, expired sessions, horizontal privilege escalation (IDOR), SQL injection (prevented by parameterization), XSS (prevented by React JSX auto-escaping), clickjacking (prevented by `X-Frame-Options: DENY`), credential leaks (all secrets isolated to server env vars).

### 15. What happens when Gmail is unavailable
- Transactional email dispatch never blocks or rolls back database operations.
- The email entry is logged in `email_outbox` with `status: pending` or `status: failed`.
- `backend/worker.py` automatically retries pending entries up to `max_retries` (default 3) using exponential backoff.

### 16. How reminder scheduling and duplicate prevention work
- `ReminderService.check_and_send_deadline_reminders` (`backend/services/reminder_service.py`) checks tasks due within 24 hours.
- Duplicate prevention: Uses an idempotency key `f"deadline_reminder_{task_id}_{assignee_id}_{hours_remaining}h"` and records `reminder_sent_at` on the task. Subsequent runs within the window skip already alerted tasks.
- Respects `profiles.reminder_preference`: If a user opts out, reminders are skipped.
- Completed tasks (`status == 'completed'`) are strictly excluded.

### 17. Most important database relationships
- `profiles.id` (1) &mdash; (M) `tasks.creator_id`
- `profiles.id` (1) &mdash; (M) `tasks.assignee_id`
- `tasks.id` (1) &mdash; (M) `activity_logs.task_id`
- `tasks.id` (1) &mdash; (M) `notifications.task_id`
- `tasks.id` (1) &mdash; (M) `email_outbox.task_id`

### 18. Why decoupled architecture over monolithic
- Decoupling Next.js and Flask allows leveraging the best tools for their respective tasks: Next.js excels at client rendering, fast responsive interfaces, and static optimization; Python/Flask excels at backend processing, Google API SDK integrations, background workers, and clean RESTful design.

---

## Part 2: 25 High-Frequency Technical Interview Questions & Answers

### 1. What happens when an unauthenticated user sends a request to `/api/tasks`?
**Answer**: The `@require_auth` decorator in `backend/services/auth_service.py` intercepts the request. Because the `Authorization` header is missing, it raises a `PermissionError` and immediately halts execution, returning an `HTTP 401 Unauthorized` response with code `AUTH_REQUIRED`.

### 2. Why don't we accept `creator_id` from the request body when creating a task?
**Answer**: Accepting user IDs from client payloads enables identity spoofing (Horizontal Privilege Escalation). Instead, we validate the cryptographic JWT signature server-side and extract the authenticated user UUID directly from the verified token claim (`claims['sub']`).

### 3. How does the application prevent duplicate email notifications if an endpoint is called twice?
**Answer**: We implement the Durable Outbox pattern with unique idempotency keys in `public.email_outbox`. For example, a completion email generates an idempotency key `task_completed_{task_id}_{recipient_id}`. If a record with this key exists with status `sent`, `GmailService.send_email_with_outbox` skips re-sending.

### 4. What is Row Level Security (RLS) in PostgreSQL, and how is it used in TaskFlow?
**Answer**: RLS is a database engine security feature that evaluates SQL policies on every query. In `migrations/002_security_and_rls.sql`, policies ensure that even if an attacker connects directly to PostgreSQL, they can only `SELECT` tasks where `creator_id = auth.uid()` or `assignee_id = auth.uid()`.

### 5. Why do we use `ON DELETE CASCADE` for activity logs but `ON DELETE SET NULL` for `assignee_id`?
**Answer**: When a task is deleted, its activity logs have no meaning and should be purged (`CASCADE`). However, if a user profile is deleted or deactivated, we do not want to delete active tasks assigned to them; instead, the task remains with `assignee_id = NULL` (`SET NULL`).

### 6. What is the difference between `PUT` and `PATCH` in our REST API?
**Answer**: In `backend/routes/task_routes.py`, `PUT /api/tasks/<id>` updates multiple attributes of a task resource, while `PATCH /api/tasks/<id>/status` performs a targeted partial mutation specifically on the task's workflow status.

### 7. How does TaskFlow calculate overdue tasks without timezone drift?
**Answer**: All timestamps (`due_date`, `created_at`, `completed_at`) are stored in PostgreSQL using `TIMESTAMPTZ` in UTC (`TIMEZONE('utc', NOW())`). Calculations in Python use `datetime.now(timezone.utc)`. The client browser then converts UTC timestamps into the user's local timezone.

### 8. How does Supabase Realtime broadcast task updates to multiple open browser tabs?
**Answer**: Supabase listens to PostgreSQL's Write-Ahead Log (WAL) via logical replication. When an `UPDATE` or `INSERT` commit occurs on `public.tasks`, the Realtime server broadcasts a WebSocket event to all clients subscribed to `channel('public:tasks-management')`.

### 9. Why is a background worker preferable to spawning in-memory Python threads inside a Flask request?
**Answer**: In production WSGI servers like Gunicorn, worker processes recycle, restart, and scale across multiple nodes. In-memory threads are killed when workers recycle and do not scale across multiple containers. A standalone worker process (`backend/worker.py`) or cron job ensures scheduled tasks run reliably regardless of web request lifecycles.

### 10. What HTTP status code is returned if an assignee tries to delete a task they didn't create?
**Answer**: `HTTP 403 Forbidden`. In `backend/services/task_service.py`, `delete_task` verifies that `current_user['id'] == task['creator_id']` or `role == 'admin'`. Because an assignee is not the creator, permission is denied.

### 11. How does the frontend handle token persistence across page refreshes?
**Answer**: `AuthContext.tsx` stores the access token in `localStorage`. On page load, `useEffect` reads the token, validates the session against Supabase or the backend `/api/auth/profile`, and restores state without requiring the user to log in again.

### 12. How does the application handle a temporary Gmail API network timeout?
**Answer**: The database transaction finishes and records the email in `email_outbox` with status `failed` and records the error string in `last_error`. The background worker (`backend/worker.py`) inspects the outbox and retries delivery during its next cycle.

### 13. What is the role of `gunicorn` in our Render deployment?
**Answer**: Flask's built-in development server is single-threaded and not suitable for production. Gunicorn is a production WSGI HTTP server that manages a master process and multiple worker processes (`gunicorn backend.wsgi:app --workers 2`), handling concurrent requests, process health, and socket binding.

### 14. What are B-tree indexes, and which ones did you create?
**Answer**: B-tree indexes provide $O(\log n)$ search efficiency for database queries. In `migrations/003_realtime_and_indexes.sql`, we added indexes on `tasks(creator_id)`, `tasks(assignee_id)`, `tasks(status)`, `tasks(due_date)`, and a composite index on `(assignee_id, status, due_date)`.

### 15. How does TaskFlow prevent Cross-Site Scripting (XSS) in task descriptions?
**Answer**: React JSX automatically escapes strings before rendering them to the DOM. We do not use `dangerouslySetInnerHTML`, ensuring malicious script tags in task titles or descriptions are treated purely as harmless text.

### 16. What is CORS and how is it configured in the backend?
**Answer**: Cross-Origin Resource Sharing is a browser security mechanism that restricts cross-origin HTTP requests. In `backend/app.py`, `flask_cors.CORS` restricts access specifically to `Config.CORS_ORIGINS` (our deployed Vercel domain and local development ports), blocking unauthorized domains.

### 17. How does Next.js App Router organize pages and layouts?
**Answer**: In Next.js App Router (`src/app/`), directories define route segments. `layout.tsx` wraps all child pages with shared UI (providers, navbar), and `page.tsx` defines the leaf component rendered at that path (e.g., `src/app/dashboard/page.tsx` renders at `/dashboard`).

### 18. What is the purpose of the `email_outbox` table instead of sending emails synchronously?
**Answer**: Synchronous third-party API calls add latency to web requests and can fail, causing failed HTTP responses even if the database write succeeded. The outbox pattern decouples the database transaction from external email delivery, ensuring atomicity and durability.

### 19. How do you test Flask endpoints without deploying or connecting to external services?
**Answer**: We use `pytest` with a memory-backed mock store in `backend/services/supabase_client.py` and mock Gmail client. Tests in `backend/tests/` run in under 0.2 seconds and verify business logic, authorization, and error responses deterministically.

### 20. Why does the application include a "Demo Login" feature alongside Google OAuth?
**Answer**: Google OAuth in development mode is restricted to explicitly whitelisted test accounts until the app is verified by Google. Providing one-click demo profiles (Admin and Member) allows interviewers and evaluators to test all features immediately without requiring Google Cloud consent approval.

### 21. How does the application verify that a task assignee is a valid user?
**Answer**: In `TaskService.create_task`, before inserting the task, the backend queries `profiles` for `assignee_id`. If no profile exists with that UUID, it raises a `ValueError("Assignee with ID ... does not exist")`, returning an `HTTP 400 Bad Request`.

### 22. What happens when a completed task is moved back to "In Progress"?
**Answer**: In `TaskService.update_task`, the backend clears `completed_at = None`, updates `status = 'in_progress'`, and inserts an audit record into `activity_logs` documenting that the status moved from `completed -> in_progress`.

### 23. What headers are added by our security middleware in Flask?
**Answer**: In `backend/app.py`, `after_request` sets:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### 24. What is the difference between client-side validation and server-side validation?
**Answer**: Client-side validation in `TaskModal.tsx` provides immediate user feedback (e.g. preventing empty submissions). Server-side validation in `TaskService` is mandatory for security, as malicious clients can bypass browser UI controls and call the API directly using cURL or Postman.

### 25. If the hiring team asks: "What was the most challenging technical bug you encountered in Part 2 and how did you resolve it?", what is the answer?
**Answer**: During production Next.js builds on the Linux machine, `next build` crashed with a `Bus error` (`SIGBUS`). By inspecting process exit signals and diagnosing binary dependencies, we discovered that an initial network interruption had left `@next/swc-linux-x64-gnu` truncated at 792KB instead of its full 131MB size, causing an mmap memory bus fault. Reinstalling the complete native SWC binary resolved the issue, enabling 100% successful static page compilation.
