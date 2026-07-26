/**
 * Well-known collection slugs and the slugs that browse surfaces hide.
 *
 * `'home'` was hardcoded at seven sites before this module existed; the string is a real
 * contract with the backend (the landing-page singleton), not an incidental literal.
 */

/** The landing-page singleton, rendered at `/` rather than at `/home`. */
export const HOME_SLUG = 'home';

/**
 * Static top-level route segments that shadow the `/[slug]` collection route. A collection
 * saved with one of these slugs is unreachable at `/{slug}` — the static page wins. Slugs
 * are backend-generated and unvalidated against this list, so browse surfaces drop them
 * rather than render a tile whose link goes somewhere else. `collections` joined the list
 * when the public showcase shipped.
 */
export const SHADOWED_ROUTE_SLUGS = [
  'all-client-galleries',
  'all-collections',
  'collections',
  'explore',
  'homePage',
  'invite',
  'location',
  'login',
  'tag',
  'user',
] as const;

/**
 * Slugs excluded from every all-collections browse surface.
 *
 * TODO: `/collections` (public) and `/all-collections` (admin) render the same synthetic
 * parent with the same exclusions and no cross-link between them. Picking a canonical
 * surface and redirecting the other is a product decision; until it is made, they at least
 * share this list.
 */
export const BROWSE_EXCLUDED_SLUGS: readonly string[] = [HOME_SLUG, ...SHADOWED_ROUTE_SLUGS];
