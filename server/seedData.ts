import { dbInstance, TopicRecord } from './db.js';
import { hashPassword } from './auth.js';

export function seedInitialDataIfNeeded() {
  const populateSubtasks = () => {
    if (!dbInstance.db.subtasks) dbInstance.db.subtasks = [];
    if (dbInstance.db.subtasks.length === 0) {
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const nowIso = new Date().toISOString();
      dbInstance.db.subtasks.push(
        {
          id: 'subtask_01',
          taskId: 'task_01',
          title: 'Build priority queue frequency table',
          status: 'COMPLETED',
          position: 1,
          completedAt: yesterday,
          createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
          updatedAt: yesterday,
        },
        {
          id: 'subtask_02',
          taskId: 'task_01',
          title: 'Construct prefix binary tree structure',
          status: 'COMPLETED',
          position: 2,
          completedAt: yesterday,
          createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
          updatedAt: yesterday,
        },
        {
          id: 'subtask_03',
          taskId: 'task_01',
          title: 'Implement bitstream serializer and deserializer',
          status: 'IN_PROGRESS',
          position: 3,
          completedAt: null,
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          updatedAt: nowIso,
        },
        {
          id: 'subtask_04',
          taskId: 'task_01',
          title: 'Run test suite on large binary and corpus files',
          status: 'TODO',
          position: 4,
          completedAt: null,
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          updatedAt: nowIso,
        },
        {
          id: 'subtask_05',
          taskId: 'task_02',
          title: 'Problem 4.1: Compute eigenvalues of symmetric 3x3 matrix',
          status: 'COMPLETED',
          position: 1,
          completedAt: nowIso,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        {
          id: 'subtask_06',
          taskId: 'task_02',
          title: 'Problem 4.3: Orthogonal basis diagonalization proof',
          status: 'IN_PROGRESS',
          position: 2,
          completedAt: null,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        {
          id: 'subtask_07',
          taskId: 'task_02',
          title: 'Problem 4.7: Change of basis transition coordinate check',
          status: 'TODO',
          position: 3,
          completedAt: null,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        {
          id: 'subtask_08',
          taskId: 'task_03',
          title: 'Phase 1: String comparison disassembly analysis',
          status: 'COMPLETED',
          position: 1,
          completedAt: yesterday,
          createdAt: nowIso,
          updatedAt: yesterday,
        },
        {
          id: 'subtask_09',
          taskId: 'task_03',
          title: 'Phase 2: Loop counter assembly walk in GDB',
          status: 'TODO',
          position: 2,
          completedAt: null,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        {
          id: 'subtask_10',
          taskId: 'task_03',
          title: 'Phase 3: Switch jump table target address calculation',
          status: 'TODO',
          position: 3,
          completedAt: null,
          createdAt: nowIso,
          updatedAt: nowIso,
        }
      );
      dbInstance.save();
    }
  };

  const populateLearningHub = () => {
    if (!dbInstance.db.collections) dbInstance.db.collections = [];
    if (!dbInstance.db.resources) dbInstance.db.resources = [];
    if (!dbInstance.db.flashcardDecks) dbInstance.db.flashcardDecks = [];
    if (!dbInstance.db.flashcards) dbInstance.db.flashcards = [];
    if (!dbInstance.db.flashcardReviewLogs) dbInstance.db.flashcardReviewLogs = [];

    const todayIso = new Date().toISOString().split('T')[0];
    const yesterdayIso = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    for (const u of dbInstance.db.users) {
      const userCollections = dbInstance.db.collections.filter(c => c.userId === u.id);
      const userResources = dbInstance.db.resources.filter(r => r.userId === u.id);
      const userDecks = dbInstance.db.flashcardDecks.filter(d => d.userId === u.id);

      // Find subjects for user
      const userSemesters = dbInstance.db.semesters.filter(s => s.userId === u.id).map(s => s.id);
      const userSubjects = dbInstance.db.subjects.filter(s => userSemesters.includes(s.semesterId));
      const sub1 = userSubjects[0]?.id || null;
      const sub2 = userSubjects[1]?.id || null;

      if (userCollections.length === 0) {
        dbInstance.db.collections.push(
          {
            id: `col_01_${u.id}`,
            userId: u.id,
            name: 'Core Textbooks & Lecture Slides',
            description: 'Syllabus textbooks, professor lecture slide decks, and exam reference sheets.',
            color: '#6366f1',
            icon: 'book-open',
            subjectId: sub1,
            createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
          },
          {
            id: `col_02_${u.id}`,
            userId: u.id,
            name: 'Video Lectures & Crash Courses',
            description: 'YouTube playlists, university recordings, and external tutorial modules.',
            color: '#ef4444',
            icon: 'video',
            subjectId: sub2,
            createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
          },
          {
            id: `col_03_${u.id}`,
            userId: u.id,
            name: 'Cheat Sheets & Code Snippets',
            description: 'Quick algorithm templates, mathematical identities, and markdown summaries.',
            color: '#10b981',
            icon: 'code',
            subjectId: null,
            createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          }
        );
      }

      if (userResources.length === 0) {
        dbInstance.db.resources.push(
          {
            id: `res_01_${u.id}`,
            userId: u.id,
            subjectId: sub1,
            topicId: null,
            collectionId: `col_02_${u.id}`,
            type: 'VIDEO',
            source: 'YOUTUBE',
            title: 'MIT 6.006: Introduction to Algorithms - Dynamic Programming & Memoization',
            description: 'Erik Demaine lecture covering subproblem DAGs, memoization vs bottom-up tabulation, Fibonacci, and shortest paths.',
            url: 'https://www.youtube.com/watch?v=OQ5jsBhAv_M',
            storageKey: null,
            originalFilename: null,
            mimeType: null,
            fileSize: 0,
            thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=80',
            tags: JSON.stringify(['algorithms', 'dynamic-programming', 'mit', 'lecture']),
            metadata: JSON.stringify({ videoId: 'OQ5jsBhAv_M', platform: 'YouTube', duration: '51:40' }),
            isPinned: true,
            isFavorite: true,
            lastAccessedAt: new Date().toISOString(),
            createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
          },
          {
            id: `res_02_${u.id}`,
            userId: u.id,
            subjectId: sub2,
            topicId: null,
            collectionId: `col_02_${u.id}`,
            type: 'VIDEO',
            source: 'YOUTUBE',
            title: '3Blue1Brown: Essence of Linear Algebra - Eigenvalues and Eigenvectors',
            description: 'Geometric intuition behind what eigenvectors represent as axes of invariant direction under linear transformation.',
            url: 'https://www.youtube.com/watch?v=PFDu9oVAE-g',
            storageKey: null,
            originalFilename: null,
            mimeType: null,
            fileSize: 0,
            thumbnailUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&q=80',
            tags: JSON.stringify(['math', 'linear-algebra', '3blue1brown', 'visual']),
            metadata: JSON.stringify({ videoId: 'PFDu9oVAE-g', platform: 'YouTube', duration: '17:15' }),
            isPinned: true,
            isFavorite: false,
            lastAccessedAt: new Date().toISOString(),
            createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          },
          {
            id: `res_03_${u.id}`,
            userId: u.id,
            subjectId: sub1,
            topicId: null,
            collectionId: `col_03_${u.id}`,
            type: 'WEB_LINK',
            source: 'WEB',
            title: "GeeksforGeeks: Dijkstra's Shortest Path Algorithm Complexity & Heap Implementation",
            description: 'Complete breakdown of adjacency list + min-heap implementation achieving O((V + E) log V) runtime.',
            url: 'https://www.geeksforgeeks.org/dijkstras-shortest-path-algorithm-greedy-algo-7/',
            storageKey: null,
            originalFilename: null,
            mimeType: null,
            fileSize: 0,
            thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&q=80',
            tags: JSON.stringify(['graphs', 'dijkstra', 'greedy', 'c++']),
            metadata: JSON.stringify({ domain: 'geeksforgeeks.org', readTime: '8 min' }),
            isPinned: false,
            isFavorite: true,
            lastAccessedAt: new Date().toISOString(),
            createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          },
          {
            id: `res_04_${u.id}`,
            userId: u.id,
            subjectId: sub1,
            topicId: null,
            collectionId: `col_01_${u.id}`,
            type: 'DRIVE_FILE',
            source: 'GOOGLE_DRIVE',
            title: 'CS301 Algorithm Analysis - Lecture Notes & Proofs.pdf',
            description: 'Formal proofs for master theorem cases, amortized analysis potential method, and graph coloring NP-hardness.',
            url: 'https://drive.google.com/file/d/sample-algo-proofs/view',
            storageKey: null,
            originalFilename: 'CS301 Algorithm Analysis - Lecture Notes & Proofs.pdf',
            mimeType: 'application/pdf',
            fileSize: 4280000,
            thumbnailUrl: 'https://ssl.gstatic.com/docs/doclist/images/icon_10_pdf_list.png',
            tags: JSON.stringify(['google-drive', 'pdf', 'proofs', 'midterm']),
            metadata: JSON.stringify({ driveFileId: 'drive-doc-001', syncStatus: 'synced' }),
            isPinned: false,
            isFavorite: false,
            lastAccessedAt: new Date().toISOString(),
            createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          },
          {
            id: `res_05_${u.id}`,
            userId: u.id,
            subjectId: sub1,
            topicId: null,
            collectionId: `col_03_${u.id}`,
            type: 'MARKDOWN',
            source: 'OBSIDIAN',
            title: 'Algorithmic Complexity & Big-O Master Reference.md',
            description: 'Comprehensive table comparing best, average, and worst cases for sorting, search trees, hashing, and priority queues.',
            url: null,
            storageKey: null,
            originalFilename: 'Algorithmic Complexity & Big-O Master Reference.md',
            mimeType: 'text/markdown',
            fileSize: 18450,
            thumbnailUrl: null,
            tags: JSON.stringify(['cheat-sheet', 'big-o', 'sorting', 'data-structures']),
            metadata: JSON.stringify({ noteLinked: true, author: 'Alex Chen' }),
            isPinned: true,
            isFavorite: true,
            lastAccessedAt: new Date().toISOString(),
            createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          }
        );
      }

      if (userDecks.length === 0) {
        const deck1Id = `deck_01_${u.id}`;
        const deck2Id = `deck_02_${u.id}`;

        dbInstance.db.flashcardDecks.push(
          {
            id: deck1Id,
            userId: u.id,
            subjectId: sub1,
            topicId: null,
            name: 'Data Structures & Algorithmic Complexities',
            description: 'High-yield Anki deck reviewing asymptopia, tree rotations, hash collisions, and graph traversal guarantees.',
            tags: JSON.stringify(['algorithms', 'data-structures']),
            cardCount: 4,
            createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: deck2Id,
            userId: u.id,
            subjectId: sub2,
            topicId: null,
            name: 'Linear Algebra: Eigenvalues & Diagonalization',
            description: 'Key theorems, characteristic polynomial roots, algebraic vs geometric multiplicity, and matrix powers.',
            tags: JSON.stringify(['math', 'linear-algebra', 'midterm']),
            cardCount: 3,
            createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
            updatedAt: new Date().toISOString(),
          }
        );

        dbInstance.db.flashcards.push(
          {
            id: `card_01_${u.id}`,
            deckId: deck1Id,
            userId: u.id,
            front: 'What is the worst-case and average-case time complexity of finding an element in a Red-Black Tree with $N$ nodes?',
            back: '**Worst-case:** $O(\\log N)$\n**Average-case:** $O(\\log N)$\n\n*Why:* A Red-Black tree guarantees that the longest path from root to leaf is no more than twice the shortest path, maintaining strict logarithmic balance.',
            format: 'BASIC',
            interval: 1,
            repetitions: 1,
            easeFactor: 2.5,
            dueDate: todayIso,
            lastReviewedAt: yesterdayIso,
            state: 'REVIEW',
            createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: `card_02_${u.id}`,
            deckId: deck1Id,
            userId: u.id,
            front: "State the time complexity of Dijkstra's algorithm implemented with an adjacency list and a Binary Min-Heap.",
            back: '$$O((V + E) \\log V)$$\n\n- Extract-Min is called $V$ times: $O(V \\log V)$\n- Decrease-Key is called at most $E$ times: $O(E \\log V)$',
            format: 'BASIC',
            interval: 3,
            repetitions: 2,
            easeFactor: 2.5,
            dueDate: todayIso,
            lastReviewedAt: yesterdayIso,
            state: 'REVIEW',
            createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: `card_03_${u.id}`,
            deckId: deck1Id,
            userId: u.id,
            front: 'What is the master theorem condition and solution for $T(n) = 2T(n/2) + O(n)$?',
            back: 'Here $a = 2, b = 2, \\log_b a = \\log_2 2 = 1$.\n$f(n) = O(n) = \\Theta(n^1) = \\Theta(n^{\\log_b a})$.\n\nBy Case 2 of the Master Theorem:\n$$T(n) = \\Theta(n \\log n)$$',
            format: 'BASIC',
            interval: 6,
            repetitions: 3,
            easeFactor: 2.6,
            dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
            lastReviewedAt: yesterdayIso,
            state: 'REVIEW',
            createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: `card_04_${u.id}`,
            deckId: deck1Id,
            userId: u.id,
            front: 'Explain the difference between Prim\'s algorithm and Kruskal\'s algorithm for Minimum Spanning Trees.',
            back: '- **Prim\'s**: Grows a single tree starting from an arbitrary vertex using a priority queue of cut edges.\n- **Kruskal\'s**: Sorts all edges globally by weight and adds edges if they don\'t form a cycle using a **Disjoint Set (Union-Find)** data structure.',
            format: 'BASIC',
            interval: 0,
            repetitions: 0,
            easeFactor: 2.5,
            dueDate: todayIso,
            lastReviewedAt: null,
            state: 'NEW',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: `card_05_${u.id}`,
            deckId: deck2Id,
            userId: u.id,
            front: 'Under what condition is an $n \\times n$ matrix $A$ diagonalizable?',
            back: 'Matrix $A$ is diagonalizable if and only if it has **$n$ linearly independent eigenvectors**.\n\nEquivalently, for every eigenvalue $\\lambda_i$, the geometric multiplicity equals the algebraic multiplicity.',
            format: 'BASIC',
            interval: 1,
            repetitions: 1,
            easeFactor: 2.5,
            dueDate: todayIso,
            lastReviewedAt: yesterdayIso,
            state: 'REVIEW',
            createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
            updatedAt: new Date().toISOString(),
          }
        );
      }
    }

    dbInstance.save();
  };

  if (dbInstance.db.users.length > 0) {
    populateSubtasks();
    populateLearningHub();
    return; // Already seeded or has data
  }

  console.log('Seeding StudyOS initial academic data...');

  const now = new Date();
  const userId = 'usr_alex_chen_01';
  const semesterId = 'sem_fall_2026_01';

  // 1. User
  const defaultPasswordHash = hashPassword('Password123!');
  dbInstance.db.users.push({
    id: userId,
    email: 'alex.chen@university.edu',
    name: 'Alex Chen',
    passwordHash: defaultPasswordHash,
    college: 'Stanford University',
    targetDailyMinutes: 180,
    theme: 'dark',
    timezone: 'America/Los_Angeles',
    onboardingCompleted: true,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: now.toISOString(),
  });

  // 2. Active Semester
  dbInstance.db.semesters.push({
    id: semesterId,
    userId,
    name: 'Fall Semester 2026',
    startDate: new Date(2026, 8, 1).toISOString(), // Sept 1
    endDate: new Date(2026, 11, 20).toISOString(), // Dec 20
    isActive: true,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: now.toISOString(),
  });

  // 3. Subjects
  const subCS106B = 'sub_cs106b_01';
  const subMATH51 = 'sub_math51_01';
  const subCS107 = 'sub_cs107_01';
  const subPHIL150 = 'sub_phil150_01';

  dbInstance.db.subjects.push(
    {
      id: subCS106B,
      semesterId,
      name: 'Programming Abstractions & Data Structures',
      code: 'CS 106B',
      color: '#10b981', // emerald
      credits: 4,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: subMATH51,
      semesterId,
      name: 'Linear Algebra & Multivariable Calculus',
      code: 'MATH 51',
      color: '#3b82f6', // blue
      credits: 5,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: subCS107,
      semesterId,
      name: 'Computer Organization & Systems',
      code: 'CS 107',
      color: '#8b5cf6', // purple
      credits: 4,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: subPHIL150,
      semesterId,
      name: 'Ethics, Public Policy & Technology',
      code: 'PHIL 150',
      color: '#f59e0b', // amber
      credits: 3,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: now.toISOString(),
    }
  );

  // 4. Units & Topics for CS 106B
  const unitCS1 = 'unit_cs_01';
  const unitCS2 = 'unit_cs_02';
  const unitCS3 = 'unit_cs_03';
  const unitCS4 = 'unit_cs_04';

  dbInstance.db.units.push(
    { id: unitCS1, subjectId: subCS106B, name: 'Unit 1: Recursion & Backtracking', position: 1, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: unitCS2, subjectId: subCS106B, name: 'Unit 2: Pointer Memory & Linked Lists', position: 2, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: unitCS3, subjectId: subCS106B, name: 'Unit 3: Trees & Binary Search', position: 3, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: unitCS4, subjectId: subCS106B, name: 'Unit 4: Graphs & Priority Queues', position: 4, createdAt: now.toISOString(), updatedAt: now.toISOString() }
  );

  dbInstance.db.topics.push(
    { id: 'top_cs_01', unitId: unitCS1, title: 'Recursive Base Cases & Call Stacks', description: 'Understanding memory activation records during deep recursive calls', status: 'MASTERED', difficulty: 'EASY', estimatedMinutes: 45, position: 1, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: 'top_cs_02', unitId: unitCS1, title: 'Recursive Backtracking & Pruning', description: 'Generating subsets, permutations, and puzzle solvers with tree pruning', status: 'REVISED', difficulty: 'HARD', estimatedMinutes: 90, position: 2, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: 'top_cs_03', unitId: unitCS2, title: 'Dynamic Allocation & Heap vs Stack', description: 'Manual malloc/free and new/delete patterns in C++', status: 'PRACTICED', difficulty: 'MEDIUM', estimatedMinutes: 60, position: 1, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: 'top_cs_04', unitId: unitCS2, title: 'Linked List Traversal & Splicing', description: 'Handling head and tail edges, double pointers, and list reversal', status: 'PRACTICED', difficulty: 'MEDIUM', estimatedMinutes: 75, position: 2, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: 'top_cs_05', unitId: unitCS3, title: 'Binary Search Tree Operations', description: 'BST invariant, insert, remove, in-order/pre-order traversal', status: 'LEARNING', difficulty: 'MEDIUM', estimatedMinutes: 80, position: 1, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: 'top_cs_06', unitId: unitCS3, title: 'Balanced Trees (AVL & Red-Black)', description: 'Tree rotations, balance factor validation, log(N) guarantees', status: 'NOT_STARTED', difficulty: 'HARD', estimatedMinutes: 120, position: 2, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: 'top_cs_07', unitId: unitCS4, title: 'Breadth-First and Depth-First Search', description: 'Graph representations using adjacency lists and BFS queue traversal', status: 'NOT_STARTED', difficulty: 'MEDIUM', estimatedMinutes: 90, position: 1, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: 'top_cs_08', unitId: unitCS4, title: 'Dijkstra and A* Shortest Paths', description: 'Priority queues with Euclidean heuristic estimation', status: 'NOT_STARTED', difficulty: 'HARD', estimatedMinutes: 110, position: 2, createdAt: now.toISOString(), updatedAt: now.toISOString() }
  );

  // Units & Topics for MATH 51
  const unitMath1 = 'unit_math_01';
  const unitMath2 = 'unit_math_02';

  dbInstance.db.units.push(
    { id: unitMath1, subjectId: subMATH51, name: 'Unit 1: Vector Spaces & Linear Transforms', position: 1, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: unitMath2, subjectId: subMATH51, name: 'Unit 2: Eigenvalues & Matrix Decompositions', position: 2, createdAt: now.toISOString(), updatedAt: now.toISOString() }
  );

  dbInstance.db.topics.push(
    { id: 'top_math_01', unitId: unitMath1, title: 'Subspaces, Span, and Basis', description: 'Determining linear independence and dimension of column spaces', status: 'MASTERED', difficulty: 'MEDIUM', estimatedMinutes: 60, position: 1, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: 'top_math_02', unitId: unitMath1, title: 'Orthogonal Projections & Gram-Schmidt', description: 'Calculating projections onto subspaces and orthonormal bases', status: 'REVISED', difficulty: 'MEDIUM', estimatedMinutes: 70, position: 2, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: 'top_math_03', unitId: unitMath2, title: 'Characteristic Polynomial & Eigenvectors', description: 'Solving det(A - lambda*I) = 0 and finding eigenspaces', status: 'LEARNING', difficulty: 'HARD', estimatedMinutes: 90, position: 1, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: 'top_math_04', unitId: unitMath2, title: 'Singular Value Decomposition (SVD)', description: 'Geometric interpretation of singular values and pseudoinverse', status: 'NOT_STARTED', difficulty: 'HARD', estimatedMinutes: 120, position: 2, createdAt: now.toISOString(), updatedAt: now.toISOString() }
  );

  // 5. Tasks and Assignments
  const task1 = 'task_01';
  const task2 = 'task_02';
  const task3 = 'task_03';
  const task4 = 'task_04';
  const task5 = 'task_05';

  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  const threeDaysLater = new Date(Date.now() + 3 * 86400000).toISOString();
  const fiveDaysLater = new Date(Date.now() + 5 * 86400000).toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();

  dbInstance.db.tasks.push(
    {
      id: task1,
      userId,
      subjectId: subCS106B,
      title: 'Problem Set 4: Huffman Encoding and Trees',
      description: 'Implement priority queue based frequency map, binary tree builder, and bitstream compression serializer.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueAt: threeDaysLater,
      estimatedMinutes: 240,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: task2,
      userId,
      subjectId: subMATH51,
      title: 'Homework 6: Eigenspace Proofs & Diagonalization',
      description: 'Questions 4.1 through 4.7 in Strangs Linear Algebra textbook.',
      status: 'TODO',
      priority: 'HIGH',
      dueAt: tomorrow,
      estimatedMinutes: 120,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: task3,
      userId,
      subjectId: subCS107,
      title: 'Lab 3: Binary Bomb Defusal & Assembly Inspection',
      description: 'Analyze x86-64 assembly instructions using GDB and disassembler tools.',
      status: 'TODO',
      priority: 'URGENT',
      dueAt: fiveDaysLater,
      estimatedMinutes: 180,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: task4,
      userId,
      subjectId: subPHIL150,
      title: 'Short Essay: Algorithmic Accountability and Privacy',
      description: '1,500-word critical evaluation of differential privacy policies.',
      status: 'COMPLETED',
      priority: 'MEDIUM',
      dueAt: yesterday,
      estimatedMinutes: 150,
      completedAt: yesterday,
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      updatedAt: yesterday,
    },
    {
      id: task5,
      userId,
      subjectId: subCS106B,
      title: 'Review Lecture 12 Slides: Tree Balancing Mechanics',
      description: 'Review left-right rotations and AVL height updates prior to discussion section.',
      status: 'TODO',
      priority: 'MEDIUM',
      dueAt: tomorrow,
      estimatedMinutes: 45,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
  );

  // Link assignments for tasks 1, 2, and 4
  dbInstance.db.assignments.push(
    {
      id: 'asg_01',
      taskId: task1,
      submissionStatus: 'IN_PROGRESS',
      submissionMethod: 'Paperless Portal',
      submissionUrl: 'https://paperless.stanford.edu/assignments/ps4',
      instructions: 'Submit zip containing Huffman.cpp and test suite files.',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: 'asg_02',
      taskId: task2,
      submissionStatus: 'NOT_STARTED',
      submissionMethod: 'Gradescope',
      submissionUrl: 'https://gradescope.com/courses/51/hw6',
      instructions: 'Upload scanned PDF with page tags.',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: 'asg_04',
      taskId: task4,
      submissionStatus: 'GRADED',
      submissionMethod: 'Canvas',
      submissionUrl: 'https://canvas.stanford.edu/submissions/essay1',
      submittedAt: yesterday,
      grade: '96/100 (A)',
      feedback: 'Excellent synthesis of the surveillance capitalism arguments and technical definitions of epsilon.',
      instructions: 'Upload Word or PDF document with citations.',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      updatedAt: yesterday,
    }
  );

  // 5b. Nested Subtasks for Tasks
  if (!dbInstance.db.subtasks) {
    dbInstance.db.subtasks = [];
  }
  dbInstance.db.subtasks.push(
    // Subtasks for task1 (Huffman)
    {
      id: 'subtask_01',
      taskId: task1,
      title: 'Build priority queue frequency table',
      status: 'COMPLETED',
      position: 1,
      completedAt: yesterday,
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      updatedAt: yesterday,
    },
    {
      id: 'subtask_02',
      taskId: task1,
      title: 'Construct prefix binary tree structure',
      status: 'COMPLETED',
      position: 2,
      completedAt: yesterday,
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      updatedAt: yesterday,
    },
    {
      id: 'subtask_03',
      taskId: task1,
      title: 'Implement bitstream serializer and deserializer',
      status: 'IN_PROGRESS',
      position: 3,
      completedAt: null,
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: 'subtask_04',
      taskId: task1,
      title: 'Run test suite on large binary and corpus files',
      status: 'TODO',
      position: 4,
      completedAt: null,
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: now.toISOString(),
    },
    // Subtasks for task2 (MATH 51 Homework 6)
    {
      id: 'subtask_05',
      taskId: task2,
      title: 'Problem 4.1: Compute eigenvalues of symmetric 3x3 matrix',
      status: 'COMPLETED',
      position: 1,
      completedAt: now.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: 'subtask_06',
      taskId: task2,
      title: 'Problem 4.3: Orthogonal basis diagonalization proof',
      status: 'IN_PROGRESS',
      position: 2,
      completedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: 'subtask_07',
      taskId: task2,
      title: 'Problem 4.7: Change of basis transition coordinate check',
      status: 'TODO',
      position: 3,
      completedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    // Subtasks for task3 (CS 107 Lab 3)
    {
      id: 'subtask_08',
      taskId: task3,
      title: 'Phase 1: String comparison disassembly analysis',
      status: 'COMPLETED',
      position: 1,
      completedAt: yesterday,
      createdAt: now.toISOString(),
      updatedAt: yesterday,
    },
    {
      id: 'subtask_09',
      taskId: task3,
      title: 'Phase 2: Loop counter assembly walk in GDB',
      status: 'TODO',
      position: 2,
      completedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: 'subtask_10',
      taskId: task3,
      title: 'Phase 3: Switch jump table target address calculation',
      status: 'TODO',
      position: 3,
      completedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
  );

  // 6. Upcoming Exams
  dbInstance.db.exams.push(
    {
      id: 'exam_01',
      userId,
      subjectId: subCS106B,
      title: 'CS 106B Midterm Examination',
      startsAt: new Date(Date.now() + 12 * 86400000).toISOString(), // 12 days out
      location: 'Hewlett 200 Auditorium',
      examType: 'Midterm',
      targetScore: 92,
      confidenceLevel: 4,
      pastPapersUrl: 'https://web.stanford.edu/class/cs106b/handouts/practice-exams',
      reflectionNotes: 'Focus on recursive puzzle backtracking and linked list node manipulation under time pressure.',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: 'exam_02',
      userId,
      subjectId: subMATH51,
      title: 'MATH 51 Midterm 2',
      startsAt: new Date(Date.now() + 18 * 86400000).toISOString(),
      location: 'Bishop Auditorium',
      examType: 'Midterm',
      targetScore: 90,
      confidenceLevel: 3,
      pastPapersUrl: 'https://math51.stanford.edu/midterm-archive',
      reflectionNotes: 'Need more practice with change of basis matrix transformations and orthogonality proofs.',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
  );

  // 7. Timetable Events (Recurring schedule + Study blocks)
  const todayStr = now.toISOString().split('T')[0];
  dbInstance.db.timetableEvents.push(
    {
      id: 'event_01',
      userId,
      subjectId: subCS106B,
      title: 'CS 106B Lecture: Tree Balancing',
      eventType: 'CLASS',
      startsAt: `${todayStr}T10:00:00.000Z`,
      endsAt: `${todayStr}T11:20:00.000Z`,
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      location: 'NVIDIA Auditorium',
      color: '#10b981',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: 'event_02',
      userId,
      subjectId: subMATH51,
      title: 'MATH 51 Lecture: Eigenvalues',
      eventType: 'CLASS',
      startsAt: `${todayStr}T13:30:00.000Z`,
      endsAt: `${todayStr}T14:50:00.000Z`,
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=TU,TH',
      location: 'Skilling Auditorium',
      color: '#3b82f6',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: 'event_03',
      userId,
      subjectId: subCS107,
      title: 'CS 107 Systems Lab Session',
      eventType: 'LAB',
      startsAt: `${todayStr}T16:00:00.000Z`,
      endsAt: `${todayStr}T17:50:00.000Z`,
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=WE',
      location: 'Gates B02 Computer Lab',
      color: '#8b5cf6',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: 'event_04',
      userId,
      subjectId: subCS106B,
      title: 'Deep Focus Block: PSet 4 Trees',
      eventType: 'STUDY_BLOCK',
      startsAt: `${todayStr}T19:00:00.000Z`,
      endsAt: `${todayStr}T21:00:00.000Z`,
      location: 'Green Library 2nd Floor',
      color: '#10b981',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
  );

  // 8. Study Sessions (Past focus history)
  const sessionDays = [1, 2, 3, 4, 5, 6, 7];
  sessionDays.forEach((dayAgo, idx) => {
    const sDate = new Date(Date.now() - dayAgo * 86400000);
    const duration = [3000, 4500, 3600, 5400, 2700, 4800, 3600][idx]; // 45 to 90 mins
    dbInstance.db.studySessions.push({
      id: `ss_hist_${idx + 1}`,
      userId,
      subjectId: [subCS106B, subMATH51, subCS107, subCS106B, subPHIL150, subMATH51, subCS106B][idx],
      topicId: 'top_cs_03',
      taskId: task1,
      startedAt: new Date(sDate.getTime() - duration * 1000).toISOString(),
      endedAt: sDate.toISOString(),
      durationSeconds: duration,
      sessionType: 'POMODORO',
      notes: `Focus block on problem sets. Reviewed key concepts and test suites.`,
      distractionsCount: idx % 2 === 0 ? 0 : 1,
      createdAt: sDate.toISOString(),
      updatedAt: sDate.toISOString(),
    });
  });

  // Today study session
  dbInstance.db.studySessions.push({
    id: 'ss_today_01',
    userId,
    subjectId: subCS106B,
    topicId: 'top_cs_05',
    taskId: task1,
    startedAt: new Date(Date.now() - 40 * 60000).toISOString(),
    endedAt: new Date(Date.now() - 10 * 60000).toISOString(),
    durationSeconds: 1800, // 30 minutes
    sessionType: 'POMODORO',
    notes: 'Completed initial BST node struct and recursive search routine.',
    distractionsCount: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });

  // 9. Goals
  dbInstance.db.goals.push(
    {
      id: 'goal_01',
      userId,
      title: 'Weekly Study Focus Target',
      description: 'Maintain minimum 20 focused study hours across all engineering subjects.',
      targetValue: 20,
      currentValue: 14.5,
      unit: 'hours',
      period: 'WEEKLY',
      startDate: new Date(Date.now() - 4 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 3 * 86400000).toISOString(),
      isCompleted: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: 'goal_02',
      userId,
      title: 'CS 106B Syllabus Mastery',
      description: 'Master at least 70% of total curriculum topics before the Midterm.',
      targetValue: 70,
      currentValue: 50,
      unit: '% mastered',
      period: 'MONTHLY',
      startDate: new Date(Date.now() - 20 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 10 * 86400000).toISOString(),
      isCompleted: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
  );

  // 10. Habits & 14-day Habit Logs
  const habit1 = 'hab_01';
  const habit2 = 'hab_02';
  const habit3 = 'hab_03';
  const habit4 = 'hab_04';

  dbInstance.db.habits.push(
    {
      id: habit1,
      userId,
      name: 'Morning Deep Work Block (90m)',
      description: 'Uninterrupted study before 11 AM with phone locked away.',
      frequencyConfig: JSON.stringify(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']),
      isArchived: false,
      targetPerDay: 1,
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: habit2,
      userId,
      name: 'Daily Spaced Repetition (Anki Flashcards)',
      description: 'Review formulas, time complexities, and definitions.',
      frequencyConfig: JSON.stringify(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
      isArchived: false,
      targetPerDay: 1,
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: habit3,
      userId,
      name: 'Lecture Slide Post-Review within 24h',
      description: 'Summarize key theorem or algorithm from today’s lectures into StudyOS notes.',
      frequencyConfig: JSON.stringify(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']),
      isArchived: false,
      targetPerDay: 1,
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: habit4,
      userId,
      name: 'Problem Set Deliberate Practice (1 Problem)',
      description: 'Solve at least one textbook or previous exam problem without looking at solutions.',
      frequencyConfig: JSON.stringify(['Mon', 'Wed', 'Fri', 'Sun']),
      isArchived: false,
      targetPerDay: 1,
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      updatedAt: now.toISOString(),
    }
  );

  // Generate 14-day logs for habits
  for (let i = 0; i < 14; i++) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    
    // habit 1 (high consistency except weekends)
    if (d.getDay() !== 0 && d.getDay() !== 6 && i !== 3) {
      dbInstance.db.habitLogs.push({
        id: `hl_1_${dateStr}`,
        habitId: habit1,
        logDate: dateStr,
        completedAt: d.toISOString(),
        value: 1,
        createdAt: d.toISOString(),
        updatedAt: d.toISOString(),
      });
    }

    // habit 2 (high streak)
    if (i !== 7) {
      dbInstance.db.habitLogs.push({
        id: `hl_2_${dateStr}`,
        habitId: habit2,
        logDate: dateStr,
        completedAt: d.toISOString(),
        value: 1,
        createdAt: d.toISOString(),
        updatedAt: d.toISOString(),
      });
    }

    // habit 3
    if (i % 2 === 0) {
      dbInstance.db.habitLogs.push({
        id: `hl_3_${dateStr}`,
        habitId: habit3,
        logDate: dateStr,
        completedAt: d.toISOString(),
        value: 1,
        createdAt: d.toISOString(),
        updatedAt: d.toISOString(),
      });
    }
  }

  // 11. Notes
  dbInstance.db.notes.push(
    {
      id: 'note_01',
      userId,
      subjectId: subCS106B,
      topicId: 'top_cs_02',
      title: 'Backtracking Recursion Pattern Guide',
      content: `# Recursive Backtracking Template

Backtracking is systematically searching a state space with early pruning of illegal paths.

\`\`\`cpp
bool solve(State& state) {
    if (isGoal(state)) {
        return true;
    }
    for (Choice choice : getAllChoices(state)) {
        if (isValid(choice, state)) {
            applyChoice(choice, state);
            if (solve(state)) {
                return true;
            }
            undoChoice(choice, state); // Critical backtrack step
        }
    }
    return false;
}
\`\`\`

### Invariants to Maintain
1. State must be perfectly restored in \`undoChoice\`.
2. Base case must be checked before generating choices.
3. Pruning: If \`heuristic(state)\` guarantees impossibility, return false immediately.`,
      tags: JSON.stringify(['algorithms', 'recursion', 'cpp', 'midterm']),
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    {
      id: 'note_02',
      userId,
      subjectId: subMATH51,
      topicId: 'top_math_03',
      title: 'Eigenvalues & Diagonalization Summary',
      content: `# Eigenvalues and Matrix Powers

An eigenvector of an $n \\times n$ matrix $A$ is a nonzero vector $v$ such that:
$$A v = \\lambda v$$

### Steps for Diagonalization
1. Compute the characteristic polynomial $\\det(A - \\lambda I) = 0$.
2. Find eigenvalues $\\lambda_1, \\lambda_2, \\dots, \\lambda_n$.
3. For each eigenvalue, find the null space of $(A - \\lambda_i I)$ to get the eigenvectors.
4. If there are $n$ linearly independent eigenvectors, form matrix $P = [v_1, v_2, \\dots, v_n]$ and diagonal matrix $D$:
   $$A = P D P^{-1} \\implies A^k = P D^k P^{-1}$$`,
      tags: JSON.stringify(['math', 'linear-algebra', 'eigenvalues', 'theorems']),
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    }
  );

  // Populate Collections, Resources, and Flashcard Decks if empty
  if (!dbInstance.db.collections) dbInstance.db.collections = [];
  if (!dbInstance.db.resources) dbInstance.db.resources = [];
  if (!dbInstance.db.flashcardDecks) dbInstance.db.flashcardDecks = [];
  if (!dbInstance.db.flashcards) dbInstance.db.flashcards = [];
  if (!dbInstance.db.flashcardReviewLogs) dbInstance.db.flashcardReviewLogs = [];

  const todayIso = new Date().toISOString().split('T')[0];
  const yesterdayIso = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (dbInstance.db.collections.length === 0) {
    dbInstance.db.collections.push(
      {
        id: 'col_01',
        userId,
        name: 'Core Textbooks & Lecture Slides',
        description: 'Syllabus textbooks, professor lecture slide decks, and exam reference sheets.',
        color: '#6366f1',
        icon: 'book-open',
        subjectId: subCS106B,
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
      {
        id: 'col_02',
        userId,
        name: 'Video Lectures & Crash Courses',
        description: 'YouTube playlists, university recordings, and external tutorial modules.',
        color: '#ef4444',
        icon: 'video',
        subjectId: subMATH51,
        createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      },
      {
        id: 'col_03',
        userId,
        name: 'Cheat Sheets & Code Snippets',
        description: 'Quick algorithm templates, mathematical identities, and markdown summaries.',
        color: '#10b981',
        icon: 'code',
        subjectId: null,
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      }
    );
  }

  if (dbInstance.db.resources.length === 0) {
    dbInstance.db.resources.push(
      {
        id: 'res_01',
        userId,
        subjectId: subCS106B,
        topicId: 'top_cs_01',
        collectionId: 'col_02',
        type: 'VIDEO',
        source: 'YOUTUBE',
        title: 'MIT 6.006: Introduction to Algorithms - Dynamic Programming & Memoization',
        description: 'Erik Demaine lecture covering subproblem DAGs, memoization vs bottom-up tabulation, Fibonacci, and shortest paths.',
        url: 'https://www.youtube.com/watch?v=OQ5jsBhAv_M',
        storageKey: null,
        originalFilename: null,
        mimeType: null,
        fileSize: 0,
        thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=80',
        tags: JSON.stringify(['algorithms', 'dynamic-programming', 'mit', 'lecture']),
        metadata: JSON.stringify({ videoId: 'OQ5jsBhAv_M', platform: 'YouTube', duration: '51:40' }),
        isPinned: true,
        isFavorite: true,
        lastAccessedAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      },
      {
        id: 'res_02',
        userId,
        subjectId: subMATH51,
        topicId: 'top_math_03',
        collectionId: 'col_02',
        type: 'VIDEO',
        source: 'YOUTUBE',
        title: '3Blue1Brown: Essence of Linear Algebra - Eigenvalues and Eigenvectors',
        description: 'Geometric intuition behind what eigenvectors represent as axes of invariant direction under linear transformation.',
        url: 'https://www.youtube.com/watch?v=PFDu9oVAE-g',
        storageKey: null,
        originalFilename: null,
        mimeType: null,
        fileSize: 0,
        thumbnailUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&q=80',
        tags: JSON.stringify(['math', 'linear-algebra', '3blue1brown', 'visual']),
        metadata: JSON.stringify({ videoId: 'PFDu9oVAE-g', platform: 'YouTube', duration: '17:15' }),
        isPinned: true,
        isFavorite: false,
        lastAccessedAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        id: 'res_03',
        userId,
        subjectId: subCS106B,
        topicId: 'top_cs_02',
        collectionId: 'col_03',
        type: 'WEB_LINK',
        source: 'WEB',
        title: "GeeksforGeeks: Dijkstra's Shortest Path Algorithm Complexity & Heap Implementation",
        description: 'Complete breakdown of adjacency list + min-heap implementation achieving O((V + E) log V) runtime.',
        url: 'https://www.geeksforgeeks.org/dijkstras-shortest-path-algorithm-greedy-algo-7/',
        storageKey: null,
        originalFilename: null,
        mimeType: null,
        fileSize: 0,
        thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&q=80',
        tags: JSON.stringify(['graphs', 'dijkstra', 'greedy', 'c++']),
        metadata: JSON.stringify({ domain: 'geeksforgeeks.org', readTime: '8 min' }),
        isPinned: false,
        isFavorite: true,
        lastAccessedAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        id: 'res_04',
        userId,
        subjectId: subCS106B,
        topicId: 'top_cs_03',
        collectionId: 'col_01',
        type: 'DRIVE_FILE',
        source: 'GOOGLE_DRIVE',
        title: 'CS301 Algorithm Analysis - Lecture Notes & Proofs.pdf',
        description: 'Formal proofs for master theorem cases, amortized analysis potential method, and graph coloring NP-hardness.',
        url: 'https://drive.google.com/file/d/sample-algo-proofs/view',
        storageKey: null,
        originalFilename: 'CS301 Algorithm Analysis - Lecture Notes & Proofs.pdf',
        mimeType: 'application/pdf',
        fileSize: 4280000,
        thumbnailUrl: 'https://ssl.gstatic.com/docs/doclist/images/icon_10_pdf_list.png',
        tags: JSON.stringify(['google-drive', 'pdf', 'proofs', 'midterm']),
        metadata: JSON.stringify({ driveFileId: 'drive-doc-001', syncStatus: 'synced' }),
        isPinned: false,
        isFavorite: false,
        lastAccessedAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: 'res_05',
        userId,
        subjectId: subCS106B,
        topicId: 'top_cs_01',
        collectionId: 'col_03',
        type: 'MARKDOWN',
        source: 'OBSIDIAN',
        title: 'Algorithmic Complexity & Big-O Master Reference.md',
        description: 'Comprehensive table comparing best, average, and worst cases for sorting, search trees, hashing, and priority queues.',
        url: null,
        storageKey: null,
        originalFilename: 'Algorithmic Complexity & Big-O Master Reference.md',
        mimeType: 'text/markdown',
        fileSize: 18450,
        thumbnailUrl: null,
        tags: JSON.stringify(['cheat-sheet', 'big-o', 'sorting', 'data-structures']),
        metadata: JSON.stringify({ noteLinked: true, author: 'Alex Chen' }),
        isPinned: true,
        isFavorite: true,
        lastAccessedAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
  }

  if (dbInstance.db.flashcardDecks.length === 0) {
    dbInstance.db.flashcardDecks.push(
      {
        id: 'deck_01',
        userId,
        subjectId: subCS106B,
        topicId: 'top_cs_01',
        name: 'Data Structures & Algorithmic Complexities',
        description: 'High-yield Anki deck reviewing asymptopia, tree rotations, hash collisions, and graph traversal guarantees.',
        tags: JSON.stringify(['algorithms', 'data-structures', 'cs106b']),
        cardCount: 4,
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'deck_02',
        userId,
        subjectId: subMATH51,
        topicId: 'top_math_03',
        name: 'Linear Algebra: Eigenvalues & Diagonalization',
        description: 'Key theorems, characteristic polynomial roots, algebraic vs geometric multiplicity, and matrix powers.',
        tags: JSON.stringify(['math', 'linear-algebra', 'midterm']),
        cardCount: 4,
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );

    // Cards for Deck 1
    dbInstance.db.flashcards.push(
      {
        id: 'card_01',
        deckId: 'deck_01',
        userId,
        front: 'What is the worst-case and average-case time complexity of finding an element in a Red-Black Tree with $N$ nodes?',
        back: '**Worst-case:** $O(\\log N)$\n**Average-case:** $O(\\log N)$\n\n*Why:* A Red-Black tree guarantees that the longest path from root to leaf is no more than twice the shortest path, maintaining strict logarithmic balance.',
        format: 'BASIC',
        interval: 1,
        repetitions: 1,
        easeFactor: 2.5,
        dueDate: todayIso, // Due today!
        lastReviewedAt: yesterdayIso,
        state: 'REVIEW',
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'card_02',
        deckId: 'deck_01',
        userId,
        front: "State the time complexity of Dijkstra's algorithm implemented with an adjacency list and a Binary Min-Heap.",
        back: '$$O((V + E) \\log V)$$\n\n- Extract-Min is called $V$ times: $O(V \\log V)$\n- Decrease-Key is called at most $E$ times: $O(E \\log V)$',
        format: 'BASIC',
        interval: 3,
        repetitions: 2,
        easeFactor: 2.5,
        dueDate: todayIso, // Due today!
        lastReviewedAt: yesterdayIso,
        state: 'REVIEW',
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'card_03',
        deckId: 'deck_01',
        userId,
        front: 'What is the master theorem condition and solution for $T(n) = 2T(n/2) + O(n)$?',
        back: 'Here $a = 2, b = 2, \\log_b a = \\log_2 2 = 1$.\n$f(n) = O(n) = \\Theta(n^1) = \\Theta(n^{\\log_b a})$.\n\nBy Case 2 of the Master Theorem:\n$$T(n) = \\Theta(n \\log n)$$',
        format: 'BASIC',
        interval: 6,
        repetitions: 3,
        easeFactor: 2.6,
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        lastReviewedAt: yesterdayIso,
        state: 'REVIEW',
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'card_04',
        deckId: 'deck_01',
        userId,
        front: 'Explain the difference between Prim\'s algorithm and Kruskal\'s algorithm for Minimum Spanning Trees.',
        back: '- **Prim\'s**: Grows a single tree starting from an arbitrary vertex using a priority queue of cut edges.\n- **Kruskal\'s**: Sorts all edges globally by weight and adds edges if they don\'t form a cycle using a **Disjoint Set (Union-Find)** data structure.',
        format: 'BASIC',
        interval: 0,
        repetitions: 0,
        easeFactor: 2.5,
        dueDate: todayIso,
        lastReviewedAt: null,
        state: 'NEW',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // Cards for Deck 2
      {
        id: 'card_05',
        deckId: 'deck_02',
        userId,
        front: 'Under what condition is an $n \\times n$ matrix $A$ diagonalizable?',
        back: 'Matrix $A$ is diagonalizable if and only if it has **$n$ linearly independent eigenvectors**.\n\nEquivalently, for every eigenvalue $\\lambda_i$, the **geometric multiplicity** (dimension of eigenspace) equals the **algebraic multiplicity** (multiplicity as root of characteristic polynomial).',
        format: 'BASIC',
        interval: 1,
        repetitions: 1,
        easeFactor: 2.5,
        dueDate: todayIso, // Due today!
        lastReviewedAt: yesterdayIso,
        state: 'REVIEW',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'card_06',
        deckId: 'deck_02',
        userId,
        front: 'If $A = P D P^{-1}$, write the simplified formula for computing matrix power $A^k$.',
        back: '$$A^k = P D^k P^{-1}$$\n\nWhere $D^k$ is simply the diagonal matrix with each diagonal eigenvalue raised to power $k$:\n$$\\operatorname{diag}(\\lambda_1^k, \\lambda_2^k, \\dots, \\lambda_n^k)$$',
        format: 'BASIC',
        interval: 4,
        repetitions: 2,
        easeFactor: 2.5,
        dueDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        lastReviewedAt: yesterdayIso,
        state: 'REVIEW',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'card_07',
        deckId: 'deck_02',
        userId,
        front: 'What can you guarantee about the eigenvalues and eigenvectors of a real **symmetric** matrix $A$ ($A = A^T$)?',
        back: 'By the **Spectral Theorem**:\n1. All eigenvalues of $A$ are real numbers.\n2. Eigenvectors corresponding to distinct eigenvalues are mutually orthogonal.\n3. $A$ is orthogonally diagonalizable: $A = Q D Q^T$ where $Q$ is an orthogonal matrix ($Q^T = Q^{-1}$).',
        format: 'BASIC',
        interval: 0,
        repetitions: 0,
        easeFactor: 2.5,
        dueDate: todayIso,
        lastReviewedAt: null,
        state: 'NEW',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'card_08',
        deckId: 'deck_02',
        userId,
        front: 'Using MathJax delimiters \\( \\lambda \\), define the characteristic equation of matrix \\( A \\).',
        back: 'The characteristic polynomial equation is defined as:\n\\[ \\det(A - \\lambda I) = 0 \\]\n\nRoots \\( \\lambda_1, \\dots, \\lambda_n \\) are the eigenvalues of \\( A \\).\n\n*Anki MathJax format verified.*',
        format: 'BASIC',
        interval: 1,
        repetitions: 1,
        easeFactor: 2.5,
        dueDate: todayIso,
        lastReviewedAt: yesterdayIso,
        state: 'REVIEW',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
  }

  dbInstance.save();
  console.log('StudyOS seed data successfully written.');
}
