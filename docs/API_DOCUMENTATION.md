# StudyOS REST API Specification (`/api/v1`)

Base Path: `/api/v1`  
Authentication: Bearer JWT Token in `Authorization: Bearer <token>` header or `studyos_token` cookie.

---

## 1. Authentication & User Profile

### `POST /api/v1/auth/register`
Creates a new student account.
- **Request Body**:
  ```json
  {
    "name": "Alex Chen",
    "email": "alex.chen@university.edu",
    "password": "Password123!",
    "college": "Stanford University",
    "timezone": "America/Los_Angeles"
  }
  ```
- **Response** `201 Created`:
  ```json
  {
    "user": { "id": "...", "name": "...", "email": "...", "college": "...", "timezone": "...", "onboardingCompleted": false },
    "token": "eyJhbGciOi..."
  }
  ```

### `POST /api/v1/auth/login`
- **Request Body**:
  ```json
  {
    "email": "alex.chen@university.edu",
    "password": "Password123!"
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "user": { ... },
    "token": "..."
  }
  ```

### `GET /api/v1/auth/me`
Returns current authenticated user profile.
- **Response** `200 OK`:
  ```json
  {
    "user": { "id": "...", "name": "...", "email": "...", "timezone": "...", "targetDailyMinutes": 120, "theme": "dark" }
  }
  ```

### `PATCH /api/v1/auth/profile`
Updates user profile settings, daily goals, theme, or timezone.
- **Request Body**:
  ```json
  {
    "name": "Alex Chen",
    "college": "Stanford University",
    "targetDailyMinutes": 180,
    "theme": "dark",
    "timezone": "America/Los_Angeles",
    "onboardingCompleted": true
  }
  ```

---

## 2. Academics & Semesters

### `GET /api/v1/semesters`
Returns all semesters for the current user.
- **Query params**: `activeOnly=true|false`

### `POST /api/v1/semesters`
Creates a semester.
- **Request Body**:
  ```json
  {
    "name": "Fall 2026",
    "startDate": "2026-09-01T00:00:00.000Z",
    "endDate": "2026-12-20T23:59:59.000Z",
    "isActive": true
  }
  ```

### `GET /api/v1/subjects`
Returns subjects for current user (filtered by semester if `semesterId` provided).
- **Includes**: Unit count, topic count, syllabus progress percentage.

### `POST /api/v1/subjects`
- **Request Body**:
  ```json
  {
    "semesterId": "...",
    "name": "Data Structures & Algorithms",
    "code": "CS 106B",
    "color": "#10b981",
    "credits": 4
  }
  ```

### `GET /api/v1/subjects/:id/syllabus`
Returns the complete syllabus tree: Subject -> Units -> Topics & Sub-topics.

### `POST /api/v1/subjects/:id/units`
Creates a unit.
- **Request Body**: `{ "name": "Unit 1: Trees and Graphs", "position": 0 }`

### `POST /api/v1/units/:id/topics`
Creates a syllabus topic.
- **Request Body**:
  ```json
  {
    "title": "Red-Black Balanced Trees",
    "description": "Rotations, invariants, search time complexity",
    "difficulty": "HARD",
    "estimatedMinutes": 90,
    "parentTopicId": null
  }
  ```

### `PATCH /api/v1/topics/:id`
Updates topic learning status (`NOT_STARTED`, `LEARNING`, `PRACTICED`, `REVISED`, `MASTERED`), difficulty, notes, or title.

---

## 3. Tasks & Assignments

### `GET /api/v1/tasks`
Query parameters: `status`, `priority`, `subjectId`, `isAssignment=true|false`, `search`.

### `POST /api/v1/tasks`
Creates a task with optional assignment fields.
- **Request Body**:
  ```json
  {
    "title": "Problem Set 3: Graph Traversal",
    "description": "Implement Dijkstra and A* in C++",
    "subjectId": "...",
    "priority": "HIGH",
    "dueAt": "2026-10-18T23:59:00.000Z",
    "estimatedMinutes": 180,
    "isAssignment": true,
    "submissionMethod": "Gradescope",
    "submissionUrl": "https://gradescope.com/courses/106"
  }
  ```

