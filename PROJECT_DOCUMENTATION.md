# UniFlow – Technical Project Documentation

## 1. Project Overview
- **Problem statement:** Automate and manage university timetables, resource allocation, and role-based access for admins, teachers, and students while keeping data consistent and auditable.
- **Objectives:**
  - Generate conflict-free timetables with department/semester filters.
  - Provide CRUD for users, departments, courses, rooms, and timeslots.
  - Offer role-specific dashboards and views (admin, teacher, student).
  - Secure the system via JWT-based authentication and RBAC.
- **High-level architecture:**
  - **Frontend:** React + TypeScript SPA (Vite), React Router, Redux store, Tailwind CSS.
  - **Backend:** Node.js/Express API, modular routes/controllers, services layer for timetable generation, MongoDB via Mongoose.
  - **Database:** MongoDB with schemas for users, teachers, departments, courses, rooms, timeslots, timetables.
  - **Security:** JWT auth, role guards, Helmet, CORS, input validation.
- **Design rationale & key decisions:**
  - Separation of concerns with clear Express → controller → service layering.
  - MongoDB for flexible academic schemas and iterative timetable drafts.
  - Pluggable algorithms (greedy default; GA/constraint hooks) for future optimization.
  - Role-aware UI with protected routing to minimize unauthorized surface.

## 2. Technology Stack
- **Frontend:** React, TypeScript, React Router, Redux, Tailwind CSS, react-toastify.
- **Backend:** Node.js, Express, Helmet, CORS, Morgan, express-validator.
- **Database:** MongoDB + Mongoose.
- **Auth & Security:** JWT, bcrypt, crypto, role middleware.
- **Build/Tooling:** Vite (frontend), npm scripts (backend), dotenv for config, PostCSS/Tailwind pipeline.

