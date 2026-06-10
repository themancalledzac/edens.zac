/**
 * Canonical entry URL for the in-place collection edit surface.
 *
 * `?manage=1` on the public `/[slug]` route mounts the admin edit layer in place
 * (see app/[slug]/page.tsx) without remounting the public collection page.
 */
export function manageHref(slug: string): string {
  return `/${slug}?manage=1`;
}
