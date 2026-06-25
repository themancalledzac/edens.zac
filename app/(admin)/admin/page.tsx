// Admin = perimeter today (BFF INTERNAL_API_SECRET) → authenticated admin principal later (see docs 009). Gating centralized in app/(admin)/layout.tsx.
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { getAdminHomeTiles } from '@/app/lib/api/adminHome';

import AdminHubGrid from './AdminHubGrid';
import { ADMIN_TILES, type AdminTileMerged } from './adminTiles';
import { CreateUserButton } from './CreateUserButton';
import { ManageUsersLink } from './ManageUsersLink';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

export default async function AdminHubPage() {
  const apiTiles = await getAdminHomeTiles().catch(() => []);
  const apiByKey = new Map(apiTiles.map(t => [t.tileKey, t]));

  const tiles: AdminTileMerged[] = ADMIN_TILES.map(config => ({
    ...config,
    coverImageUrl: apiByKey.get(config.tileKey)?.coverImageUrl ?? null,
  }));

  return (
    <PageShell pageType="collectionsCollection">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Admin</h1>
        <span className={styles.subtitle}>local dev console</span>
        <div className={styles.headerActions}>
          <ManageUsersLink />
          <CreateUserButton />
        </div>
      </div>
      <AdminHubGrid tiles={tiles} />
    </PageShell>
  );
}
