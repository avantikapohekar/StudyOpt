import { dbInstance } from '../server/db';
import { calculateTopicProgressWeight } from '../server/routes/academicRoutes';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('--- Testing Subject Endpoints & Resiliency ---');

// Test 1: calculateTopicProgressWeight
assert(calculateTopicProgressWeight('MASTERED') === 1.0, 'MASTERED weight is 1.0');
assert(calculateTopicProgressWeight('REVISED') === 0.75, 'REVISED weight is 0.75');
assert(calculateTopicProgressWeight('PRACTICED') === 0.50, 'PRACTICED weight is 0.50');
assert(calculateTopicProgressWeight('LEARNING') === 0.25, 'LEARNING weight is 0.25');
assert(calculateTopicProgressWeight('NOT_STARTED') === 0.0, 'NOT_STARTED weight is 0.0');
console.log('✓ Test 1: calculateTopicProgressWeight works correctly');

// Test 2: Database subjects and semesters exist
const subjects = dbInstance.db.subjects;
assert(Array.isArray(subjects) && subjects.length > 0, 'Database contains subjects');
console.log(`✓ Test 2: Found ${subjects.length} subjects in DB`);

// Test 3: Cascade deletion integrity
const testSubjectId = 'sub_temp_test_999';
dbInstance.db.subjects.push({
  id: testSubjectId,
  semesterId: 'sem_fall_2026_01',
  name: 'Test Subject',
  code: 'TEST99',
  color: '#000000',
  credits: 3,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

assert(dbInstance.db.subjects.some(s => s.id === testSubjectId), 'Subject added');
dbInstance.deleteSubjectCascade(testSubjectId);
assert(!dbInstance.db.subjects.some(s => s.id === testSubjectId), 'Subject successfully deleted by cascade');
console.log('✓ Test 3: deleteSubjectCascade clean removal verified');

console.log('\nAll subject resiliency tests passed successfully!\n');
