/**
 * Tag normalization and serialization utilities.
 * Safely handles strings, string arrays, JSON strings, null, undefined, and invalid inputs.
 */

/**
 * Normalizes any tag input into a clean string array (string[]).
 * Never throws TypeError or split error.
 */
export function normalizeTags(input: unknown): string[] {
  if (input === null || input === undefined) {
    return [];
  }

  // Case 1: Already an Array
  if (Array.isArray(input)) {
    return input
      .filter((item): item is string | number => item !== null && item !== undefined)
      .map(item => (typeof item === 'string' ? item.trim() : String(item).trim()))
      .filter(item => item.length > 0);
  }

  // Case 2: String input
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed || trimmed === '[]' || trimmed === '""') {
      return [];
    }

    // Try parsing as JSON array if it starts with [ and ends with ]
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return normalizeTags(parsed);
        }
      } catch {
        // Not valid JSON, strip enclosing brackets and proceed to comma split
        const withoutBrackets = trimmed.slice(1, -1).trim();
        return withoutBrackets
          .split(',')
          .map(t => t.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
      }
    }

    // Standard comma-separated or whitespace-trimmed string
    return trimmed
      .split(',')
      .map(t => t.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }

  // Case 3: Other unexpected types (number, boolean, object)
  return [];
}

/**
 * Serializes any tag input into a JSON array string for database storage.
 * e.g. ['math', 'physics'] -> '["math","physics"]'
 */
export function serializeTags(input: unknown): string {
  const normalized = normalizeTags(input);
  return JSON.stringify(normalized);
}

/**
 * Converts any tag input into a clean comma-separated string for form inputs.
 * e.g. ['math', 'physics'] -> "math, physics"
 */
export function tagsToInputString(input: unknown): string {
  return normalizeTags(input).join(', ');
}
