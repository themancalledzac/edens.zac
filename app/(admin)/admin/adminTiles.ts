export interface AdminTileConfig {
  tileKey: string;
  label: string;
  href: string;
  rating: number;
}

// tileKey values must match rows seeded by V19__admin_home_tiles.sql in the
// backend repo. The backend table has 10 keys; this list intentionally only
// renders a subset (the others - metadata, comments, create, manage, about -
// live in MenuDropdown instead). The 'blogs' tile is omitted until a
// /all-blogs listing route exists (tracked in the 001 IA+UX sub-plan).
//
// The 'home' tile is omitted too. It pointed at /homePage, the local-only escape
// hatch from the old localhost / → /admin redirect; both are gone, so the admin
// hub no longer needs its own way back to the landing page - SiteHeader's title
// links to / on every page. It cannot simply be repointed at '/': buildAdminHubContent
// derives a tile's slug as `href.replace(/^\//, '')`, so '/' yields an empty slug,
// and getClickEligibility gates isSlugNav on `!!hasSlug` - the tile would render
// but navigate nowhere.
export const ADMIN_TILES: AdminTileConfig[] = [
  { tileKey: 'all-collections', label: 'All Collections', href: '/all-collections', rating: 3 },
  { tileKey: 'all-images', label: 'All Images', href: '/all-images', rating: 3 },
  {
    tileKey: 'client-galleries',
    label: 'Client Galleries',
    href: '/all-client-galleries',
    rating: 3,
  },
];
