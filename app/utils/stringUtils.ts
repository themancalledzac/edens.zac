/** Converts UPPER_SNAKE_CASE (or single TOKEN) to Title Case: `CLIENT_GALLERY` → `Client Gallery`. */
export function humanizeConstantCase(value: string): string {
  return value
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

/** Slug → Title Case label, e.g. `street-photography` → `Street Photography`. */
export function humanizeSlug(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/-+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
