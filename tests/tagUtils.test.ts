import assert from 'node:assert/strict';
import { normalizeTags, serializeTags, tagsToInputString } from '../src/lib/tagUtils';

console.log('--- Running tagUtils unit test suite ---');

// Test 1: Empty tags
assert.deepEqual(normalizeTags(''), [], 'Empty string should yield empty array');
assert.deepEqual(normalizeTags('   '), [], 'Whitespace string should yield empty array');
assert.deepEqual(normalizeTags(null), [], 'null should yield empty array');
assert.deepEqual(normalizeTags(undefined), [], 'undefined should yield empty array');
assert.deepEqual(normalizeTags([]), [], 'Empty array should yield empty array');
assert.deepEqual(normalizeTags('[]'), [], 'JSON empty array string should yield empty array');
assert.deepEqual(normalizeTags('""'), [], 'Empty quote string should yield empty array');

// Test 2: Multiple tags in comma-separated string
assert.deepEqual(
  normalizeTags('math, algorithms, cs106b'),
  ['math', 'algorithms', 'cs106b'],
  'Comma-separated tags should be split and trimmed'
);
assert.deepEqual(
  normalizeTags('  algorithms  ,  ,  data-structures ,  '),
  ['algorithms', 'data-structures'],
  'Extra whitespace and empty entries should be stripped'
);

// Test 3: Existing tag arrays
assert.deepEqual(
  normalizeTags(['math', 'algorithms']),
  ['math', 'algorithms'],
  'Existing string array should be preserved'
);
assert.deepEqual(
  normalizeTags(['  linear-algebra ', '  eigenvalues  ', '']),
  ['linear-algebra', 'eigenvalues'],
  'String array with whitespace and empty strings should be trimmed and cleaned'
);

// Test 4: JSON serialized string representation
assert.deepEqual(
  normalizeTags('["math","proofs","midterm"]'),
  ['math', 'proofs', 'midterm'],
  'JSON array string should be parsed'
);
assert.deepEqual(
  normalizeTags("['math', 'proofs']"),
  ['math', 'proofs'],
  'Single-quoted pseudo-JSON should be parsed'
);

// Test 5: Invalid inputs (numbers, booleans, objects, mixed types)
assert.deepEqual(normalizeTags(12345), [], 'Number should safely return empty array');
assert.deepEqual(normalizeTags(true), [], 'Boolean should safely return empty array');
assert.deepEqual(normalizeTags({ tags: ['math'] }), [], 'Object should safely return empty array');
assert.deepEqual(
  normalizeTags(['valid', null, undefined, 42, '']),
  ['valid', '42'],
  'Mixed array should filter invalid entries and stringify numbers'
);

// Test 6: Serialization tests
assert.equal(serializeTags(null), '[]', 'Null should serialize to "[]"');
assert.equal(serializeTags('math, physics'), '["math","physics"]', 'Comma-separated should serialize to JSON array');
assert.equal(serializeTags(['math', 'physics']), '["math","physics"]', 'Array should serialize to JSON array');

// Test 7: Form input string conversion
assert.equal(tagsToInputString(null), '', 'Null should convert to empty string');
assert.equal(tagsToInputString('["math","physics"]'), 'math, physics', 'JSON string should convert to comma string');
assert.equal(tagsToInputString(['math', 'physics']), 'math, physics', 'Array should convert to comma string');

console.log(' All tagUtils unit tests passed successfully!');
