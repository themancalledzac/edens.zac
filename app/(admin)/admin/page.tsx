// Admin = authenticated admin principal: the backend enforces hasRole('ADMIN') on
// /api/admin/** (see docs 009). Gating centralized in app/(admin)/layout.tsx via requireAdmin().
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { getAdminHomeTiles } from '@/app/lib/api/adminHome';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

import { AdminHubClient } from './AdminHubClient';
import { buildAdminHubContent } from './adminHubContent';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

/**
 * Admin hub: the users/messages panels and the nav tiles, laid out by the shared content pipeline.
 *
 * `mobileChunkSize={1}` pins the hub to a single column on touch viewports. Without it the hub
 * inherits `LAYOUT.mobileSlotWidth`, a row budget calibrated for PHOTOS, and the packer fits
 * two items per row: the two panels land at ~212px each on a 430px phone, which is too narrow for
 * a user list (the header controls collapse and every row ellipsizes), and portrait-covered tiles
 * pair up as well. The pre-pipeline `AdminHubGrid` was explicitly `grid-template-columns: 1fr` on
 * mobile; this restores that. Desktop is unaffected — the option is read only on the mobile branch.
 *
 * Panels render through `AdminHubClient`, which owns their collapsed state: collapsing one swaps
 * its content model for a bar-shaped footprint, so the packer re-runs and the panels and tiles
 * still standing widen into the reclaimed space.
 */
export default async function AdminHubPage() {
  const [tiles, ssrViewport] = await Promise.all([
    getAdminHomeTiles().catch(() => []),
    resolveSsrViewport(),
  ]);

  const content = buildAdminHubContent(tiles);

  return (
    <PageShell pageType="collectionsCollection">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Admin</h1>
        <span className={styles.subtitle}>local dev console</span>
      </div>
      <AdminHubClient
        content={content}
        mobileChunkSize={1}
        serverContentWidth={ssrViewport?.contentWidth}
        serverViewportHeight={ssrViewport?.viewportHeight}
        serverIsMobile={ssrViewport?.isMobile}
      />
    </PageShell>
  );
}
