-- StudyOS Initial Schema Migration for MySQL 8.x
-- Engine: InnoDB, Charset: utf8mb4, Collation: utf8mb4_unicode_ci

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `college` VARCHAR(255) NULL,
  `target_daily_minutes` INT NOT NULL DEFAULT 120,
  `theme` VARCHAR(20) NOT NULL DEFAULT 'dark',
  `timezone` VARCHAR(100) NOT NULL DEFAULT 'UTC',
  `onboarding_completed` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `semesters` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `start_date` DATETIME(3) NOT NULL,
  `end_date` DATETIME(3) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `semesters_user_id_idx` (`user_id`),
  CONSTRAINT `semesters_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `subjects` (
  `id` VARCHAR(36) NOT NULL,
  `semester_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `color` VARCHAR(20) NOT NULL DEFAULT '#10b981',
  `credits` INT NOT NULL DEFAULT 3,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `subjects_semester_id_idx` (`semester_id`),
  CONSTRAINT `subjects_semester_id_fkey` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `units` (
  `id` VARCHAR(36) NOT NULL,
  `subject_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `position` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `units_subject_id_idx` (`subject_id`),
  CONSTRAINT `units_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `topics` (
  `id` VARCHAR(36) NOT NULL,
  `unit_id` VARCHAR(36) NOT NULL,
  `parent_topic_id` VARCHAR(36) NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `status` ENUM('NOT_STARTED', 'LEARNING', 'PRACTICED', 'REVISED', 'MASTERED') NOT NULL DEFAULT 'NOT_STARTED',
  `difficulty` ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL DEFAULT 'MEDIUM',
  `estimated_minutes` INT NOT NULL DEFAULT 60,
  `position` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `topics_unit_id_idx` (`unit_id`),
  KEY `topics_parent_topic_id_idx` (`parent_topic_id`),
  CONSTRAINT `topics_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `topics_parent_topic_id_fkey` FOREIGN KEY (`parent_topic_id`) REFERENCES `topics` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tasks` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `subject_id` VARCHAR(36) NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `status` ENUM('INBOX', 'TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'TODO',
  `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
  `due_at` DATETIME(3) NULL,
  `estimated_minutes` INT NOT NULL DEFAULT 30,
  `completed_at` DATETIME(3) NULL,
  `reference_url` VARCHAR(512) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `tasks_user_id_idx` (`user_id`),
  KEY `tasks_subject_id_idx` (`subject_id`),
  KEY `tasks_status_idx` (`status`),
  KEY `tasks_due_at_idx` (`due_at`),
  CONSTRAINT `tasks_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `tasks_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `assignments` (
  `id` VARCHAR(36) NOT NULL,
  `task_id` VARCHAR(36) NOT NULL,
  `submission_status` ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'GRADED', 'OVERDUE') NOT NULL DEFAULT 'NOT_STARTED',
  `submission_method` VARCHAR(100) NULL DEFAULT 'Online Portal',
  `submission_url` VARCHAR(512) NULL,
  `submitted_at` DATETIME(3) NULL,
  `grade` VARCHAR(50) NULL,
  `feedback` TEXT NULL,
  `instructions` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `assignments_task_id_key` (`task_id`),
  KEY `assignments_submission_status_idx` (`submission_status`),
  CONSTRAINT `assignments_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `subtasks` (
  `id` VARCHAR(36) NOT NULL,
  `task_id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `status` ENUM('TODO', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'TODO',
  `position` INT NOT NULL DEFAULT 0,
  `completed_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `subtasks_task_id_idx` (`task_id`),
  KEY `subtasks_status_idx` (`status`),
  CONSTRAINT `subtasks_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `exams` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `subject_id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `starts_at` DATETIME(3) NOT NULL,
  `location` VARCHAR(255) NULL,
  `exam_type` VARCHAR(50) NOT NULL DEFAULT 'Final',
  `target_score` FLOAT NULL,
  `achieved_score` FLOAT NULL,
  `confidence_level` INT NOT NULL DEFAULT 3,
  `past_papers_url` VARCHAR(512) NULL,
  `reflection_notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `exams_user_id_idx` (`user_id`),
  KEY `exams_subject_id_idx` (`subject_id`),
  KEY `exams_starts_at_idx` (`starts_at`),
  CONSTRAINT `exams_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `exams_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `timetable_events` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `subject_id` VARCHAR(36) NULL,
  `title` VARCHAR(255) NOT NULL,
  `event_type` ENUM('CLASS', 'LAB', 'STUDY_BLOCK', 'TUTORIAL', 'EXAM', 'OTHER') NOT NULL DEFAULT 'CLASS',
  `starts_at` DATETIME(3) NOT NULL,
  `ends_at` DATETIME(3) NOT NULL,
  `recurrence_rule` VARCHAR(255) NULL,
  `location` VARCHAR(255) NULL,
  `color` VARCHAR(20) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `timetable_events_user_id_idx` (`user_id`),
  KEY `timetable_events_subject_id_idx` (`subject_id`),
  KEY `timetable_events_starts_at_idx` (`starts_at`),
  CONSTRAINT `timetable_events_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `timetable_events_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `study_sessions` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `subject_id` VARCHAR(36) NULL,
  `topic_id` VARCHAR(36) NULL,
  `task_id` VARCHAR(36) NULL,
  `started_at` DATETIME(3) NOT NULL,
  `ended_at` DATETIME(3) NULL,
  `duration_seconds` INT NOT NULL DEFAULT 0,
  `session_type` ENUM('POMODORO', 'STOPWATCH', 'CUSTOM') NOT NULL DEFAULT 'POMODORO',
  `notes` TEXT NULL,
  `distractions_count` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `study_sessions_user_id_idx` (`user_id`),
  KEY `study_sessions_subject_id_idx` (`subject_id`),
  KEY `study_sessions_started_at_idx` (`started_at`),
  CONSTRAINT `study_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `study_sessions_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `study_sessions_topic_id_fkey` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `study_sessions_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `goals` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `target_value` FLOAT NOT NULL,
  `current_value` FLOAT NOT NULL DEFAULT 0,
  `unit` VARCHAR(50) NOT NULL DEFAULT 'hours',
  `period` ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'SEMESTER') NOT NULL DEFAULT 'WEEKLY',
  `start_date` DATETIME(3) NOT NULL,
  `end_date` DATETIME(3) NOT NULL,
  `is_completed` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `goals_user_id_idx` (`user_id`),
  CONSTRAINT `goals_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `habits` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `frequency_config` VARCHAR(255) NOT NULL DEFAULT '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]',
  `is_archived` BOOLEAN NOT NULL DEFAULT FALSE,
  `target_per_day` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `habits_user_id_idx` (`user_id`),
  CONSTRAINT `habits_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `habit_logs` (
  `id` VARCHAR(36) NOT NULL,
  `habit_id` VARCHAR(36) NOT NULL,
  `log_date` VARCHAR(10) NOT NULL,
  `completed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `value` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `habit_logs_habit_id_log_date_key` (`habit_id`, `log_date`),
  KEY `habit_logs_habit_id_idx` (`habit_id`),
  KEY `habit_logs_log_date_idx` (`log_date`),
  CONSTRAINT `habit_logs_habit_id_fkey` FOREIGN KEY (`habit_id`) REFERENCES `habits` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notes` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `subject_id` VARCHAR(36) NULL,
  `topic_id` VARCHAR(36) NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `tags` VARCHAR(512) NULL DEFAULT '[]',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `notes_user_id_idx` (`user_id`),
  KEY `notes_subject_id_idx` (`subject_id`),
  KEY `notes_topic_id_idx` (`topic_id`),
  CONSTRAINT `notes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `notes_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `notes_topic_id_fkey` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
