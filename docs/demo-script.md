# TaskFlow Video Walkthrough & Demo Script (5–8 Minutes)
**Hairdrama Tech Full-Stack Internship Assignment | Loom Recording Guide**

Use this script to deliver an articulate, structured 5–8 minute video walkthrough for the Hairdrama Tech hiring team.

---

## Recording Checklist Before Starting
- [ ] Backend server running locally on port 5000 (`./backend/venv/bin/gunicorn backend.wsgi:app --bind 0.0.0.0:5000`)
- [ ] Frontend running locally on port 3000 (`npm run dev`)
- [ ] Browser window 1: Normal window on `http://localhost:3000` (logged in as Admin)
- [ ] Browser window 2: Incognito window side-by-side on `http://localhost:3000` (logged in as Member)
- [ ] Terminal window open showing test suite results (`pytest`)
- [ ] Code editor open on key files: `auth_service.py`, `task_service.py`, `migrations/002_security_and_rls.sql`

---

## Detailed Timeline & Script

### 1. Introduction (0:00 – 0:45)
**Screen**: Landing page (`http://localhost:3000`)
**Talking Points**:
> *"Hi everyone, I'm Yeswanth Varma, and today I'm demonstrating **TaskFlow**, my Part 2 submission for the Hairdrama Tech Full-Stack Internship assignment.*
>
> *TaskFlow is a production-grade, collaborative task and deadline management platform built with Next.js and TypeScript on the frontend, a modular Flask REST API on the backend, Supabase PostgreSQL with Row Level Security, and automated transactional Gmail notifications.*
>
> *In this demo, I will walk you through the end-to-end user journey, live Realtime synchronization, durable email outbox delivery, security architecture, and automated test suite."*

---

### 2. Authentication & Dashboard Walkthrough (0:45 – 1:45)
**Screen**: Login page -> Dashboard (`/dashboard`)
**Actions**:
1. Click **Continue with Google** or **Demo Admin Login**.
2. Arrive at the live Dashboard.
**Talking Points**:
> *"Here on the login page, users can authenticate using Google OAuth 2.0 via Supabase. For evaluation and testing, I've also incorporated verified one-click demo profiles.*
>
> *On the dashboard, we see real-time KPI metrics: Total Tasks, In Progress, Completed, Overdue tasks highlighted with an alert badge, and Due Soon tasks within a 48-hour window.*
>
> *Notice that these statistics are dynamic and recalculate based on the user's authorized tasks."*

---

### 3. Task Creation, Assignment & Outbox Notification (1:45 – 3:00)
**Screen**: Dashboard / Tasks Page (`/tasks`) -> Modal Form
**Actions**:
1. Click **+ Create Task**.
2. Enter:
   - **Title**: *"Deploy Production Release v1.0"*
   - **Description**: *"Verify Vercel and Render deployments with health check"*
   - **Priority**: *High*
   - **Assignee**: *Select teammate (Sarah Connor)*
   - **Due Date**: *Set date 2 days in the future*
3. Submit the modal.
**Talking Points**:
> *"Now I'll create a task assigned to my teammate Sarah. When I submit, the request is sent with my verified JWT bearer token to the Flask backend.*
>
> *The backend validates all inputs, ensures the assignee exists in our PostgreSQL profiles table, stores the task, records an audit log entry in `activity_logs`, and stages a transactional notification in our durable `email_outbox`.*
>
> *Our outbox pattern ensures that database transactions succeed first and assigns a unique idempotency key to completely prevent duplicate emails if requests are retried."*

---

### 4. Kanban Workflow, Status Transitions & Activity History (3:00 – 4:15)
**Screen**: Kanban Board (`/tasks`) -> Click Task -> Task Details Modal
**Actions**:
1. Drag or click **Start Task &rarr;** to transition from *To Do* to *In Progress*.
2. Open the task details modal.
3. Click **Mark Completed &#10004;**.
4. Scroll to the **Activity History & Audit Trail** section.
**Talking Points**:
> *"On the Kanban board, tasks can be managed seamlessly. Let's inspect the task details modal.*
>
> *Notice the dynamic status workflow: when we mark the task completed, the backend sets `completed_at` to the current UTC timestamp, logs the change in our audit trail, and queues a completion alert to the creator and assignee.*
>
> *Down here in the Activity History, you can see every single state transition chronologically preserved with user attribution and timestamp."*

---

### 5. Multi-User Realtime Synchronization (4:15 – 5:15)
**Screen**: Side-by-side browser windows (Admin on left, Member on right)
**Actions**:
1. On Window 1 (Admin), update a task's title or status.
2. Observe Window 2 (Member) updating automatically without a page refresh!
**Talking Points**:
> *"Here we have two active sessions. On the left, our Admin session; on the right, our teammate's session.*
>
> *When I modify the task on the left, Supabase's Realtime replication channel broadcasts the change via WebSockets, and the right window updates immediately without needing to refresh the page.*
>
> *Because our queries enforce Row Level Security, private tasks are never broadcast to unrelated users."*

---

### 6. Architecture, Code Structure & Security (5:15 – 6:30)
**Screen**: VS Code
**Files to Show**:
1. `backend/services/auth_service.py` -> Show `@require_auth` decorator and PyJWT validation.
2. `backend/services/task_service.py` -> Show creator-only deletion and authorization check.
3. `migrations/002_security_and_rls.sql` -> Show RLS policies on `public.tasks` and `public.email_outbox`.
4. `backend/worker.py` -> Show background worker for deadline reminders and outbox retries.
**Talking Points**:
> *"Let's examine the code architecture:*
>
> *In `auth_service.py`, token verification is handled strictly server-side using PyJWT. User identity is derived exclusively from validated token claims—we never trust user IDs submitted by the browser.*
>
> *In `task_service.py`, we enforce granular permissions: for example, here in `delete_task`, only the original creator or an administrator can delete a task.*
>
> *In `002_security_and_rls.sql`, database-level Row Level Security provides defense-in-depth.*
>
> *And in `worker.py`, we have an independent background worker that scans for tasks approaching their due date, respects teammate reminder preferences, and retries pending outbox emails."*

---

### 7. Automated Tests & Deployment (6:30 – 7:15)
**Screen**: Terminal
**Actions**:
1. Run: `./backend/venv/bin/pytest`
2. Show all 20 tests passing in ~0.2s!
3. Show `frontend/vercel.json` and root `render.yaml`.
**Talking Points**:
> *"Here in the terminal, I'll run our backend automated test suite using pytest.*
>
> *All 20 tests pass with 100% success in under 0.2 seconds, covering task CRUD, input validation, horizontal privilege escalation prevention, notification ownership, deadline calculations, and outbox retries.*
>
> *For deployment, the frontend is configured for Vercel with `vercel.json`, and the backend and background worker are specified in `render.yaml` with Gunicorn production servers and health check endpoints."*

---

### 8. Conclusion (7:15 – 7:45)
**Screen**: Back to TaskFlow Dashboard
**Talking Points**:
> *"To conclude, TaskFlow fulfills all core and advanced requirements of the Hairdrama Tech assignment: secure Google OAuth authentication, robust task lifecycle and assignment, durable Gmail notifications, real-time collaboration, and proactive deadline reminders.*
>
> *Thank you for your time, and I look forward to discussing the system in detail during our technical interview."*
