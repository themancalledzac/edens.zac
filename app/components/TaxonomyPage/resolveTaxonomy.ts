/**
 * Find an entity by its API slug. Falls back to a case-insensitive name match
 * (with hyphens treated as spaces) for backwards-compatible URLs.
 */
export function resolveTaxonomyBySlug<E extends { slug: string; name: string }>(
  entities: E[] | null | undefined,
  slug: string
): E | undefined {
  if (!entities?.length) return undefined;
  return (
    entities.find(e => e.slug === slug) ??
    entities.find(
      e => e.name.toLowerCase() === decodeURIComponent(slug).replace(/-/g, ' ').toLowerCase()
    )
  );
}
