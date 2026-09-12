# Campus Connect Hub

Build a production-ready, mobile-first hyperlocal college campus marketplace web application called "Campus Hustle". 

### 1. DESIGN & VIBE
- UI/UX Style: Modern, clean, mobile-first responsive web design with a dark/light slate theme, high contrast cards, dynamic tags, and vibrant accents.
- Responsive Layout: Optimized specifically for phone screens (iOS/Android mobile browser viewports) with a bottom navigation bar for quick access.
- Component Icons: Use Lucide React icons for category badges, relative time indicators, and navigation.

### 2. CORE FEATURES & LOGICAL RULES
1. Domain-Locked College Authentication:
   - Users can ONLY register using official university/college email addresses ending in extensions like .edu or .ac.in.
   - Automatically parse and extract the domain name upon signup (e.g., student@nit.ac.in -> domain: 'nit.ac.in').
   - Dynamically filter the entire application feed so a user ONLY sees active tasks posted within their own college campus domain.

2. The 3 Campus "Vibes" (Categories):
   - Every task must strictly fall under one of these three categories:
     * "Hustle": Errands, parcel pickups from gates, assignment support, printing runs.
     * "Playground": Sports pairing (football, badminton, chess, board games).
     * "Lounge": Social connections (night walks, canteen tea/coffee runs, study groups).

3. Time Management & Lifecycle Engine:
   - Track `created_at`, `expires_at` (optional user-defined deadline), `accepted_at`, and `completed_at`.
   - Display dynamic relative timestamps across the UI (e.g., "Posted 4m ago").
   - Display a dynamic countdown badge for time-sensitive tasks (e.g., ⏳ "Expires in 15 mins" highlighted in red text). Automatically hide or archive expired unaccepted posts from the active feed.

4. The "Secure Handshake" Handover Protocol:
   - When a task poster accepts a helper's bid via private chat, the system locks the task status to 'Accepted' and automatically generates a secure random 4-digit PIN visible strictly to the task poster.
   - Upon physical task completion or item handover, the poster gives the helper the PIN face-to-face.
   - The helper enters the 4-digit PIN into their chat/task view to transition the task status to 'Completed'. This action unlocks a mutual 1-to-5 star rating and verified feedback dialog.

5. Lightweight Text-Only Private Messaging:
   - Build a private text-based chat room mapped directly to a specific task instance between the poster and the applicant.
   - Strictly limit message payloads to plain text strings (no image, voice, or file attachments) to maximize database performance.

6. Anti-Spam Guardrails:
   - Enforce a strict active task post limit: users are blocked from creating a new task if they already have 3 concurrent active tasks (status = 'Open' or 'Accepted').

### 3. DATABASE SCHEMA (Supabase Integration)
Set up PostgreSQL database tables with Row Level Security (RLS) policies:
- profiles: id (UUID, auth.users link), full_name, college_domain, rating (float, default 5.0), avatar_url.
- tasks: id (BigInt), poster_id (FK profiles.id), title, description, category ('Hustle', 'Playground', 'Lounge'), reward (e.g., "₹50 Cash", "Cold Drink", "Treat"), status ('Open', 'Accepted', 'Completed', 'Expired', 'Cancelled'), handshake_pin (4-digit Integer), created_at, expires_at, accepted_at, completed_at.
- chats: id (BigInt), task_id (FK tasks.id), poster_id (FK profiles.id), applicant_id (FK profiles.id), status.
- messages: id (BigInt), chat_id (FK chats.id), sender_id (FK profiles.id), message_text (Text), created_at.
- ratings: id (BigInt), task_id (FK tasks.id), reviewer_id (FK profiles.id), reviewee_id (FK profiles.id), stars (Integer 1-5), comment (Text).

### 4. APPLICATION PAGES & NAVIGATION
1. Authentication Page (`/login`): Domain validation rule, single-form toggling between login and college signup.
2. Home Feed (`/`): Category filter tabs ("All", "Hustle", "Playground", "Lounge"), search bar, task feed cards showing poster rating, relative post time, reward tag, and urgency countdowns.
3. Create Task Page (`/create`): Form with title, category selector, reward description, expiration timer, and active post limit check.
4. Task Detail & Private Chat (`/task/:id` / `/chat/:id`): Real-time text chat window, task acceptance workflow button, 4-digit PIN display module for poster, PIN entry form for helper, and ratings modal.
5. User Profile (`/profile`): Displays user star rating, college domain badge, active tasks, and past completed task history.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://domain-dash-app.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e2b265da-0481-48fc-af2f-d4be714d23e2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