## 3. Application Pages / Modules (Frontend)
Routes defined in [frontend/src/App.tsx](frontend/src/App.tsx#L1-L200); each page wrapped by Layout and gated by ProtectedRoute unless noted.
- LoginPage / RegisterPage: Public auth entry; collects credentials, returns JWT, initializes Redux auth state.
- DashboardPage: Role-aware summary widgets (enrollment, timetable shortcuts).
- TimetablePage: View/search generated timetables; integrates with /api/timetable.
- TeacherTimetablePage: Teacher-specific schedule view filtered by teacher ID.
- TeacherClassesPage: Class list assigned to teacher; shows sessions and rooms.
- TeacherSettingsPage: Profile/workload/availability preferences for teachers.
- DataManagementPage: Bulk data tasks (seed/import/export) against /api/data.
- UserManagementPage: CRUD for users; roles assignment; links to departments/semesters.
- SubjectManagementPage: CRUD for courses (code, name, dept, semester, hours, credits).
- RoomManagementPage: CRUD for rooms (capacity, type) used by timetable generator.
- TimeSlotsPage: CRUD and status toggle for time slots; maps to /api/timeslots.
- TimetableGenerationPage: Launches timetable generation, selects algorithm, semester, AY.
- AdminSettingsPage: Admin preferences (security, notifications).
- AdminMyTeachersPage: Teacher roster per department; ties to Teacher model.
- StudentTimetablePage / StudentNotificationsPage / StudentProfilePage / StudentMyTeachersPage: Student-facing schedule, alerts, profile, teacher list.

## 4. Core Features (Deep Dive)
- **Authentication & Session**
  - Flow: Login → backend /api/auth/login issues JWT → stored client-side → injected via auth middleware for protected routes.
  - Validations: email format, password length; account lock via loginAttempts/lockUntil (see [backend/src/models/User.js](backend/src/models/User.js#L1-L180)).
  - Errors: 401 for invalid creds, 403 for role mismatch, lock handling via isLocked virtual.

- **Role-Based Access Control**
  - Roles: admin, teacher, student.
  - Enforcement: auth middleware sets req.user; requireRole('admin') on admin routes (e.g., time slots in [backend/src/routes/timeSlotRoutes.js](backend/src/routes/timeSlotRoutes.js#L1-L120)).
  - Frontend gating: ProtectedRoute redirects unauthenticated users to /login.

- **Entity Management (CRUD)**
  - Users, Departments, Courses, Rooms, TimeSlots, Timetables.
  - Example: Time slots — validation (HH:MM), day bounds, active toggle; bulk create ([backend/src/routes/timeSlotRoutes.js](backend/src/routes/timeSlotRoutes.js#L1-L120)).
  - Courses enforce uniqueness on courseCode, department, semester bounds ([backend/src/models/Course.js](backend/src/models/Course.js#L1-L80)).

- **Timetable Generation**
  - Endpoint: POST /api/timetable/generate (admin only) with algorithm, semester, academicYear ([backend/src/routes/timetable.js](backend/src/routes/timetable.js#L1-L120)).
  - Data fetch: courses, teachers, rooms, optional department filter (code or ID).
  - Default algorithm: Improved Greedy with even distribution; GA/constraint placeholders fall back to greedy ([backend/src/services/timetable/TimetableGenerator.js](backend/src/services/timetable/TimetableGenerator.js#L1-L220)).
  - Conflict tracking: unscheduled sessions recorded in conflicts; metrics returned in API response.

- **Data Validation & Error Handling**
  - Backend: express-validator for time slots; schema-level validators and enums; global error handler in [backend/src/app.js](backend/src/app.js#L1-L120).
  - Frontend: form-level validations before POST; toast notifications for failures.

- **Logging & Observability**
  - Request logging via custom console logger and Morgan to logs/access.log ([backend/src/app.js](backend/src/app.js#L20-L80)).
  - Health endpoints: /api/health and root.

## 5. Algorithms & Methodologies (Timetable Generation)
- **Problem formulation:** Assign course sessions to (day, timeSlot, room, teacher) such that no teacher/room clashes occur, department/semester constraints are honored, load is balanced, and room suitability is met.
- **Constraints & assumptions:**
  - Working days: Monday–Friday.
  - Time slots predefined (10 slots, 08:00–18:00).
  - Course requires hoursPerWeek sessions (fallback to credits).
  - Teacher can teach course if primary/allowed department matches (legacy string support).
  - Room suitability and availability checked per slot.
- **Algorithm selection:** Greedy chosen for determinism and speed; GA/constraint hooks reserved for future expansion.
- **Improved Greedy – execution flow:**
  1) Sort courses by priority = (credits or 3) * (maxStudents or 30).
  2) Track sessions per day to balance load.
  3) For each course and each needed session:
     - Order days by current load (ascending).
     - Skip overloaded days (> avg + 2).
     - Iterate time slots; find first teacher available & qualified, and room available & suitable.
     - Schedule session; increment per-day load.
     - If none fits, record conflict scheduling_failed.
- **Greedy pseudocode:**
```
sortedCourses := sort(courses, key=priority desc)
sessionsPerDay := dict(day -> 0)

for course in sortedCourses:
  sessionsNeeded := course.hoursPerWeek or course.credits or 3
  for i in 1..sessionsNeeded:
    scheduled := false
    daysByLoad := sort(workingDays, key=sessionsPerDay[day])
    for day in daysByLoad:
      if sessionsPerDay[day] > avg(sessionsPerDay)+2: continue
      for slot in timeSlots:
        teacher := first teachers where available(teacher, day, slot) and canTeach(teacher, course)
        room := first rooms where available(room, day, slot) and suitable(room, course)
        if teacher and room:
          addSession(timetable, course, teacher, room, day, slot)
          sessionsPerDay[day]++
          scheduled := true
          break
      if scheduled: break
    if not scheduled: conflicts += {course, reason:"scheduling_failed"}
return timetable, conflicts
```
- **Fitness/quality:** Quality score (0–100), conflict count, total sessions; derived from scheduled sessions and clash checks.
- **Operators & tuning:** GA/constraint placeholders exist but delegate to greedy; parameters (maxIterations, algorithm) accepted for future use.
- **Optimization strategy:** Priority ordering + load balancing across days minimizes clustering; suitability and availability checks enforce constraints before placement.

## 6. System Workflow
- **End-to-end request:**
  1) Client authenticates (login/register).
  2) JWT attached to requests.
  3) Express auth middleware validates token → sets req.user.
  4) Route-level role guard (admin where needed).
  5) Controller invokes service (e.g., TimetableGenerator).
  6) Service accesses Mongo via Mongoose models.
  7) Response returned; frontend updates Redux store and UI with notifications.
- **Frontend–Backend–DB interaction:** SPA calls /api/* → Express routes → controllers → Mongoose → MongoDB.
- **RBAC:** Protected pages rendered only when authenticated; backend enforces roles per route.

## 7. Database Design (MongoDB via Mongoose)
- **Entities (selected):**
  - User: name, email, password (hashed), role, department ref, semester, teacher fields (availability, workload), status flags, tokens ([backend/src/models/User.js](backend/src/models/User.js#L1-L180)). Indexes: email, role, department, createdAt, isActive.
  - Teacher: links user, primary/allowed departments, workload, availability, designation ([backend/src/models/Teacher.js](backend/src/models/Teacher.js#L1-L150)). Indexes: employeeId, user, primaryDepartment.
  - Department: code (IT/CS/FE), name, description, isActive, virtual counts ([backend/src/models/Department.js](backend/src/models/Department.js#L1-L120)).
  - Course: courseCode (unique), courseName, department ref, semester (1–8), courseType, credits, hoursPerWeek, syllabus ([backend/src/models/Course.js](backend/src/models/Course.js#L1-L80)). Indexes: courseCode, department, semester, courseType.
  - Room: capacity/type (referenced in services) for suitability checks.
  - TimeSlot: dayOfWeek, startTime, endTime, isActive (via controller validations).
  - Timetable: name, studentGroup (department, year, division), status, schedule entries (course, teacher, room, dayOfWeek, start/end) ([backend/src/models/Timetable.js](backend/src/models/Timetable.js#L1-L80)).
- **Relationships:** User ↔ Department; Teacher ↔ User + Department(s); Course ↔ Department; Timetable entries reference Course, Teacher, Room; Department virtuals count Users (students) and Teachers.
- **Indexes & optimization:** Enumerated above support role/department/semester queries and timetable lookups; uniqueness on courseCode and timetable name prevents duplicates.

## 8. Security & Authentication
- **Authentication:** JWT issuance in User model getSignedJwtToken using JWT_SECRET; tokens expire via JWT_EXPIRES_IN. Password hashing with bcrypt (salt 12).
- **Authorization:** auth middleware validates token; requireRole restricts admin operations (e.g., timeslots, timetable generation).
- **Transport/CORS:** Configured origins via config; credentials allowed. Helmet adds security headers.
- **Data protection:** Passwords hashed; reset tokens hashed with SHA-256; account lock via loginAttempts/lockUntil.
- **Threat mitigations:**
  - Brute force: lock logic and bcrypt.
  - JWT tampering: HMAC with secret; expiry enforced.
  - Input validation: express-validator on time slot routes; schema enums and required fields.
  - Least privilege: admin-only generation and bulk operations.
  - Logging for audit: request logs + access log.

## 9. Testing & Validation
- Health checks: /api/health and root JSON respond with status and timestamp.
- API validation: express-validator on write endpoints; schema validations at Mongoose layer.
- Manual/interactive testing: Frontend forms plus backend scripts under backend/scripts for seeding and checks.
- Recommended next steps: Add unit tests (Jest) for services/controllers, integration tests for timetable generation and auth flows, e2e smoke via Playwright/Cypress, load tests for generation endpoints.

## 10. Limitations & Future Enhancements
- **Current limitations:** Greedy only (GA/constraint placeholders); no UI-driven conflict resolution; limited automated testing; room suitability logic minimal; single-node scaling assumptions.
- **Future enhancements:** Implement full GA/constraint solvers with tunable params; interactive conflict resolution UI; caching/pagination; audit trails; CI/CD with automated tests and linting; containerization; real-time notifications for timetable updates.

## Appendix: Architecture Sketch (ASCII)
```
[React SPA + Redux + Tailwind]
           |
           v
    [Express API Layer]
    |   Routes/Controllers
    |   Middleware (auth, role, validation)
    v
[Services]
  - TimetableGenerator (greedy/GA hooks)
  - Data management
    v
[Mongoose Models]
  Users, Teachers, Departments,
  Courses, Rooms, TimeSlots, Timetables
    v
       [MongoDB]
```
