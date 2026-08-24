import { notFound } from 'next/navigation';

import { AccountCard } from '@/app/components/Personal/AccountCard';
import { AdminCard } from '@/app/components/Personal/AdminCard';
import { ShareCard } from '@/app/components/Personal/ShareCard';
import { SendMessageButton } from '@/app/components/SendMessageButton/SendMessageButton';
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
 * Session-gated self-only "Your Space" page for the signed-in user. Four sections — Collections
 * (default), Images (tagged), Saved (bookmarks), Following — selected via `?tab=`, then an Account
 * card (email + passkey enrollment) below. Anonymous visitors get a 404; sign-in lives at `/login`
 * (which lands here on success) and onboarding at the invite-link flow.
 *
 * The sections themselves live in {@link UserSpace}, shared with `/admin/users/[id]` so an admin
 * sees a user's space exactly as that user sees it. Everything specific to viewing one's OWN
 * space stays here: the contact button, the account card, and the admin card.
 *
 * All four ride in the header rail rather than below the grid or in a bar above it. That rail — the
 * TEXT block leading the first row, beside the cover — is where this app already puts what is
 * *about* a collection (date, location, description, siblings, the filter bar), so page-level
 * cards belong with them instead of in a slab at the bottom of the page.
 *
 * ## Why the contact button's position depends on `isAdmin`
 *
 * For a signed-in client or follower, messaging the photographer is plausibly the most-used thing
 * on this page, so it leads. For the site owner reading their own space it is close to useless —
 * the form would prefill their own address, and they read incoming messages through Admin →
 * Comments — so it goes last, after the card that takes them there. The rail is assembled per
 * viewer already, so ordering on the principal costs one condition.
 *
 * No `MeProvider` here: `railExtras` renders inside `CollectionPageClient`, which mounts its own
 * provider from the same principal this page passes it as `me`. Every consumer on this page,
 * `SendMessageButton` included, is a descendant of that stack, so a page-level wrapper would be a
 * second provider over the same value.
 */
export default async function UserPage({ searchParams }: UserPageProps) {
  const principal = await meServer();
  if (!principal) notFound();

  // Resolved ahead of the space load rather than alongside it — `loadUserSpace` hydrates only the
  // active section, so the key is one of its inputs. See its docblock.
  const { tab } = await searchParams;
  const activeKey = resolveTabKey(tab);

  const [data, ssrViewport, share] = await Promise.all([
    loadUserSpace('self', activeKey),
    resolveSsrViewport(),
    readShareSettings(),
  ]);
  if (!data) notFound();

  const contact = <SendMessageButton />;

  return (
    <PageShell pageType="default" collectionSlug={data.collection.slug}>
      <h1 className={styles.srOnly}>Your Space</h1>

      <div className={styles.sections}>
        <UserSpace
          data={data}
          activeKey={activeKey}
          basePath="/user"
          me={principal}
          ssrViewport={ssrViewport}
          railExtras={
            <>
              {!principal.isAdmin && contact}
              <AccountCard email={principal.email} />
              <ShareCard read={share} />
              {principal.isAdmin && <AdminCard />}
              {principal.isAdmin && contact}
            </>
          }
        />
      </div>
    </PageShell>
  );
}
