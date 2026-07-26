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
 * saved with one of these slugs is unreachable at `/{slug}` — the static page wins, so its
 * browse tile links somewhere other than the collection. `collections` joined the list when
 * the public showcase shipped.
 *
 * There is no reserved-slug list anywhere in either repo (grep-verified: the frontend has
 * none, and the backend's only reservation is `AdminRoleController`'s `user:` role prefix).
 * Slugs are backend-generated and never validated against this set, so this constant is the
 * only record of the collision. Deliberately NOT part of {@link BROWSE_EXCLUDED_SLUGS}:
 * hiding an admin's collection from a browse list would be a worse failure than showing a
 * tile with a wrong link. Consumers log instead — see `isShadowedRouteSlug`.
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

const SHADOWED_ROUTE_SLUG_SET: ReadonlySet<string> = new Set(SHADOWED_ROUTE_SLUGS);

/** True when a collection's slug is shadowed by a static route. Reporting only — never a filter. */
export function isShadowedRouteSlug(slug: string | undefined): boolean {
  return slug !== undefined && SHADOWED_ROUTE_SLUG_SET.has(slug);
}

/**
 * Slugs excluded from every all-collections browse surface. `home` is rendered at `/`, so a
 * tile for it would be a duplicate entry point.
 *
 * TODO: `/collections` (public) and `/all-collections` (admin) render the same synthetic
 * parent with the same exclusions and no cross-link between them. Picking a canonical
 * surface and redirecting the other is a product decision; until it is made, they at least
 * share this list.
 */
export const BROWSE_EXCLUDED_SLUGS: readonly string[] = [HOME_SLUG];
