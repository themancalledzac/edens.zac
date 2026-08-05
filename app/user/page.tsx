import { notFound } from 'next/navigation';

import { MeProvider } from '@/app/components/auth/MeProvider';
import { AccountCard } from '@/app/components/Personal/AccountCard';
import { AdminCard } from '@/app/components/Personal/AdminCard';
import { SendMessageButton } from '@/app/components/SendMessageButton/SendMessageButton';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { UserSpace } from '@/app/components/UserSpace/UserSpace';
import { loadUserSpace, resolveTabKey } from '@/app/components/UserSpace/userSpaceData';
import { meServer } from '@/app/lib/api/auth';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

interface UserPageProps {
  searchParams: Promise<{ tab?: string | string[] }>;
}

/**
 * Session-gated self-only "Your Space" page for the signed-in user. Four sections — Collections
 * (default), Images (tagged), Saved (bookmarks), Following — selected via `?tab=`, then an Account
 * card (email + passkey enrollment) below. Anonymous visitors get a 404; sign-in lives at `/login`
 * (which lands here on success) and onboarding at the invite-link flow.
 *
 * The sections themselves live in {@link UserSpace}, shared with `/admin/users/[id]` so an admin
 * sees a user's space exactly as that user sees it. Everything specific to viewing one's OWN
 * space stays here: the send-message button, the account card, and the admin card.
 *
 * The whole sections region is wrapped in `MeProvider` because `SendMessageButton` is a sibling of
 * the collection stack, not a descendant: the provider that stack mounts internally does not reach
 * it, so without this wrapper `useMe()` returns null there and the send-message form opens with a
 * blank, editable email instead of the signed-in address. `CollectionPageClient` still mounts its
 * own provider from the same principal, so the nested provider carries an identical value.
 */
export default async function UserPage({ searchParams }: UserPageProps) {
  const principal = await meServer();
  if (!principal) notFound();

  const [{ tab }, data, ssrViewport] = await Promise.all([
    searchParams,
    loadUserSpace('self'),
    resolveSsrViewport(),
  ]);
  if (!data) notFound();

  return (
    <PageShell pageType="default" collectionSlug={data.collection.slug}>
      <h1 className={styles.srOnly}>Your Space</h1>

      <MeProvider me={principal}>
        <div className={styles.sections}>
          <div className={styles.topBar}>
            <SendMessageButton />
          </div>

          <UserSpace
            data={data}
            activeKey={resolveTabKey(tab)}
            basePath="/user"
            me={principal}
            ssrViewport={ssrViewport}
          />

          <AccountCard email={principal.email} />

          {principal.isAdmin && <AdminCard />}
        </div>
      </MeProvider>
    </PageShell>
  );
}
