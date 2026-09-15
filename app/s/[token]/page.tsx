import { type Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { UserSpace } from '@/app/components/UserSpace/UserSpace';
import { loadUserSpace } from '@/app/components/UserSpace/userSpaceData';
import { isShadowedRouteSlug } from '@/app/utils/collectionSlugs';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

import styles from './page.module.scss';
import { ShareBanner } from './ShareBanner';
import { ShareSession } from './ShareSession';

export const dynamic = 'force-dynamic';

/**
 * Emit `<meta name="referrer" content="no-referrer">` into `<head>` so the raw share token in the
 * URL is never sent in a `Referer` header to third-party resources. Set via Next's metadata API —
 * a bare `<meta>` in the JSX body is inert, because browsers only honor the referrer directive
 * inside `<head>`. Same reasoning as the invite route.
 */
export const metadata: Metadata = { referrer: 'no-referrer' };

interface SharePageProps {
  params: Promise<{ token: string }>;
}

/**
 * A shared view of one user's work, opened from a link they sent.
 *
 * The recipient is a guest, not a borrower: they see the owner's collections and tagged images,
 * and can walk into those collections, but they hold no grants of their own. That cap lives
 * entirely in the backend — this page renders {@link UserSpace} with `me={null}`, the same switch
 * `/admin/users/[id]` uses, which disarms every personal-action control in the stack.
 *
 * Only Collections and Images are offered. Saved and Following are the owner's private bookmarks
 * and are absent from the backend's recipient view, so the section chips are narrowed rather than
 * rendered empty — an empty "Saved" tab would assert the owner has saved nothing, which is not
 * what we know. A hand-edited `?tab=saved` on a shared link is clamped back to Collections by
 * `UserSpaceGrid`, rather than 404ing — a stale query string should land on the page.
 *
 * A dead link (unknown or reset) is a 404. The backend cannot tell those apart by design — a reset
 * leaves no trace of the old token — and neither should this page.
 */
export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;

  const [data, ssrViewport] = await Promise.all([
    loadUserSpace({ mode: 'share', token }),
    resolveSsrViewport(),
  ]);
  if (!data) notFound();

  return (
    <PageShell
      collectionSlug={isShadowedRouteSlug(data.collection.slug) ? undefined : data.collection.slug}
    >
      <ShareSession token={token} />

      <div className={styles.sections}>
        <ShareBanner ownerName={data.ownerName} />

        <UserSpace data={data} basePath={`/s/${token}`} me={null} ssrViewport={ssrViewport} />
      </div>
    </PageShell>
  );
}
