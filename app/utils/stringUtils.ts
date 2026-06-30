/** Converts UPPER_SNAKE_CASE (or single TOKEN) to Title Case: `CLIENT_GALLERY` → `Client Gallery`. */
export function humanizeConstantCase(value: string): string {
  return value
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Converts a URL slug to a human-readable Title Case label:
 * `street-photography` → `Street Photography`. Decodes percent-encoding first
 * so encoded slugs round-trip cleanly. Used as a display fallback when a real
 * display name isn't available (e.g. a `?via=` slug with no fetched title).
 */
export function humanizeSlug(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/-+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
