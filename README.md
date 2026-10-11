# StudyOS — Student Productivity & Academic Planning Platform

StudyOS is an all-in-one academic productivity platform for college students, combining the best ideas from Notion, Obsidian, Google Calendar, habit trackers, and study analytics.

---

## 🌟 Core Feature Modules

1. **Dashboard**: Greeting, today's schedule, tasks due today, overdue alerts, upcoming exams, assignment deadlines, syllabus progress by course, study focus metrics, habit streak summary, and quick actions.
2. **Planner & Timetable**: Day, Week, and Month calendar views for classes, labs, and dedicated study blocks with conflict/overlap detection and recurrence rules.
3. **Academics & Semester Management**: Hierarchical organization: `User → Semester → Subject → Unit → Topic`. Subject codes, credit ratings, custom colors, and unit reordering.
4. **Syllabus Tracker**: Granular topic learning statuses (`NOT_STARTED`, `LEARNING`, `PRACTICED`, `REVISED`, `MASTERED`) with mathematically transparent weighted progress calculations, difficulty ratings, and time estimates.
5. **Tasks & Assignment Tracker**: List, Kanban, and Table views. Differentiates standard tasks from graded assignments with submission URLs, methods, grades, and instructor feedback.
6. **Exam Center**: Dynamic countdown timer calculated in real time, syllabus readiness breakdown, revision status, past exam paper links, and target score tracking.
7. **Goals & Habit Tracker**: Daily, weekly, and monthly academic goals paired with a 30-day habit completion tracker, streak calculation, and duplicate-prevention logs.
8. **Focus Timer**: Pomodoro, Stopwatch, and Custom modes with work/break intervals, distraction counters, topic linking, and session notes that survive page refreshes.
9. **Notes & Knowledge Base**: Rich Markdown notes with code blocks, formula formatting, tag filters, subject and topic associations, autosave status, and Markdown export.
10. **Analytics Engine**: Real aggregated database metrics: study minutes by day, subject breakdowns, task completion rates, habit consistency, and date-range filtering.
11. **Settings & Data Portability**: Timezone configuration, light/dark theme switching, daily focus goals, and full JSON data backup/export.
12. **Onboarding Wizard**: Guided first-run setup for college information, current semester, initial subjects, and study targets.

---

## 🧱 Architecture & Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts for visual analytics.
- **Backend**: Node.js, Express, TypeScript, REST API (`/api/v1`).
- **Database**:
  - MySQL 8.x schema (`prisma/schema.prisma` & `prisma/migrations/20261011_init/migration.sql`)
  - Integrated persistent storage engine for containerized and local instant execution
  - MySQL Workbench EER diagrams and SQL inspection guides located in `docs/`
- **Security**: Password hashing with bcrypt, JWT authorization, strict user ownership isolation.

---

## 🚀 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Key variables:
```env
PORT=3000
DATABASE_URL="mysql://studyos_user:studyos_password@localhost:3306/studyos_db"
JWT_SECRET="your-secure-jwt-secret-key"
```

### 3. Running Development Server
Start the unified full-stack server (runs both Express REST API on `/api/v1` and Vite frontend on `http://localhost:3000`):
```bash
npm run dev
```

### 4. Database Setup with MySQL 8.x (Optional Local MySQL)
If you have MySQL 8.x installed locally or via Docker:
```bash
# 1. Create database and user
mysql -u root -p < docs/MYSQL_WORKBENCH_GUIDE.md

# 2. Apply Prisma migration
npx prisma migrate deploy

# 3. Inspect in MySQL Workbench:
# Open connection to localhost:3306 with user 'studyos_user' and schema 'studyos_db'
```

---

## 📚 Documentation Links
- [MySQL Workbench Guide](docs/MYSQL_WORKBENCH_GUIDE.md) — Step-by-step connection, SQL scripts, and schema inspection.
- [EER Diagram Specification](docs/EER_DIAGRAM.md) — Entity relationships, foreign key actions, and table cardinality.
- [REST API Specification](docs/API_DOCUMENTATION.md) — Endpoints, request schemas, and responses.

---

## 🧪 Default Test User Credentials
If running with seeded data:
- **Email**: `alex.chen@university.edu`
- **Password**: `Password123!`
- **Role**: Undergraduate Student (Stanford University, CS & Math)
