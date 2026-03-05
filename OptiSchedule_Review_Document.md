---
title: "OptiSchedule — AI-Powered Academic Timetable Generator"
subtitle: "Complete Project Review Document"
author: "Jayakrushna"
date: "March 2026"
---

# 1. Introduction & Problem Statement

**OptiSchedule** is a full-stack intelligent timetable generation system that creates conflict-free, optimized academic schedules using a Scored Constraint Satisfaction Problem (CSP) algorithm with post-generation optimization.

**Problem:** Manual academic timetable creation is tedious, error-prone, and time-consuming. Institutions with multiple years, sections, labs, and faculty face frequent scheduling conflicts — double-booked faculty, overlapping rooms, uneven workload distribution, and no systematic way to handle constraints.

**Solution:** OptiSchedule automates the entire process — from user registration, subject/room configuration, to intelligent schedule generation — producing conflict-free, quality-optimized timetables in under 500ms.

**Repository:** https://github.com/JAYA-KRUSHNA/TIME-TABLE-GENERATOR

---

# 2. Frontend — Technologies & Implementation

## 2.1 Technologies Used

| Technology | Version | What It Does |
|-----------|---------|-------------|
| React | 19.2 | Core UI library — component-based architecture with virtual DOM for efficient rendering |
| Next.js | 15 (App Router) | Full-stack React framework — provides server-side rendering, file-based routing, built-in API routes, and middleware support |
| TypeScript | 5.x | Adds static type checking to JavaScript — catches bugs at compile time, improves IDE support |
| Framer Motion | 12.x | Animation library — powers all page transitions, hover effects, staggered card animations |
| Lucide React | Latest | Icon library — provides 1000+ clean SVG icons (Calendar, Users, BookOpen, etc.) |
| React Hot Toast | 2.6 | Notification system — shows success/error toast messages |
| Google Fonts | — | Typography — Inter font for body text, Poppins for headings |
| TailwindCSS | 4.x | Utility framework (imported), with heavy custom CSS for glassmorphism |

## 2.2 Design System

Our custom **dark glassmorphism** design system is defined in `globals.css` (394 lines):

