/**
 * Object Comparison Utilities
 *
 * Provides efficient deep equality checks for objects.
 * More reliable than JSON.stringify which can fail with:
 * - Property order differences
 * - Undefined vs missing properties
 * - Circular references
 * - Special values (NaN, Infinity, etc.)
 */

/**
 * Check if two objects have the same values (deep equality)
 * Handles primitives, arrays, objects, null, and undefined
 *
 * @param a - First object to compare
 * @param b - Second object to compare
 * @returns true if objects are deeply equal, false otherwise
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  // Same reference or both null/undefined
  if (a === b) return true;

  // One is null/undefined, other is not
  if (a == null || b == null) return false;

  // Different types
  if (typeof a !== typeof b) return false;

  // Primitives (string, number, boolean, symbol, bigint)
  if (typeof a !== 'object') return a === b;

  // Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // One is array, other is not
  if (Array.isArray(a) || Array.isArray(b)) return false;

  // Objects
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Check if an update state has changes compared to the original state
 * Excludes the 'id' field from comparison as it's used for identification, not content
 *
 * @param updateState - The updated state object
 * @param originalState - The original state object to compare against
 * @returns true if there are changes (excluding id field), false otherwise
 */
export function hasObjectChanges(
  updateState: object & { id?: number },
  originalState: object & { id?: number }
): boolean {
  // Extract all fields except 'id' for comparison
  const { id: _updateId, ...updateRest } = updateState as Record<string, unknown> & { id?: number };
  const { id: _originalId, ...originalRest } = originalState as Record<string, unknown> & { id?: number };

  return !deepEqual(updateRest, originalRest);
}

