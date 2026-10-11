# MySQL Workbench Administration & Inspection Guide for StudyOS

This guide explains how to connect **MySQL Workbench 8.x** to your StudyOS database, inspect the 14 core tables, execute queries, verify foreign keys, and generate an EER (Enhanced Entity-Relationship) diagram.

---

## 1. Prerequisites
- **MySQL Server 8.0+** running locally (or hosted on Cloud SQL, AWS RDS, or Docker)
- **MySQL Workbench 8.0+** installed
- StudyOS database credentials from your `.env` file

---

## 2. Setting Up MySQL Database & User

If running MySQL locally or on a server, connect to your MySQL instance using your terminal or MySQL Workbench:

```sql
-- 1. Create the StudyOS database with utf8mb4 encoding
CREATE DATABASE IF NOT EXISTS `studyos_db` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- 2. Create dedicated application user
CREATE USER IF NOT EXISTS 'studyos_user'@'localhost' IDENTIFIED BY 'studyos_password';
CREATE USER IF NOT EXISTS 'studyos_user'@'%' IDENTIFIED BY 'studyos_password';

-- 3. Grant full privileges on the database
GRANT ALL PRIVILEGES ON `studyos_db`.* TO 'studyos_user'@'localhost';
GRANT ALL PRIVILEGES ON `studyos_db`.* TO 'studyos_user'@'%';
FLUSH PRIVILEGES;
```

---

## 3. Configuring Connection in MySQL Workbench

1. Open **MySQL Workbench**.
2. Click the **`+`** icon next to **MySQL Connections**.
3. Fill in the connection parameters:
   - **Connection Name**: `StudyOS Local Dev`
   - **Connection Method**: `Standard (TCP/IP)`
   - **Hostname**: `127.0.0.1` (or your remote host)
   - **Port**: `3306`
   - **Username**: `studyos_user`
   - **Password**: Click *Store in Vault...* and enter `studyos_password`
   - **Default Schema**: `studyos_db`
4. Click **Test Connection**. A green prompt confirming successful connection will appear.
5. Click **OK** to save.

---

## 4. Applying Schema & Migrations

To apply the schema:

### Option A: Using Prisma Migration
```bash
npx prisma migrate dev --name init
# Or apply existing migration:
npx prisma migrate deploy
```

### Option B: Using MySQL Workbench SQL Editor
1. In Workbench, double-click **StudyOS Local Dev**.
2. Go to **File -> Open SQL Script...**
3. Select `prisma/migrations/20261011_init/migration.sql`.
4. Click the lightning bolt icon (⚡) to execute all DDL statements.
5. In the **Navigator** pane on the left, right-click and select **Refresh All** under **Schemas**.
6. You will see all 14 tables under `studyos_db` -> `Tables`:
   - `users`
   - `semesters`
   - `subjects`
   - `units`
   - `topics`
   - `tasks`
   - `assignments`
   - `exams`
   - `timetable_events`
   - `study_sessions`
   - `goals`
   - `habits`
   - `habit_logs`
   - `notes`

---

## 5. Reverse Engineering & EER Diagram

MySQL Workbench allows you to generate visual EER diagrams of the database schema:

1. In the top menu, go to **Database -> Reverse Engineer...** (or press `Ctrl+R` / `Cmd+R`).
2. Choose your stored connection (`StudyOS Local Dev`) and click **Next**.
3. Select the schema **`studyos_db`** and click **Next**.
4. Check **Import MySQL Table Objects** (all 14 tables).
5. Click **Execute**, then **Next**, then **Finish**.
6. MySQL Workbench will open the EER Model Diagram canvas showing all tables and relationship connectors:
   - 1:N identifying relationships between `users` and `semesters`, `tasks`, `exams`, `timetable_events`, `study_sessions`, `goals`, `habits`, and `notes`.
   - 1:N cascade between `semesters` -> `subjects` -> `units` -> `topics`.
   - 1:1 relationship between `tasks` and `assignments`.
   - 1:N relationship between `habits` and `habit_logs`.
7. You can export the diagram via **File -> Export -> Export as Image / PDF**.

---

## 6. Helpful SQL Queries for Table Inspection & Testing

### Inspect User Academic Hierarchy
```sql
SELECT 
    u.name AS student,
    s.name AS semester,
    sub.name AS subject,
    sub.code,
    un.name AS unit,
    top.title AS topic,
    top.status,
    top.difficulty
FROM users u
JOIN semesters s ON s.user_id = u.id
JOIN subjects sub ON sub.semester_id = s.id
JOIN units un ON un.subject_id = sub.id
JOIN topics top ON top.unit_id = un.id
WHERE u.email = 'alex.chen@university.edu'
ORDER BY sub.name, un.position, top.position;
```

### Inspect Habit Completion Streaks
```sql
SELECT 
    h.name AS habit_name,
    COUNT(hl.id) AS total_completions,
    MAX(hl.log_date) AS last_completed_date
FROM habits h
LEFT JOIN habit_logs hl ON hl.habit_id = h.id
GROUP BY h.id, h.name;
```

### Inspect Exam Readiness
```sql
SELECT 
    e.title AS exam_name,
    sub.name AS subject,
    e.starts_at,
    TIMESTAMPDIFF(DAY, NOW(), e.starts_at) AS days_remaining,
    e.target_score,
    e.confidence_level
FROM exams e
JOIN subjects sub ON sub.id = e.subject_id
ORDER BY e.starts_at ASC;
```
