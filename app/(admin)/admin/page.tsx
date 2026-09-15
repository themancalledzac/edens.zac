import { ownSpaceExtras } from '@/app/components/Personal/ownSpaceExtras';
import { FormError } from '@/app/components/ui/Field/FormError';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { UserSpace } from '@/app/components/UserSpace/UserSpace';
import { loadUserSpace } from '@/app/components/UserSpace/userSpaceData';
import { meServer } from '@/app/lib/api/auth';
import { readShareSettings } from '@/app/lib/api/share';
import { logger } from '@/app/utils/logger';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

import { AdminHubClient } from './AdminHubClient';
import { loadAdminHub } from './loadAdminHub';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

/**
 * Fail-soft wrapper for {@link loadUserSpace}: the hub must still render when the admin's own
 * space cannot be read, so the failure is logged here and the page shows a notice instead.
 */
async function loadOwnSpace() {
  try {
    return await loadUserSpace('self');
  } catch (error) {
    logger.error('admin', "Could not load the admin's own space", error);
    return null;
  }
}

/**
 * The admin's own space with an Admin section in front: the hub under `?tab=admin` (the default)
 * and the same Collections / Images / Saved sections `/user` renders, which redirects admins here.
 * With no principal (local anonymous dev, or a failed `meServer`) the hub renders alone and
 * silently; with a principal but no space it renders alone under a notice.
 */
export default async function AdminPage() {
  const ssrViewport = await resolveSsrViewport();
  const hubPromise = loadAdminHub(ssrViewport?.viewportHeight);
  const principal = await meServer().catch(() => null);

  const [hub, data, share] = await Promise.all([
    hubPromise,
    principal ? loadOwnSpace() : Promise.resolve(null),
    principal ? readShareSettings() : Promise.resolve(null),
  ]);

  const hubNode = (
    <AdminHubClient
      content={hub.content}
      seed={hub.seed}
      mobileChunkSize={1}
      serverContentWidth={ssrViewport?.contentWidth}
      serverViewportHeight={ssrViewport?.viewportHeight}
      serverIsMobile={ssrViewport?.isMobile}
    />
  );

  if (!principal || !data || !share) {
    return (
      <PageShell>
        <h1 className={styles.srOnly}>Admin</h1>
        {principal && !data && (
          <div className={styles.notice}>
            <FormError>Your space could not be loaded. The admin hub is still available.</FormError>
          </div>
        )}
        {hubNode}
      </PageShell>
    );
  }

  return (
    <PageShell collectionSlug={data.collection.slug}>
      <h1 className={styles.srOnly}>Your Space</h1>
      <div className={styles.sections}>
        <UserSpace
          data={data}
          basePath="/admin"
          me={principal}
          ssrViewport={ssrViewport}
          adminHub={hubNode}
          toolbarExtras={ownSpaceExtras(principal, share)}
        />
      </div>
    </PageShell>
  );
}
