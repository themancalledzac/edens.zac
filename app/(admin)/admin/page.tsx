import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { getAdminHomeTiles } from '@/app/lib/api/adminHome';

import AdminHubGrid from './AdminHubGrid';
import { ADMIN_TILES, type AdminTileMerged } from './adminTiles';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

// Local-only admin hub. The middleware (proxy.ts) redirects this path to /
// in non-local environments, so this Server Component never runs in prod.
// Tile labels and hrefs are code-owned (adminTiles.ts); cover image URLs
// come from the backend (admin_home_tile + AdminHomeService). Clear-cache
// lives in MenuDropdown (next to the other local-only entries).
export default async function AdminHubPage() {
  const apiTiles = await getAdminHomeTiles().catch(() => []);
  const apiByKey = new Map(apiTiles.map(t => [t.tileKey, t]));

  const tiles: AdminTileMerged[] = ADMIN_TILES.map(config => ({
    ...config,
    coverImageUrl: apiByKey.get(config.tileKey)?.coverImageUrl ?? null,
  }));

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <SiteHeader pageType="collectionsCollection" />
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Admin</h1>
          <span className={styles.subtitle}>local dev console</span>
        </div>
        <AdminHubGrid tiles={tiles} />
      </main>
    </div>
  );
}
