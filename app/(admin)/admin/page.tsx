import { ownSpaceExtras } from '@/app/components/Personal/ownSpaceExtras';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { UserSpace } from '@/app/components/UserSpace/UserSpace';
import {
  loadUserSpace,
  resolveSpaceKey,
  type TabKey,
} from '@/app/components/UserSpace/userSpaceData';
import { meServer } from '@/app/lib/api/auth';
import { readShareSettings } from '@/app/lib/api/share';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

import { AdminHubClient } from './AdminHubClient';
import { loadAdminHub } from './loadAdminHub';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

interface AdminPageProps {
  searchParams: Promise<{ tab?: string | string[] }>;
}

const NO_TAB: AdminPageProps = { searchParams: Promise.resolve({}) };

/**
 * The admin's own space with an Admin section in front: the hub's panels and tiles under
 * `?tab=admin` (the default), and the same Collections / Images / Saved sections `/user` renders,
 * which redirects admins here. Gating is the `(admin)` layout's `requireAdmin()`; locally that
 * passes an anonymous visitor through, and with no principal there is no space to render, so the
 * hub renders alone, as it did before this page hosted the space.
 */
export default async function AdminPage({ searchParams }: AdminPageProps = NO_TAB) {
  const ssrViewport = await resolveSsrViewport();
  const principal = await meServer();
  const { tab } = await searchParams;
  const activeKey = resolveSpaceKey(tab);
  /** Skips `loadUserSpace`'s collections-catalog read, which only the `collections` key fetches. */
  const tabKey: TabKey = activeKey === 'admin' ? 'images' : activeKey;

  const [hub, data, share] = await Promise.all([
    loadAdminHub(ssrViewport?.viewportHeight),
    principal ? loadUserSpace('self', tabKey) : Promise.resolve(null),
    principal ? readShareSettings() : Promise.resolve(null),
  ]);

  if (!principal || !data || !share) {
    return (
      <PageShell>
        <h1 className={styles.srOnly}>Admin</h1>
        <AdminHubClient
          content={hub.content}
          seed={hub.seed}
          mobileChunkSize={1}
          serverContentWidth={ssrViewport?.contentWidth}
          serverViewportHeight={ssrViewport?.viewportHeight}
          serverIsMobile={ssrViewport?.isMobile}
        />
      </PageShell>
    );
  }

  return (
    <PageShell collectionSlug={data.collection.slug}>
      <h1 className={styles.srOnly}>Your Space</h1>
      <div className={styles.sections}>
        <UserSpace
          data={data}
          activeKey={activeKey}
          basePath="/admin"
          me={principal}
          ssrViewport={ssrViewport}
          adminHub={hub}
          toolbarExtras={ownSpaceExtras(principal, share)}
        />
      </div>
    </PageShell>
  );
}
