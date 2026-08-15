import { type Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { UserSpace } from '@/app/components/UserSpace/UserSpace';
import { loadUserSpace, resolveTabKey } from '@/app/components/UserSpace/userSpaceData';
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
  searchParams: Promise<{ tab?: string | string[] }>;
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
 * what we know.
 *
 * A dead link (unknown or reset) is a 404. The backend cannot tell those apart by design — a reset
 * leaves no trace of the old token — and neither should this page.
 */
export default async function SharePage({ params, searchParams }: SharePageProps) {
  const { token } = await params;
  const { tab } = await searchParams;

  const activeKey = resolveTabKey(tab);
  const [data, ssrViewport] = await Promise.all([
    loadUserSpace({ mode: 'share', token }, activeKey),
    resolveSsrViewport(),
  ]);
  if (!data) notFound();

  // `?tab=saved` on a shared link resolves to a section this view does not offer. Clamp rather
  // than 404 — a stale or hand-edited query string should land on the page, not on an error.
  const safeKey = data.visibleKeys.includes(activeKey) ? activeKey : data.visibleKeys[0];

  return (
    <PageShell pageType="default" collectionSlug={data.collection.slug}>
      <ShareSession token={token} />

      <div className={styles.sections}>
        <ShareBanner ownerName={data.ownerName} />

        <UserSpace
          data={data}
          activeKey={safeKey}
          basePath={`/s/${token}`}
          me={null}
          ssrViewport={ssrViewport}
        />
      </div>
    </PageShell>
  );
}
