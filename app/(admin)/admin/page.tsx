// Admin = authenticated admin principal: the backend enforces hasRole('ADMIN') on
// /api/admin/** (see docs 009). Gating centralized in app/(admin)/layout.tsx via requireAdmin().
import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { getAdminHomeTiles } from '@/app/lib/api/adminHome';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

import { buildAdminHubContent } from './adminHubContent';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

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
      <ContentBlockWithFullScreen
        content={content}
        priorityBlockIndex={0}
        enableFullScreenView={false}
        serverContentWidth={ssrViewport?.contentWidth}
        serverViewportHeight={ssrViewport?.viewportHeight}
        serverIsMobile={ssrViewport?.isMobile}
      />
    </PageShell>
  );
}
