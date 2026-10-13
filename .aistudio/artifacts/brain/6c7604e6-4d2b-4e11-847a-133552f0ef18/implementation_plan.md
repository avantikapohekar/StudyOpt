# Implementation Plan - StudyOS Learning Hub, External Integrations & Knowledge Management

Extending StudyOS with a dedicated **Learning Hub**, comprehensive multi-source resource management (local file uploads, web bookmarks, YouTube, Udemy, Google Drive), enriched Markdown notes with wiki-style backlinks and knowledge graph, Anki-compatible SM-2 flashcards with spaced repetition, and an offline PWA architecture.

---

## 1. User Review Required (Critical Items & Clarified Decisions)

- **Execution Phasing:** Based on your answer, we prioritize **Stage A: Learning Hub with file uploads, document viewers, and web/course bookmarks** first, followed sequentially by Stage B (Notes, Backlinks, Google Drive), Stage C (Flashcards & SM-2 Spaced Repetition), Stage D (PWA & Offline caching), and Stage E (Recurring Reminders & Analytics).
- **File Storage Architecture:** Files will be validated (extension, MIME sniffing, size limit up to 50MB) and stored on local disk inside a secure `uploads/` directory with random UUID storage keys, serving files via authenticated streaming endpoints (`/api/v1/resources/:id/file`) with in-app previews for PDFs, Markdown, images, CSVs, and plain text.
- **Database Schema & Engine:** Keep MySQL 8.x and Prisma schema as the relational schema of record while maintaining seamless compatibility with `server/db.ts` and `data/studyos_data.json` for rapid development and zero runtime breakage.
- **Google Drive Integration:** Implement OAuth 2.0 flow with token handling and provide an interactive Google Drive picker with a connected workspace mode and demo fallback.
- **Spaced Repetition Algorithm:** Standard SuperMemo SM-2 algorithm (matching Anki's interval growth, ease factors 1.30–2.50, review ratings 1–4, lapse handling, and next due calculations).

---

## 2. Proposed Architecture & System Design

```
+----------------------------------------------------------------------------------------------------+
|                                         STUDYOS CLIENT (React 19 SPA)                              |
|                                                                                                    |
|  +--------------------+  +-----------------------------------------------------------------------+  |
|  |     Sidebar        |  |                          Learning Hub View                            |  |
|  |                    |  |  +------------------------------------------------------------------+ |  |
|  |  - Dashboard       |  |  | Sub-navigation: Overview | All Resources | Uploads | Drive       | |  |
|  |  - Learning Hub    |  |  | Bookmarks | Courses | Notes & Graph | Flashcards | Revision Queue| |  |
|  |  - Planner         |  |  +------------------------------------------------------------------+ |  |
|  |  - Academics       |  |  +---------------------+  +--------------------+  +-----------------+ |  |
|  |  - Tasks           |  |  | Universal Add Modal |  | In-App Doc Viewer  |  | Knowledge Graph | |  |
|  |  - Exams           |  |  +---------------------+  +--------------------+  +-----------------+ |  |
|  |  - Habits & Focus  |  |  +---------------------+  +--------------------+  +-----------------+ |  |
|  |  - Notes / Settings|  |  | SM-2 Flashcard Deck |  | Revision Queue     |  | Sync Indicator  | |  |
|  +--------------------+  +--+---------------------+--+--------------------+--+-----------------+-+  |
+----------------------------------------------------------------------------------------------------+
                                                  | REST API (/api/v1)
+----------------------------------------------------------------------------------------------------+
|                                    STUDYOS BACKEND (Node.js / Express)                             |
|                                                                                                    |
|  /api/v1/resources       /api/v1/collections      /api/v1/integrations/google-drive               |
|  /api/v1/notes (backlink)/api/v1/flashcards (SM-2) /api/v1/sync (IndexedDB cache)                  |
|                                                                                                    |
|  +----------------------------------+   +---------------------------------+                        |
|  |   Upload Validator & Storage     |   |   Relational / JSON Data Engine |                        |
|  |   - MIME type verification       |   |   - MySQL Prisma Schema Models  |                        |
|  |   - Safe disk streaming          |   |   - Atomic save to studyos_data |                        |
|  |   - Range request / PDF streaming|   |   - Cascade deletion helpers    |                        |
|  +----------------------------------+   +---------------------------------+                        |
+----------------------------------------------------------------------------------------------------+
```

### A. Extended Relational Data Schema (Prisma & `server/db.ts`)

1. **`Resource` (Learning Hub items):**
   - `id`: UUID
   - `userId`: Foreign key to `User`
   - `subjectId`, `topicId`: Optional links to existing academic structure
   - `collectionId`: Optional organization folder
   - `type`: `DOCUMENT` | `IMAGE` | `MARKDOWN` | `SPREADSHEET` | `VIDEO` | `PLAYLIST` | `COURSE` | `WEB_LINK` | `DRIVE_FILE` | `ANKI_DECK`
   - `source`: `LOCAL_UPLOAD` | `WEB` | `YOUTUBE` | `UDEMY` | `GOOGLE_DRIVE` | `OBSIDIAN` | `ANKI`
   - `title`: String
   - `description`: Text
   - `url`: External URL (or Google Drive view link)
   - `storageKey`: Local filesystem storage key (or S3 key)
   - `mimeType`: String (e.g. `application/pdf`)
   - `fileSize`: Int (bytes)
   - `thumbnailUrl`: Optional preview image URL
   - `tags`: JSON string array `string[]`
   - `metadata`: JSON object (e.g. YouTube duration/videoId, Udemy instructor, Drive fileId)
   - `isPinned`, `isFavorite`: Boolean
   - `lastAccessedAt`: DateTime
   - `createdAt`, `updatedAt`: DateTime

2. **`Collection` (Folders & Subjects groupings):**
   - `id`, `userId`, `name`, `description`, `color`, `icon`, `subjectId`, `createdAt`

3. **`FlashcardDeck` & `Flashcard` (SM-2 Spaced Repetition):**
   - **`FlashcardDeck`**: `id`, `userId`, `subjectId`, `topicId`, `name`, `description`, `tags`, `cardCount`
   - **`Flashcard`**:
     - `id`, `deckId`, `userId`, `front` (question/markdown), `back` (answer/explanation), `format` (`BASIC` | `REVERSED` | `CLOZE`)
     - `interval`: Int (days until next review, initial 1)
     - `repetitions`: Int (consecutive successful reviews)
     - `easeFactor`: Float (initial 2.5, min 1.3)
     - `dueDate`: DateTime (calendar date when card is scheduled)
     - `lastReviewedAt`: DateTime
     - `state`: `NEW` | `LEARNING` | `REVIEW` | `RELEARNING`
   - **`FlashcardReviewLog`**:
     - `id`, `cardId`, `userId`, `rating` (1: Again, 2: Hard, 3: Good, 4: Easy), `previousInterval`, `newInterval`, `easeFactor`, `reviewedAt`

4. **`NoteLink` & Note Backlinks:**
   - Backlink resolution parser matching `[[Note Title]]` or `[[UUID]]`, mapping outgoing and incoming backlinks across notes and syllabus topics.

5. **`GoogleDriveConnection`:**
   - `userId`, `email`, `connectedAt`, `scopes`, `accessToken`, `refreshToken`, `tokenExpiry`

---

## 3. Phased Implementation Plan

### Stage A: Learning Hub Core, File Uploads, Web Resources, Collections (Immediate Priority)

- **Backend:**
  - Create `server/routes/resourceRoutes.ts` with file upload processing (using multipart/busboy or multer-compatible streaming).
  - Validation: Verify extension whitelist (`.pdf`, `.md`, `.txt`, `.csv`, `.docx`, `.pptx`, `.xlsx`, `.png`, `.jpg`, `.jpeg`, `.webp`), sanitize filename, compute size and MIME type.
  - Endpoints:
    - `GET /api/v1/resources` (filtering by source, type, subject, collection, search query, favorites, sorting).
    - `POST /api/v1/resources/upload` (multipart file upload).
    - `POST /api/v1/resources/link` (external URL link for web bookmarks, YouTube video/playlist, Udemy course).
    - `GET /api/v1/resources/:id` & `GET /api/v1/resources/:id/file` (stream file content with appropriate content-type and range headers).
    - `PATCH /api/v1/resources/:id` (rename, update tags, assign to subject/topic/collection).
    - `DELETE /api/v1/resources/:id` (delete resource metadata and remove underlying storage file).
    - `GET /api/v1/collections` & `POST /api/v1/collections`.
- **Frontend:**
  - Create `src/views/LearningHubView.tsx` with high-density academic UI:
    - Overview metrics (Total materials, uploads storage tally, external links, due revisions).
    - Interactive sub-navigation (All Resources, My Uploads, Google Drive, Web Bookmarks, Courses & Playlists, Flashcards, Revision Queue, Knowledge Graph).
    - Search bar, subject filters, resource type chips, tags filter, grid/list view switcher.
    - Universal **"Add Resource"** Modal with tabs:
      1. Upload Document (Drag & drop PDF, Word, Excel, Markdown, Image with live upload progress).
      2. Web Bookmark (Auto-detecting provider, title fetch fallback, tag assignment).
      3. YouTube Video/Playlist (Video ID extractor, timestamp note anchor).
      4. Udemy Course Link.
      5. Connect Google Drive.
  - Implement **In-App Document Viewer Drawer/Modal**:
    - Embedded PDF viewer with page pagination and download link.
    - Markdown rendered preview with GitHub-flavored Markdown.
    - Image lightbox with zoom controls.
    - CSV data preview table.
    - External resource launch button.

### Stage B: Notes Expansion, Backlinks, Knowledge Graph & Google Drive

- **Markdown Notes & Backlinks:**
  - Enhance note editor with split markdown view / live preview, table of contents, and syntax highlighted code blocks.
  - Implement bidirectional wiki-links (`[[Topic]]` and `[[Note Title]]`) parser.
  - Dedicated **Backlinks Drawer** showing referencing notes and unlinked mentions.
  - Interactive **Knowledge Graph** component (SVG/Canvas based force graph rendering notes, syllabus topics, and link edges).
- **Google Drive Integration:**
  - Mount `/api/v1/integrations/google-drive` endpoints.
  - Google Drive file browser modal with folder navigation, file selection, metadata linking, and direct Drive opening.

### Stage C: Anki SM-2 Spaced Repetition Flashcards & Topic Mastery

- **Flashcards Engine:**
  - Implement SM-2 algorithm:
    $$I(1) = 1, \quad I(2) = 6, \quad I(n) = I(n-1) \times EF$$
    $$EF' = EF + (0.1 - (5 - q) \times (0.08 + (5 - q) \times 0.02))$$
  - Daily review queue computation (`dueDate <= today`).
  - Active study session mode (flip card, rate Recall: Again / Hard / Good / Easy with immediate interval preview).
  - Deck management with subject/topic linkage and retention stats.
- **Import/Export:**
  - Obsidian Vault ZIP import/export (parsing folders, Markdown, frontmatter, and wiki-links).
  - Anki deck JSON/APKG import/export previewer and mapper.

### Stage D: PWA & Offline Synchronization

- Configure `manifest.webmanifest` and service worker caching strategy using standard cache-first for static assets and network-first for academic queries.
- Implement IndexedDB local caching for notes, tasks, and syllabus topics with offline banner indicator and conflict-safe replay queue.

### Stage E: Recurring Tasks, Reminders & Advanced Analytics

- Expand task recurrence rules (daily, weekly, monthly, custom days).
- Extend weekly study analytics to aggregate learning resource hours, flashcard recall accuracy, and syllabus topic mastery scores.

---

## 4. Verification & Testing Plan

1. **Upload & Streaming Verification:**
   - Upload sample PDF, Markdown, Image, and CSV files; verify correct storage on disk and successful streaming via `/api/v1/resources/:id/file`.
   - Verify file deletion cleans up both database records and storage files.
2. **Metadata & Resource Linking:**
   - Add YouTube link, Udemy course link, and Web bookmark; verify subject and topic association.
3. **SM-2 Flashcard Engine:**
   - Create cards, complete a review session, verify interval updates and next due dates conform to SM-2 formula.
4. **Applet Compilation & Linting:**
   - Run `compile_applet` and `lint_applet` to ensure zero TypeScript errors.
   - Verify responsive display in both Crisp Light and Dark Studio modes.
