-- StudyOS Secondary Schema Migration for MySQL 8.x: Collections, Resources, Flashcards, Drive Integrations
-- Engine: InnoDB, Charset: utf8mb4, Collation: utf8mb4_unicode_ci

CREATE TABLE IF NOT EXISTS `collections` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `color` VARCHAR(50) NULL,
  `icon` VARCHAR(50) NULL,
  `subject_id` VARCHAR(36) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `collections_user_id_idx` (`user_id`),
  CONSTRAINT `collections_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `resources` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `subject_id` VARCHAR(36) NULL,
  `topic_id` VARCHAR(36) NULL,
  `collection_id` VARCHAR(36) NULL,
  `type` ENUM('DOCUMENT', 'IMAGE', 'MARKDOWN', 'SPREADSHEET', 'VIDEO', 'PLAYLIST', 'COURSE', 'WEB_LINK', 'DRIVE_FILE', 'ANKI_DECK') NOT NULL,
  `source` ENUM('LOCAL_UPLOAD', 'WEB', 'YOUTUBE', 'UDEMY', 'GOOGLE_DRIVE', 'OBSIDIAN', 'ANKI') NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `url` TEXT NULL,
  `storage_key` VARCHAR(255) NULL,
  `original_filename` VARCHAR(255) NULL,
  `mime_type` VARCHAR(128) NULL,
  `file_size` INT NULL,
  `thumbnail_url` TEXT NULL,
  `tags` VARCHAR(512) NULL DEFAULT '[]',
  `metadata` TEXT NULL,
  `is_pinned` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_favorite` BOOLEAN NOT NULL DEFAULT FALSE,
  `last_accessed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `resources_user_id_idx` (`user_id`),
  KEY `resources_subject_id_idx` (`subject_id`),
  KEY `resources_topic_id_idx` (`topic_id`),
  KEY `resources_collection_id_idx` (`collection_id`),
  CONSTRAINT `resources_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `resources_collection_id_fkey` FOREIGN KEY (`collection_id`) REFERENCES `collections` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `flashcard_decks` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `subject_id` VARCHAR(36) NULL,
  `topic_id` VARCHAR(36) NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `tags` VARCHAR(512) NULL DEFAULT '[]',
  `card_count` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `flashcard_decks_user_id_idx` (`user_id`),
  KEY `flashcard_decks_subject_id_idx` (`subject_id`),
  CONSTRAINT `flashcard_decks_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `flashcards` (
  `id` VARCHAR(36) NOT NULL,
  `deck_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `front` LONGTEXT NOT NULL,
  `back` LONGTEXT NOT NULL,
  `format` ENUM('BASIC', 'REVERSED', 'CLOZE') NOT NULL DEFAULT 'BASIC',
  `interval` INT NOT NULL DEFAULT 1,
  `repetitions` INT NOT NULL DEFAULT 0,
  `ease_factor` DOUBLE NOT NULL DEFAULT 2.5,
  `due_date` DATETIME(3) NOT NULL,
  `last_reviewed_at` DATETIME(3) NULL,
  `state` ENUM('NEW', 'LEARNING', 'REVIEW', 'RELEARNING') NOT NULL DEFAULT 'NEW',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `flashcards_deck_id_idx` (`deck_id`),
  KEY `flashcards_user_id_idx` (`user_id`),
  KEY `flashcards_due_date_idx` (`due_date`),
  CONSTRAINT `flashcards_deck_id_fkey` FOREIGN KEY (`deck_id`) REFERENCES `flashcard_decks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `flashcards_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `flashcard_review_logs` (
  `id` VARCHAR(36) NOT NULL,
  `card_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `rating` INT NOT NULL,
  `previous_interval` INT NOT NULL,
  `new_interval` INT NOT NULL,
  `ease_factor` DOUBLE NOT NULL,
  `reviewed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `flashcard_review_logs_card_id_idx` (`card_id`),
  KEY `flashcard_review_logs_user_id_idx` (`user_id`),
  CONSTRAINT `flashcard_review_logs_card_id_fkey` FOREIGN KEY (`card_id`) REFERENCES `flashcards` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `flashcard_review_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `google_drive_connections` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `google_account_id` VARCHAR(255) NOT NULL,
  `google_email` VARCHAR(255) NULL,
  `encrypted_refresh_token` TEXT NULL,
  `granted_scopes` TEXT NULL,
  `connection_status` VARCHAR(50) NOT NULL DEFAULT 'CONNECTED',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `google_drive_connections_user_id_google_account_id_key` (`user_id`, `google_account_id`),
  KEY `google_drive_connections_user_id_idx` (`user_id`),
  CONSTRAINT `google_drive_connections_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `resource_links` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `provider` VARCHAR(50) NOT NULL DEFAULT 'GOOGLE_DRIVE',
  `external_file_id` VARCHAR(255) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(128) NULL,
  `web_url` TEXT NULL,
  `subject_id` VARCHAR(36) NULL,
  `topic_id` VARCHAR(36) NULL,
  `collection_id` VARCHAR(36) NULL,
  `tags` VARCHAR(512) NULL DEFAULT '[]',
  `description` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `resource_links_user_id_idx` (`user_id`),
  KEY `resource_links_external_file_id_idx` (`external_file_id`),
  KEY `resource_links_subject_id_idx` (`subject_id`),
  KEY `resource_links_topic_id_idx` (`topic_id`),
  CONSTRAINT `resource_links_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
