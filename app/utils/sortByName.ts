/**
 * Case- and accent-insensitive name comparison for alphabetical lists.
 *
 * `sensitivity: 'base'` is what makes "alice" and "Alice" sort as one name instead of the default
 * comparison's uppercase-first ordering. Callers that sort records rather than strings pass their
 * own key out — a person's name lives under `displayName` on one type and `name` on another, and
 * either can be null, so the fallback chain belongs at the call site rather than in here.
 */
export function compareNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}
