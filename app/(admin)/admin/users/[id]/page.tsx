// Admin = authenticated admin principal: the backend enforces hasRole('ADMIN') on
// /api/admin/** (see docs 009). Gating centralized in app/(admin)/layout.tsx via requireAdmin().
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { UserRolesSection } from '@/app/components/UserForm/UserRolesSection';
import { UserSpace } from '@/app/components/UserSpace/UserSpace';
import { loadUserSpace, resolveTabKey } from '@/app/components/UserSpace/userSpaceData';
import { ApiError } from '@/app/lib/api/core';
import { getAdminUser } from '@/app/lib/api/users';
import { type AdminUserSummary } from '@/app/types/User';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

import { AdminUserSpaceEditor } from './AdminUserSpaceEditor';
import styles from './page.module.scss';
import { UpgradePersonButton } from './UpgradePersonButton';

export const dynamic = 'force-dynamic';

interface AdminUserDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}

/**
 * Admin detail for a single user: the profile editor, then that user's space rendered exactly as
 * they see it. Reached by clicking a row in the hub user panel.
 *
 * The space below the editor is the same {@link UserSpace} component `/user` renders, with the
 * same four `?tab=` sections, fed by the id-parameterized admin reads instead of the session-bound
 * `/api/read/user/**` ones. The Collections and Images sections come from the same backend method
 * as `/user` (`UserPageAssembler.assembleForUser`), so they are byte-identical to what this user
 * sees on their own page.
 *
 * This replaces the old "Log in as" impersonation button (removed in PR #204), which minted an
 * `ezac_session` for the target and overwrote the admin's own — so the admin stopped being admin.
 * Here the acting session stays the admin's throughout; only the data being rendered is the
 * target's. `UserSpace` receives `me={null}`, which disarms every personal-action control — see
 * its docblock for why that matters (a save heart here would write to the ADMIN's bookmarks).
 *
 * Editing a user happens INSIDE the space's header rail, via {@link AdminUserSpaceEditor}. The
 * rail already renders this person's description — literally the field being edited, since
 * `UserPageAssembler` feeds it from the same column — so a separate profile card above the space
 * displayed the same value twice and pushed the actual page down by a screenful. Email, status,
 * description and role membership all live in the rail now; the only thing left above it is the
 * breadcrumb.
 *
 * The display NAME is not editable here. The space's cover carries it as its overlay, and a second
 * copy in the rail was one name on screen twice; the overlay itself cannot host the editor, since
 * it sits inside the parallax tile whose click opens the fullscreen viewer. Renaming is done from
 * the Users panel on `/admin`, which mounts the full `UserForm`.
 *
 * The GRID stays read-only, which is a different question from the rail. The collection is a
 * synthetic aggregation (slug "user", no backing row), so mounting the collection edit layer on it
 * would load /api/admin/collections/user/update and 404 with "Collection not found with slug:
 * user". `AdminUserSpaceEditor` supplies only the inline-edit context — writes go to
 * `updateUser`, never to a collection endpoint. That same missing row is why there is no per-user
 * cover-image control: there is nothing to save one against, on the user record or on the space.
 *
 * A user whose space read returns null has no rail to edit in. That case falls back to the empty
 * state, which points at the Users panel on `/admin` — `UserManagementPanel` mounts the full
 * `UserForm` for any user and does not depend on an assembled page existing.
 *
 * Tag-only PERSON identities have no account: no email, no invite/reset, no space. They get a
 * minimal view instead (which also guards direct-URL access), with {@link UpgradePersonButton} to
 * promote the identity in place. Merging a PERSON into an existing account stays in the Users
 * panel, where the survivor can be picked from the full list.
 *
 * Only a genuine 404 (or an empty body) becomes `notFound()`. `getAdminUser` throws `ApiError`
 * out of `fetchAdminGetApi` for every non-OK status, so catching all of them would render "user
 * not found" at an admin whose backend is merely unreachable — or whose session has lapsed to a
 * 401. Those rethrow and land on `app/(admin)/error.tsx`, which offers a retry.
 *
 * The "no galleries yet" empty state below obeys the same rule, and depends on `loadUserSpace`
 * applying that same 404 narrowing to the page read: a `null` here means the backend answered and
 * said this user has no assembled page. A failed read is NOT caught into `null` — it rejects and
 * reaches the error boundary — because an empty state after an error asserts something false. See
 * `EmptyState`'s docblock, and `loadAdminUserPage` for the narrowing itself.
 */
export default async function AdminUserDetailPage({
  params,
  searchParams,
}: AdminUserDetailPageProps) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) notFound();

  let user: AdminUserSummary | null;
  try {
    user = await getAdminUser(userId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  if (!user) notFound();

  if (user.status === 'PERSON') {
    return (
      <PageShell pageType="collectionsCollection" className={styles.page}>
        <div className={styles.header}>
          <Link href="/admin" className={styles.back}>
            ← Admin
          </Link>
        </div>

        <div className={styles.personCard}>
          <p className={styles.personIdentity}>
            <span className={styles.personName}>{user.displayName ?? '—'}</span>
            <span className={styles.badge}>tag-only · no account</span>
          </p>

          <UpgradePersonButton person={user} />

          <p className={styles.hint}>
            Tag-only identity — upgrade it to an account here, or merge it into an existing one from
            the Users panel.
          </p>
        </div>
      </PageShell>
    );
  }

  // `tab` is resolved BEFORE the space load rather than alongside it: `loadUserSpace` hydrates only
  // the active section, so it needs the key as an input. `searchParams` is already in memory by
  // this point in the request, so awaiting it first costs nothing.
  const { tab } = await searchParams;
  const activeKey = resolveTabKey(tab);

  const [data, ssrViewport] = await Promise.all([
    loadUserSpace({ mode: 'admin', userId }, activeKey),
    resolveSsrViewport(),
  ]);

  return (
    <PageShell pageType="collectionsCollection" className={styles.page}>
      <div className={styles.header}>
        <Link href="/admin" className={styles.back}>
          ← Admin
        </Link>
      </div>

      {data ? (
        <AdminUserSpaceEditor user={user}>
          <div className={styles.space}>
            <UserSpace
              data={data}
              activeKey={activeKey}
              basePath={`/admin/users/${userId}`}
              me={null}
              ssrViewport={ssrViewport}
              railExtras={<UserRolesSection userId={user.id} compact />}
            />
          </div>
        </AdminUserSpaceEditor>
      ) : (
        <EmptyState>
          This user has no galleries yet — edit their profile from the Users panel on /admin.
        </EmptyState>
      )}
    </PageShell>
  );
}
