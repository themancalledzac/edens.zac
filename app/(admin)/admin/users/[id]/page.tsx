// Admin = authenticated admin principal: the backend enforces hasRole('ADMIN') on
// /api/admin/** (see docs 009). Gating centralized in app/(admin)/layout.tsx via requireAdmin().
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { UserSpace } from '@/app/components/UserSpace/UserSpace';
import { loadUserSpace, resolveTabKey } from '@/app/components/UserSpace/userSpaceData';
import { getAdminUser } from '@/app/lib/api/users';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

import { GenerateInviteButton } from '../GenerateInviteButton';
import styles from './page.module.scss';
import { UpgradePersonButton } from './UpgradePersonButton';
import { UserDetailEditor } from './UserDetailEditor';

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
 * Editing a user happens through the surfaces around the space, not inside it: {@link
 * UserDetailEditor} for email / name / status / description (the description is what
 * `UserPageAssembler` renders as the space's own description), and drilling into a collection tile
 * for that collection's contents. The space itself stays read-only because it is a synthetic
 * aggregation (slug "user", no backing collection row) — mounting the edit layer on it loads
 * /api/admin/collections/user/update and 404s with "Collection not found with slug: user".
 *
 * Tag-only PERSON identities have no account: no email, no invite/reset, no space. They get a
 * minimal view instead (which also guards direct-URL access), with {@link UpgradePersonButton} to
 * promote the identity in place. Merging a PERSON into an existing account stays in the Users
 * panel, where the survivor can be picked from the full list.
 */
export default async function AdminUserDetailPage({
  params,
  searchParams,
}: AdminUserDetailPageProps) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) notFound();

  const user = await getAdminUser(userId).catch(() => null);
  if (!user) notFound();

  const displayName = user.displayName ?? user.email ?? '—';

  if (user.status === 'PERSON') {
    return (
      <PageShell pageType="collectionsCollection">
        <div className={styles.header}>
          <Link href="/admin" className={styles.back}>
            ← Admin
          </Link>
          <h1 className={styles.title}>{user.displayName ?? '—'}</h1>
        </div>

        <dl className={styles.details}>
          <div className={styles.field}>
            <dt className={styles.dt}>Email</dt>
            <dd className={styles.dd}>—</dd>
          </div>
          <div className={styles.field}>
            <dt className={styles.dt}>Name</dt>
            <dd className={styles.dd}>{user.displayName ?? '—'}</dd>
          </div>
          <div className={styles.field}>
            <dt className={styles.dt}>Status</dt>
            <dd className={styles.dd}>
              <span className={styles.badge}>tag-only · no account</span>
            </dd>
          </div>
        </dl>

        <UpgradePersonButton person={user} />

        <p className={styles.hint}>
          Tag-only identity — upgrade it to an account here, or merge it into an existing one from
          the Users panel.
        </p>
      </PageShell>
    );
  }

  const [{ tab }, data, ssrViewport] = await Promise.all([
    searchParams,
    loadUserSpace({ mode: 'admin', userId }),
    resolveSsrViewport(),
  ]);

  return (
    <PageShell pageType="collectionsCollection">
      <div className={styles.header}>
        <Link href="/admin" className={styles.back}>
          ← Admin
        </Link>
        <h1 className={styles.title}>{displayName}</h1>
      </div>

      <UserDetailEditor user={user} />

      <div className={styles.actions}>
        <GenerateInviteButton userId={user.id} email={user.email ?? ''} status={user.status} />
      </div>

      {data ? (
        <div className={styles.space}>
          <UserSpace
            data={data}
            activeKey={resolveTabKey(tab)}
            basePath={`/admin/users/${userId}`}
            me={null}
            ssrViewport={ssrViewport}
            railExtras={
              <p className={styles.spaceNote}>
                Viewing {displayName}&rsquo;s space as they see it. Saving and following are
                disabled here — they would act on your own account, not theirs.
              </p>
            }
          />
        </div>
      ) : (
        <p>This user has no galleries yet.</p>
      )}
    </PageShell>
  );
}
