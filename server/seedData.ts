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

  if (dbInstance.db.users.length > 0) {
    populateSubtasks();
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

  dbInstance.save();
  console.log('StudyOS seed data successfully written.');
}
