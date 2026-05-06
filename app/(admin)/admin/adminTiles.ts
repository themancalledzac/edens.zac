export interface AdminTileConfig {
  tileKey: string;
  label: string;
  href: string;
}

export interface AdminTileMerged extends AdminTileConfig {
  coverImageUrl: string | null;
}

// tileKey values must match rows seeded by V19__admin_home_tiles.sql in the
// backend repo. The backend table has 10 keys; this list intentionally only
// renders 5 (the others - metadata, comments, create, manage, about - live
// in MenuDropdown instead).
export const ADMIN_TILES: AdminTileConfig[] = [
  { tileKey: 'home',             label: 'Home (Preview)',   href: '/homePage' },
  { tileKey: 'all-collections',  label: 'All Collections',  href: '/all-collections' },
  { tileKey: 'all-images',       label: 'All Images',       href: '/all-images' },
  { tileKey: 'blogs',            label: 'Blogs',            href: '/all-blogs' },
  { tileKey: 'client-galleries', label: 'Client Galleries', href: '/all-client-galleries' },
];
