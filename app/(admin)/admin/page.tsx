// Admin = authenticated admin principal: the backend enforces hasRole('ADMIN') on
// /api/admin/** (see docs 009). Gating centralized in app/(admin)/layout.tsx via requireAdmin().
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { getAdminHomeTiles } from '@/app/lib/api/adminHome';
import { getAdminMessages } from '@/app/lib/api/messages';
import { listRoles } from '@/app/lib/api/roles';
import { listUsers } from '@/app/lib/api/users';
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
 *
 * The three row COUNTS are resolved here, alongside the tiles, because a panel reserves
 * `chrome + rowCount × rowHeight` of layout height and the packer needs that before it can place
 * anything. Fetching them server-side is what makes the first pack the only pack: a count supplied
 * after paint would rewrite the panels' footprints, re-pack the page, change row membership and so
 * remount all three panels — the loop that ended in `ERR_INSUFFICIENT_RESOURCES` on 2026-08-10.
 * Here there is no second pack to converge, rather than a second pack argued to be harmless.
 *
 * Messages exposes a real count (`total`), so it is fetched one row deep. Users and roles have no
 * count endpoint and return their full lists; both are small admin collections and all four
 * requests share one wall-clock round-trip. Each falls back independently, matching the tiles'
 * existing posture — a backend blip degrades a panel to its minimum reserved height instead of
 * failing the hub.
 */
export default async function AdminHubPage() {
  const [tiles, ssrViewport, users, messages, roles] = await Promise.all([
    getAdminHomeTiles().catch(() => []),
    resolveSsrViewport(),
    listUsers().catch(() => []),
    getAdminMessages(1, 0).catch(() => null),
    listRoles().catch(() => []),
  ]);

  const content = buildAdminHubContent(tiles, {
    users: users.length,
    messages: messages?.total ?? 0,
    roles: roles.length,
  });

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