### `PATCH /api/v1/tasks/:id`
Updates task status (`INBOX`, `TODO`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`). Automatically records `completedAt`.

### `GET /api/v1/tasks/:id`
Retrieves a single task with joined subject, assignment, and all nested subtasks ordered by position.

### `POST /api/v1/tasks/:taskId/subtasks`
Creates a nested subtask under a task.
- **Request Body**:
  ```json
  {
    "title": "Construct prefix binary tree structure",
    "status": "TODO"
  }
  ```

### `PATCH /api/v1/tasks/:taskId/subtasks/:subtaskId`
Updates a subtask's `title`, `status` (`TODO`, `IN_PROGRESS`, `COMPLETED`), or `position`. Automatically records/clears `completedAt`.

### `POST /api/v1/tasks/:taskId/subtasks/:subtaskId/toggle`
Toggles subtask completion status between `TODO` and `COMPLETED`.

### `DELETE /api/v1/tasks/:taskId/subtasks/:subtaskId`
Deletes a nested subtask.

### `POST /api/v1/assignments/:id/submit`
Marks assignment as `SUBMITTED`, records submission timestamp and URL.

### `PATCH /api/v1/assignments/:id/grade`
Records assignment grade and feedback.

---

## 4. Exams

### `GET /api/v1/exams`
Returns all exams sorted by `startsAt` with countdown calculations.

### `POST /api/v1/exams`
- **Request Body**:
  ```json
  {
    "subjectId": "...",
    "title": "Midterm Examination",
    "startsAt": "2026-10-25T14:00:00.000Z",
    "location": "Hewlett Hall 200",
    "examType": "Midterm",
    "targetScore": 95,
    "confidenceLevel": 4,
    "pastPapersUrl": "https://cs106b.stanford.edu/exams"
  }
  ```

---

## 5. Timetable & Planner

### `GET /api/v1/timetable-events`
Returns timetable events for the calendar (classes, labs, study blocks).
- Query params: `startDate`, `endDate`, `subjectId`.

### `POST /api/v1/timetable-events`
- **Request Body**:
  ```json
  {
    "title": "CS 106B Lecture",
    "subjectId": "...",
    "eventType": "CLASS",
    "startsAt": "2026-10-12T10:00:00.000Z",
    "endsAt": "2026-10-12T11:20:00.000Z",
    "recurrenceRule": "FREQ=WEEKLY;BYDAY=MO,WE,FR",
    "location": "NVIDIA Auditorium"
  }
  ```

---

## 6. Focus Timer & Study Sessions

### `POST /api/v1/study-sessions`
Starts or creates a study session.
- **Request Body**:
  ```json
  {
    "subjectId": "...",
    "topicId": "...",
    "taskId": "...",
    "sessionType": "POMODORO",
    "startedAt": "2026-10-11T09:00:00.000Z"
  }
  ```

### `POST /api/v1/study-sessions/:id/finish`
Completes a session with duration and distraction count.
- **Request Body**:
  ```json
  {
    "endedAt": "2026-10-11T09:25:00.000Z",
    "durationSeconds": 1500,
    "distractionsCount": 1,
    "notes": "Finished reading section on B-Trees"
  }
  ```

---

## 7. Habits & Goals

### `GET /api/v1/habits`
Returns all user habits with 30-day completion histories and streaks.

### `POST /api/v1/habits/:id/toggle`
Toggles habit completion for a specific `date` (`YYYY-MM-DD`). Idempotent.

---

## 8. Notes

### `GET /api/v1/notes`
Returns user notes with optional `subjectId`, `topicId`, `tag`, or `search` query.

### `POST /api/v1/notes`
Creates note with title, markdown content, tags, and subject/topic linkage.

---

## 9. Dashboard & Analytics

### `GET /api/v1/dashboard/summary`
Retrieves consolidated dashboard metrics in a single query:
- Today's schedule events
- Tasks due today & overdue tasks
- Upcoming exams (within 30 days)
- Upcoming assignment deadlines
- Overall syllabus completion by subject
- Today's and this week's study time
- Today's habit checklist
- Recent notes

### `GET /api/v1/analytics/overview`
Returns:
- Daily study minutes over the past 7, 14, or 30 days
- Subject breakdown of study minutes
- Planned vs actual study time
- Syllabus completion percentage by subject
- Task completion rates and overdue counts
- Habit consistency rates
