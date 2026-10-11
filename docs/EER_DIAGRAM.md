# StudyOS Database Architecture & EER Diagram Specification

## Entity Relationship Overview

The StudyOS data architecture is designed around student academic workflows with strict multi-tenant user boundaries, relational integrity (InnoDB foreign keys with cascade deletions), and indexing for fast query aggregation.

```
                              +------------------+
                              |      users       |
                              +--------+---------+
                                       |
    +----------------------------------+------------------------------------+
    |           |          |           |            |           |           |
    v           v          v           v            v           v           v
+--------+  +-------+  +-------+  +---------+  +---------+  +-------+   +-------+
|semesters|  | tasks |  | exams |  |timetable|  |  study  |  | goals |   |habits |
+---+----+  +---+---+  +---+---+  | events  |  |sessions |  +-------+   +---+---+
    |           |          |      +---------+  +---------+                  |
    v           |          |           |            |                       v
+--------+      |          |           |            |                   +-------+
|subjects|<-----+----------+-----------+------------+                   | habit |
+---+----+                                                              | logs  |
    |                                                                   +-------+
    v
+--------+
| units  |
+---+----+
    |
    v
+--------+
| topics |
+---+----+
    ^
    | (self-referencing parent_topic_id)
    +

+-------+
| tasks |
+---+---+
    | 1:1
    v
+-----------+
|assignments|
+-----------+

+-------+
| notes | (links to user, optional subject_id, optional topic_id)
+-------+
```

---

## Table Relationships & Cardinality

| Parent Entity | Child Entity | Cardinality | Foreign Key Constraint | Delete Action | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `users` | `semesters` | 1 : N | `semesters.user_id -> users.id` | CASCADE | Grouping semesters per student |
| `semesters` | `subjects` | 1 : N | `subjects.semester_id -> semesters.id` | CASCADE | Course enrollment per semester |
| `subjects` | `units` | 1 : N | `units.subject_id -> subjects.id` | CASCADE | Curriculum division into course units |
| `units` | `topics` | 1 : N | `topics.unit_id -> units.id` | CASCADE | Granular syllabus topics |
| `topics` | `topics` | 1 : N | `topics.parent_topic_id -> topics.id` | SET NULL | Hierarchical nested sub-topics |
| `users` | `tasks` | 1 : N | `tasks.user_id -> users.id` | CASCADE | Academic to-do items and assignments |
| `subjects` | `tasks` | 1 : N | `tasks.subject_id -> subjects.id` | SET NULL | Course-linked tasks |
| `tasks` | `subtasks` | 1 : N | `subtasks.task_id -> tasks.id` | CASCADE | Nested action subtasks with status |
| `tasks` | `assignments` | 1 : 1 | `assignments.task_id -> tasks.id` | CASCADE | Assignment submissions, grading, feedback |
| `users` | `exams` | 1 : N | `exams.user_id -> users.id` | CASCADE | Midterms, finals, tests |
| `subjects` | `exams` | 1 : N | `exams.subject_id -> subjects.id` | CASCADE | Subject-specific exams |
| `users` | `timetable_events`| 1 : N | `timetable_events.user_id -> users.id` | CASCADE | Class schedules & study blocks |
| `subjects` | `timetable_events`| 1 : N | `timetable_events.subject_id -> subjects.id`| SET NULL| Subject color & code linkage |
| `users` | `study_sessions`| 1 : N | `study_sessions.user_id -> users.id` | CASCADE | Pomodoro and focus timer history |
| `subjects` | `study_sessions`| 1 : N | `study_sessions.subject_id -> subjects.id` | SET NULL | Study minutes aggregation |
| `topics` | `study_sessions`| 1 : N | `study_sessions.topic_id -> topics.id` | SET NULL | Focus time per syllabus topic |
| `users` | `goals` | 1 : N | `goals.user_id -> users.id` | CASCADE | Target study hours, score goals |
| `users` | `habits` | 1 : N | `habits.user_id -> users.id` | CASCADE | Daily routines & habits |
| `habits` | `habit_logs` | 1 : N | `habit_logs.habit_id -> habits.id` | CASCADE | Daily completion log entries |
| `users` | `notes` | 1 : N | `notes.user_id -> users.id` | CASCADE | Markdown study notes |
| `subjects` | `notes` | 1 : N | `notes.subject_id -> subjects.id` | SET NULL | Subject-specific notes |
| `topics` | `notes` | 1 : N | `notes.topic_id -> topics.id` | SET NULL | Syllabus topic-linked notes |

---

## Indexing Strategy

1. **User Scoping**: Every private query scopes by `user_id`. An index is placed on `user_id` on all top-level tables.
2. **Date Filtering**: Indices on `tasks.due_at`, `exams.starts_at`, `timetable_events.starts_at`, and `study_sessions.started_at` optimize the Dashboard and Calendar views.
3. **Compound Uniqueness**: `habit_logs (habit_id, log_date)` enforces idempotent habit marking per day without race conditions or duplicates.
