import { notFound, redirect } from 'next/navigation';

import { ownSpaceExtras } from '@/app/components/Personal/ownSpaceExtras';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { UserSpace } from '@/app/components/UserSpace/UserSpace';
import { loadUserSpace, resolveTabKey } from '@/app/components/UserSpace/userSpaceData';
import { meServer } from '@/app/lib/api/auth';
import { readShareSettings } from '@/app/lib/api/share';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

interface UserPageProps {
  searchParams: Promise<{ tab?: string | string[] }>;
}

/**
 * "Your Space" for a signed-in non-admin: Collections (default), Images (tagged) and Saved
 * (bookmarks) selected via `?tab=`, with the Share, Contact and Face / Touch ID chips in the bar.
 * Anonymous visitors get a 404. An admin is redirected to `/admin`, which renders this same space
 * behind an Admin section, so the redirect happens before any space read is paid for.
 *
 * No `MeProvider` here: the chips render inside `CollectionPageClient`, which mounts its own from
 * the principal this page passes as `me`.
 */
export default async function UserPage({ searchParams }: UserPageProps) {
  const principal = await meServer();
  if (!principal) notFound();

  const { tab } = await searchParams;
  if (principal.isAdmin) {
    redirect(tab === undefined ? '/admin' : `/admin?tab=${resolveTabKey(tab)}`);
  }

  const activeKey = resolveTabKey(tab);
  const [data, ssrViewport, share] = await Promise.all([
    loadUserSpace('self', activeKey),
    resolveSsrViewport(),
    readShareSettings(),
  ]);
  if (!data) notFound();

  return (
    <PageShell collectionSlug={data.collection.slug}>
      <h1 className={styles.srOnly}>Your Space</h1>
      <div className={styles.sections}>
        <UserSpace
          data={data}
          activeKey={activeKey}
          basePath="/user"
          me={principal}
          ssrViewport={ssrViewport}
          toolbarExtras={ownSpaceExtras(principal, share)}
        />
      </div>
    </PageShell>
  );
}