- **Theme Colors:** Dark navy background (#030712), indigo accents (#6366f1, #818cf8)
- **Glass Effect:** `backdrop-filter: blur(20px)` + semi-transparent rgba backgrounds
- **Glass Cards:** Hover lift animation (translateY -4px) + indigo glow shadow
- **Buttons:** Gradient overlay system using `::before` pseudo-element for hover transitions
- **Inputs:** Focus ring via 3px box-shadow in indigo
- **Animations:** Custom keyframes — `fadeIn`, `slideUp`, `pulse-glow`, `float`, `spin`
- **Scrollbar:** Custom styled with indigo-colored thumb
- **OTP Inputs:** Special 54×64px digit boxes with Poppins font

## 2.3 Frontend Pages

### Landing Page (/)
- **Particle Field**: HTML5 Canvas animation with floating particles and connection lines between particles within 120px distance. Particle count adapts to screen size.
- **Typewriter Effect**: Animated text that cycles through feature descriptions
- **Role Selection**: Three glassmorphism cards for Student, Faculty, and Admin login

### Authentication (7 pages)
- Student: Login, Register (with section dropdown), Forgot Password
- Faculty: Login, Register, Forgot Password
- Admin: Login, Forgot Password
- OTP Verification: 6-digit input with auto-advance
- Real-time password strength validation

### Admin Dashboard (12 pages)
- **Dashboard**: Welcome banner, 4 stat cards (students, faculty, approvals, sections), 6 quick action links
- **Timetable Generator**: 6-step wizard — Select Classes → Configure Subjects → Select Rooms → Select Labs → Add Free Periods → Set Rules & Generate
- **View Timetables**: Color-coded grid (theory=indigo, lab=emerald, free=amber)
- **Room Management**: Add/edit rooms and labs, occupancy percentage bars
- **User Management**: View all users filtered by role
- **Faculty Approvals**: Approve/reject pending faculty registrations
- **College Structure**: Manage departments, add/edit sections (year + name)
- **Data Import**: CSV upload for bulk student and faculty data
- **Faculty Interests**: View which faculty selected which subjects
- **Messages**: Broadcast messages to all users
- **Generation Logs**: Audit trail showing execution time, slots, conflicts per generation
- **Super Admin**: Promote/demote admin privileges (SuperAdmin only)
- **Collapsible Sidebar**: 258-line admin sidebar with active route highlighting

### Faculty Dashboard (6 tabs)
- **Schedule**: Weekly timetable grid displaying assigned classes with room numbers, color-coded by type
- **Subject Interests**: Select preferred subjects to teach (FCFS priority for assignment)
- **Availability**: Toggle available/unavailable per slot (6 days × 7 periods grid)
- **Messages**: Chat with students who message them
- **Notifications**: View broadcast messages from admin
- **Profile**: View personal details, logout

### Student Dashboard (5 tabs)
- **Timetable**: Full weekly timetable with faculty names, room/lab names, color-coded cells
- **Notifications**: View broadcast messages from admin
- **Faculty**: View all faculty members in their department
- **Messages**: Start and continue conversations with faculty
- **Profile**: Hero banner with stat cards, detail rows, CSV timetable export

---

# 3. Backend — Technologies & Implementation

## 3.1 Technologies Used

| Technology | Version | What It Does |
|-----------|---------|-------------|
| Next.js API Routes | 15 | REST API layer — each file in `/api/` becomes an HTTP endpoint. No separate server needed. |
| better-sqlite3 | 12.x | SQLite database driver — synchronous C++ bindings for fast, embedded database access |
| jose | 6.x | JWT library — creates and verifies JSON Web Tokens using HS256 algorithm |
| bcryptjs | 3.x | Password hashing — 10-round salt for secure password storage |
| Nodemailer | 8.x | Email delivery — sends OTP verification emails via SMTP (Gmail App Password) |

## 3.2 API Endpoints (16+)

### Authentication APIs

| Method | Endpoint | What It Does |
|--------|----------|-------------|
| POST | /api/auth/send-otp | Generates 6-digit OTP, stores in DB, sends via email |
| POST | /api/auth/verify-otp | Validates OTP code, expiry (5 min), and attempt count (max 3) |
| POST | /api/auth/register-student | Creates student profile with hashed password |
| POST | /api/auth/register-faculty | Creates faculty profile (status = "pending") |
| POST | /api/auth/login | Verifies credentials, returns JWT in httpOnly cookie |
| POST | /api/auth/logout | Clears auth cookie |
| GET | /api/auth/me | Returns current user from JWT token |
| POST | /api/auth/forgot-password | Sends password reset OTP |

### Admin APIs

| Method | Endpoint | What It Does |
|--------|----------|-------------|
| GET/POST | /api/admin/users | List all users / update user status |
| GET/PUT | /api/admin/faculty-approvals | List pending faculty / approve or reject |
| GET/POST | /api/admin/rooms | CRUD for classrooms and labs |
| GET/POST | /api/admin/manage-admins | Promote/demote admin role |

### Core APIs

| Method | Endpoint | What It Does |
|--------|----------|-------------|
| POST | /api/timetable/generate | Runs the CSP + SA timetable generation algorithm |
| GET | /api/timetable/views | Fetches generated timetables for display |
| GET/POST | /api/data | Generic CRUD for subjects, sections, departments, etc. |
| POST | /api/csv/upload | Parses and imports CSV files (students/faculty) |
| GET | /api/sections | Returns available year-section combinations |
| GET/POST | /api/faculty/availability | Get/set faculty availability per time slot |

## 3.3 Authentication Flow (End-to-End)

**Registration:**

1. User fills registration form (name, email, password, year/section for students)
2. Frontend calls POST /api/auth/send-otp → backend generates 6-digit OTP
3. OTP stored in `otp_codes` table (5-minute TTL, max 3 attempts)
4. Nodemailer sends styled HTML email with OTP via SMTP
5. User enters OTP → POST /api/auth/verify-otp validates it
6. Profile created in `profiles` table with bcrypt-hashed password
7. Faculty accounts get status = "pending" (requires admin approval)
8. Student accounts immediately active

**Login:**

1. User enters email + password
2. API fetches profile, runs `bcrypt.compare()` on password
3. If valid: JWT created with `jose` (HS256, 7-day expiry, payload: {id, email, role})
4. JWT set as `httpOnly` cookie (prevents XSS access)
5. Redirect to role-specific dashboard

**Route Protection:**

1. `middleware.ts` runs on every non-public route
2. Reads JWT from cookie → verifies with `jose`
3. Checks role against URL path (e.g., /admin requires admin|superadmin)
4. Invalid/expired token → redirect to /select-role

## 3.4 Role-Based Access Control

| Role | Access | How They Get It |
|------|--------|----------------|
| Student | /student/* | Instant after OTP verification |
| Faculty | /faculty/* | After OTP + admin approval |
| Admin | All /admin/* pages | Promoted by SuperAdmin |
| SuperAdmin | /admin/* + manage other admins | Hardcoded on first run |

---

# 4. Database — Schema & Implementation

## 4.1 Technology

| Aspect | Details |
|--------|---------|
| Engine | SQLite (embedded, serverless, zero-configuration) |
| Driver | better-sqlite3 (synchronous C++ bindings for Node.js) |
| Journal Mode | WAL (Write-Ahead Logging) — allows concurrent reads during writes |
| Foreign Keys | Enforced via `PRAGMA foreign_keys = ON` |
| Auto-Setup | Database auto-creates all tables on first run |
| Migration | Safe column-addition via `PRAGMA table_info` check before ALTER |

## 4.2 Complete Table List (24 Tables)

### User & Auth Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| profiles | All users | id, role, name, email, password (hash), reg_no, year, section, status |
| otp_codes | Email verification | email, code (6-digit), purpose, attempts, expires_at |

### Academic Structure Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| departments | Academic departments | name, code (e.g., "CSE") |
| sections | Year-section combos | department_id, year, section_name, student_count |
| subjects | Theory/Lab/Free | name, type, hours_per_week, lab_type_id, year |
| classes | Links dept+year+section | department_id, year, section_id |
| extracurriculars | Extra activities | class_id, activity_name, periods_per_week |

### Room & Lab Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| rooms | Classrooms | name (CR-101...), capacity, type |
| labs | Lab rooms | name (Lab-1...), lab_type_id, capacity |
| lab_types | Lab categories | name (Programming Lab, Networks Lab, etc.) |

### Timetable & Schedule Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| timetables | Generated schedule slots | class_id, day, period, subject_id, room_id, lab_id |
| faculty_schedule | Faculty teaching slots | faculty_id, day, period, class_id, subject_id |
| faculty_assignments | Faculty-subject-class mapping | faculty_id, subject_id, class_id |
| room_schedule | Room occupancy tracking | room_id, day, period, class_id |
| lab_schedule | Lab occupancy tracking | lab_id, day, period, class_id |

### Faculty Configuration Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| faculty_subjects | Subject interest selections | faculty_id, subject_id, created_at (FCFS) |
| faculty_availability | Available/unavailable slots | faculty_id, day, period, is_available |

### Communication Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| notifications | Broadcast messages | user_id, type, title, body, read |
| messages | Direct messages | sender_id, content, conversation_id |
| conversations | Chat threads | participant_ids, type |

### System Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| generation_logs | Audit trail | execution_time_ms, status, total_slots, soft_score_json |
| audit_logs | Admin action log | action, target_table, user_id |
| academic_calendar | Calendar events | date, event_type, description |
| data_change_tracker | Generation lock | table_name, last_changed |

## 4.3 Auto-Seeded Data (First Run)

| Data | Count | Details |
|------|-------|---------|
| Departments | 1 | Computer Science & Engineering (CSE) |
| Sections | 12 | Year 1–4, Sections A/B/C |
| Classrooms | 15 | CR-101 to CR-115, capacity 70 each |
| Labs | 3 | Lab-1 (Programming), Lab-2 (Networks), Lab-3 (Database) |
| Lab Types | 7 | Programming, Networks, Database, AI/ML, Electronics, Physics, Chemistry |
| SuperAdmins | 2 | Hardcoded admin accounts |

---

# 5. Algorithms — Complete Details

## 5.1 Scored Constraint Satisfaction Problem (Scored CSP)

**What is CSP?** Constraint Satisfaction Problems involve finding values for variables that satisfy a set of constraints. Traditional CSP only checks if a solution is valid or not.

**Our Enhancement — Scored CSP:** Instead of just checking validity, we assign a quality score to every possible slot placement and pick the highest-scoring valid slot. This produces not just a valid timetable but an optimized one.

**8 Scoring Factors:**

| # | Factor | Weight | Logic |
|---|--------|--------|-------|
| 1 | Subject Day Spread | +60 | Bonus when a subject is placed on a new day it hasn't been placed on yet |
| 2 | Same-Day Repeat | -120 | Heavy penalty for placing same subject twice on same day |
| 3 | Morning Theory | +18 | Theory classes in periods 1–4 score higher than afternoon |
| 4 | Anti-Clustering | +12 | Avoids placing same subject in adjacent periods |
| 5 | Even Day Load | +10 | Rewards days with fewer classes (balances across 6 days) |
| 6 | Faculty Load Balance | +8 | Prefers days where assigned faculty has fewer classes |
| 7 | Room Consistency | +6 | Bonus for using same room the section used before |
| 8 | Room Available | +5/-15 | +5 if room available, −15 if no room can be found |

**Pseudocode:**

```
For each subject that needs placement:
    best_score = -infinity
    best_slot = null
    For each day in [Monday...Saturday]:
        For each period in [1...7]:
            if slot already occupied: skip
            score = 0
            score += 60 if subject not yet on this day
            score += -120 × (times this subject already on this day)
            score += 18 if theory and period <= 4
            score += 10 × (7 - classes_on_this_day)
            score += 8 × (4 - faculty_load_on_this_day)
            score += 5 if room available, -15 if not
            if score > best_score:
                best_score = score
                best_slot = (day, period)
    Place subject in best_slot
```

## 5.2 Minimum Remaining Values (MRV) Heuristic

Before generating, classes are sorted by most constrained first — the class with the most required periods gets scheduled first. This reduces dead-ends because the hardest-to-place items are handled when the most slots are still available.

```
classes.sort(by: total_required_periods, order: descending)
```

## 5.3 Simulated Annealing (SA) — Post-Generation Optimization

After the CSP places all slots, Simulated Annealing performs a global quality optimization:

**Parameters:**

| Parameter | Value |
|-----------|-------|
| Max Iterations | 500 |
| Initial Temperature | 1.0 |
| Cooling Rate | 0.995 |
| Acceptance Function | Boltzmann: e^(delta / temperature × 50) |

**How It Works:**

```
temperature = 1.0
for iteration = 1 to 500:
    Pick two random theory slots in the same class
    Calculate score_before and score_after swapping them
    delta = score_after - score_before
    
    if delta > 0:
        Accept swap (it's an improvement)
    else if random() < e^(delta / temperature × 50):
        Accept swap (exploration — escape local optima)
    else:
        Reject swap
    
    temperature = temperature × 0.995  (cool down)
    
    if no improvement after 100 iterations and temperature < 0.3:
        Stop early (converged)
```

**Why SA?** After the greedy CSP placement, there may be globally suboptimal patterns (e.g., all hard subjects clustered on one day). SA explores random swaps, accepting worse solutions early to escape local optima, then gradually converging to a near-optimal global solution.

## 5.4 O(1) Schedule Index (Hash-Map Conflict Detection)

All conflict checks use an in-memory O(1) data structure instead of database queries:

**Data Structure:**

```
ScheduleIndex:
    classSlots:      Map<classId, Set<"day_period">>
    facultySlots:    Map<facultyId, Set<"day_period">>
    roomSlots:       Map<roomId, Set<"day_period">>
    labSlots:        Map<labId, Set<"day_period">>
    classDaySubject: Map<"classId|day|subjectId", count>
    classDayLoad:    Map<"classId|day", count>
    facultyDayLoad:  Map<"facultyId|day", count>
```

**Why?** During scoring, the algorithm evaluates thousands of slot combinations. Each check (is this room busy? is this faculty free?) must be O(1), not O(n). Using `Set.has()` gives constant-time lookups.

## 5.5 FCFS (First-Come-First-Served) Faculty Assignment

Faculty are assigned using a priority cascade:

1. **Cross-section lock check**: If this subject was already assigned to a faculty in another section of the same year, use that same faculty (ensures consistency)
2. **Interest-based FCFS**: Faculty who registered interest (ordered by `created_at` timestamp — first come, first served)
3. **Backup pool**: All remaining faculty sorted by lowest workload

**ALL-or-NOTHING Rule:** A faculty must be able to cover ALL slots (theory + lab) for a subject in a section, or they are not assigned at all. This prevents partial coverage.

## 5.6 Concurrency Lock (Mutual Exclusion)

Uses the `data_change_tracker` table as a database-level mutex:

- Before generation: INSERT a lock row
- If lock already exists (another generation running): return HTTP 429
- Lock auto-expires after 2 minutes (prevents deadlocks from crashes)
- After generation: DELETE the lock row

## 5.7 Particle System Animation

Landing page uses HTML5 Canvas 2D rendering:

- Creates particles with random position, velocity, size, and color (indigo shades)
- Each frame: update positions, draw particles, draw connection lines between particles within 120px
- Line opacity fades with distance: `alpha = (1 - distance/120) × 0.15`
- Particle count adapts to screen: `count = (width × height) / 12000`
- Uses `requestAnimationFrame` for smooth 60fps rendering

---

# 6. Complete End-to-End Workflow

## Step 1: System Setup
- Run `npm run dev` → Next.js starts on port 3000
- SQLite database auto-creates all 24 tables
- Seeds: 1 department, 12 sections, 15 rooms, 3 labs, 7 lab types, 2 superadmins

## Step 2: User Registration
- Users visit landing page → select role → register
- System sends OTP email → user verifies → account created
- Students: immediate access | Faculty: awaits admin approval

## Step 3: Admin Configures Subjects
- Admin logs in → navigates to College Structure
- Adds subjects for each year (theory + lab), specifying hours_per_week
- Subject deduplication: adding existing subject increments hours instead of creating duplicate

## Step 4: Faculty Set Preferences
- Approved faculty log in → go to Subject Interests tab
- Select subjects they want to teach (FCFS — timestamp recorded)
- Go to Availability tab → mark which day/period slots they're available

## Step 5: Timetable Generation (6-Step Wizard)
1. **Select Classes**: Choose year+section combinations to generate for
2. **Configure Subjects**: Review/add theory and lab subjects with hours
3. **Select Classrooms**: Pick rooms (shows current occupancy %)
4. **Select Labs**: Pick labs by type (shows current occupancy %)
5. **Add Free Periods**: MOOCs, Library, Career Enhancement, etc.
6. **Set Rules & Generate**: Configure max consecutive theory, lab block size → click Generate

## Step 6: Algorithm Execution (< 500ms)
- Phase 1 — LABS: Place lab sessions in 2-consecutive-period blocks
- Phase 2 — THEORY: Place theory using Scored CSP (8 factors)
- Phase 3 — FREE PERIODS: Distribute free periods evenly
- Phase 4 — FORCE-FILL: Place any remaining requirements
- Phase 5 — FACULTY ASSIGNMENT: FCFS interest-based, ALL-or-NOTHING
- Phase 6 — SIMULATED ANNEALING: 500 iterations of swap optimization

## Step 7: Results & Viewing
- Admin views generated timetables in color-coded grid
- Faculty see their teaching schedule with room numbers
- Students see their class timetable with faculty names
- Generation logged in audit trail (execution time, conflicts, score)

---

# 7. Schedule Structure

| Period | Time |
|--------|------|
| P1 | 9:00 AM – 9:50 AM |
| P2 | 9:50 AM – 10:40 AM |
| Break | 10:40 AM – 11:00 AM |
| P3 | 11:00 AM – 11:50 AM |
| P4 | 11:50 AM – 12:40 PM |
| Lunch | 12:40 PM – 1:50 PM |
| P5 | 1:50 PM – 2:40 PM |
| P6 | 2:40 PM – 3:30 PM |
| P7 | 3:30 PM – 4:20 PM |

Days: Monday to Saturday = 7 periods × 6 days = **42 slots per section**

Lab sessions use 2 consecutive periods and never span across breaks.

---

# 8. Eight Hard Constraint Rules

| Rule | Description | How It's Enforced |
|------|------------|-------------------|
| R1 | No faculty double-booking across ALL timetables | O(1) Set lookup in ScheduleIndex |
| R2 | Min 1 free period per day per faculty | facultyDayOverloaded() check |
| R3 | One subject per year per faculty | facultyYearSubjects map |
| R5 | Respect faculty availability settings | facultyUnavailable set |
| R6 | Theory + Lab of same subject → same faculty allowed | Base name matching (strip " LAB") |
| R7 | Same faculty for same subject in all sections of a year | subjectFacultyLock map |
| R8 | Unassigned slots marked with ◈ | Visual indicator in UI |
| R9 | Avoid mixing lab and theory on same day | Soft rule — score penalty (−40) |

---

# 9. Complexity Analysis

| Operation | Time Complexity | Notes |
|-----------|----------------|-------|
| Single conflict check | O(1) | HashMap Set.has() |
| Theory slot scoring | O(1) | All factors use O(1) lookups |
| Theory placement (all) | O(S × D × P) | S=subjects, D=6 days, P=7 periods |
| Lab placement (all) | O(L × D × V) | L=lab subjects, V=valid start positions |
| Faculty assignment | O(F × T) | F=faculty candidates, T=slots per subject |
| Simulated Annealing | O(500 × N) | N=swappable slots per class |
| Total generation | Under 500ms | Typical for 3 sections |

---

# 10. Key Differentiators

| Feature | Why It's Special |
|---------|-----------------|
| Scored CSP | Not just constraint satisfaction — every slot is quality-ranked |
| Simulated Annealing | Meta-heuristic for global optimization after greedy placement |
| O(1) Conflict Detection | No database queries during scoring — pure in-memory |
| ALL-or-NOTHING Faculty | Faculty covers all Theory+Lab slots or none |
| Cross-Section Consistency | Same faculty teaches same subject across all sections in a year |
| FCFS Interest Priority | First-come-first-served faculty preference |
| Concurrency Locking | Database mutex prevents simultaneous generation |
| Crash-Proof | Every DB query wrapped in try-catch |
| Zero External APIs | Algorithm runs entirely on-device — no AI APIs needed |
| Auto-Seeding | Complete database setup on first run |

---

# 11. How to Run

```
git clone https://github.com/JAYA-KRUSHNA/TIME-TABLE-GENERATOR.git
cd TIME-TABLE-GENERATOR
npm install
cp .env.example .env.local
# Edit .env.local: SMTP_HOST, SMTP_USER, SMTP_PASS, JWT_SECRET
npm run dev
```

Open http://localhost:3000

**Default Login:** jayakrushna1622@gmail.com / jk@12345

---

# 12. Project Statistics

| Metric | Value |
|--------|-------|
| Total Files | 73 |
| Total Lines of Code | 17,800+ |
| Algorithm File | 1,153 lines |
| Database Tables | 24 |
| API Endpoints | 16+ |
| Admin Pages | 12 |
| Auth Pages | 7 |
| CSS Design System | 394 lines |
| Generation Time | Under 500ms |
