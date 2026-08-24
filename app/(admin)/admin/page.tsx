// Admin = authenticated admin principal: the backend enforces hasRole('ADMIN') on
// /api/admin/** (see docs 009). Gating centralized in app/(admin)/layout.tsx via requireAdmin().
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { getAdminHomeTiles } from '@/app/lib/api/adminHome';
import { getMetadata } from '@/app/lib/api/collections';
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
 * pair up as well. Desktop is unaffected — the option is read only on the mobile branch.
 *
 * Panels render through `AdminHubClient`, which owns their collapsed state: collapsing one swaps
 * its content model for a bar-shaped footprint, so the packer re-runs and the panels and tiles
 * still standing widen into the reclaimed space.
 *
 * The four row COUNTS are resolved here, alongside the tiles, because a panel reserves
 * `chrome + rowCount × rowHeight` of layout height and the packer needs that before it can place
 * anything. Fetching them server-side is what makes the first pack the only pack: a count supplied
 * after paint would rewrite the panels' footprints, re-pack the page, change row membership and so
 * remount every panel, whose fetches would fire again and re-enter the same loop until the browser
 * runs out of sockets. There is no second pack to converge, rather than a second pack argued to be
 * harmless.
 *
 * Messages exposes a real count (`total`), so it is fetched one row deep. Users, roles and
 * collections have no count endpoint and return their full lists; all are small admin collections
 * and every request shares one wall-clock round-trip. Each falls back independently, matching the
 * tiles' posture — a backend blip degrades a panel to its minimum reserved height instead of
 * failing the hub.
 *
 * Those three full lists are then handed to the panels as `seed`, so a list the server already
 * holds is painted rather than re-requested — the single-fetch rule, which keeping only `.length`
 * would break. `listUsers()` takes no options, which is exactly the `users:base` variant the panel
 * opens on; its "show tag-only people" variant is a different fetch and is left to load on demand.
 * A failed server fetch seeds `null`, not `[]`, so the panel loads for itself instead of announcing
 * an empty account list, and the count falls back to the layout floor.
 *
 * `getMetadata()` carries more than the collection list — tags, people, cameras — and only the
 * collections are read here. It is still the right call: it is the endpoint that already returns
 * the admin collection list, and adding a collections-only one would be a second way to ask a
 * question this already answers.
 */
export default async function AdminHubPage() {
  const [tiles, ssrViewport, users, messages, roles, metadata] = await Promise.all([
    getAdminHomeTiles().catch(() => []),
    resolveSsrViewport(),
    listUsers().catch(() => null),
    getAdminMessages(1, 0).catch(() => null),
    listRoles().catch(() => null),
    getMetadata().catch(() => null),
  ]);

  const collections = metadata?.collections ?? null;

  // The viewport height comes from the same `Promise.all` as the counts, so the panel-height cap
  // is known before the first pack -- the same single-pack rule the counts follow.
  const content = buildAdminHubContent(
    tiles,
    {
      users: users?.length ?? 0,
      messages: messages?.total ?? 0,
      roles: roles?.length ?? 0,
      collections: collections?.length ?? 0,
    },
    ssrViewport?.viewportHeight
  );

  return (
    <PageShell>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Admin</h1>
        <span className={styles.subtitle}>local dev console</span>
      </div>
      <AdminHubClient
        content={content}
        mobileChunkSize={1}
        seed={{ users, roles, collections }}
        serverContentWidth={ssrViewport?.contentWidth}
        serverViewportHeight={ssrViewport?.viewportHeight}
        serverIsMobile={ssrViewport?.isMobile}
      />
    </PageShell>
  );
}
