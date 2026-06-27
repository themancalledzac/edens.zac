// Admin = perimeter today (BFF INTERNAL_API_SECRET) → authenticated admin principal later
// (see docs 009). Gating centralized in app/(admin)/layout.tsx.
import Link from 'next/link';
import { notFound } from 'next/navigation';

import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { getAdminUser, getUserPageById } from '@/app/lib/api/users';

import { GenerateInviteButton } from '../GenerateInviteButton';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

/** Admin detail for a single user — header + full page view. Reached by clicking a row in the hub user panel. */
export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) notFound();

  const user = await getAdminUser(userId).catch(() => null);
  if (!user) notFound();

  // Tag-only PERSON identities have no account: no email, no invite/reset, no gallery page.
  // Render a minimal safe view (also guards direct-URL access) — merging is done from the panel.
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

        <p className={styles.hint}>
          Tag-only identity — merge it into an account from the Users panel.
        </p>
      </PageShell>
    );
  }

  const page = await getUserPageById(userId).catch(() => null);

  return (
    <PageShell pageType="collectionsCollection">
      <div className={styles.header}>
        <Link href="/admin" className={styles.back}>
          ← Admin
        </Link>
        <h1 className={styles.title}>{user.displayName ?? user.email}</h1>
      </div>

      <dl className={styles.details}>
        <div className={styles.field}>
          <dt className={styles.dt}>Email</dt>
          <dd className={styles.dd}>{user.email}</dd>
        </div>
        <div className={styles.field}>
          <dt className={styles.dt}>Name</dt>
          <dd className={styles.dd}>{user.displayName ?? '—'}</dd>
        </div>
        <div className={styles.field}>
          <dt className={styles.dt}>Status</dt>
          <dd className={styles.dd}>
            <span className={styles.status} data-status={user.status}>
              {user.status}
            </span>
          </dd>
        </div>
      </dl>

      <div className={styles.actions}>
        <GenerateInviteButton userId={user.id} email={user.email ?? ''} status={user.status} />
      </div>

      {page ? (
        <CollectionPage collection={page} editMode />
      ) : (
        <p>This user has no galleries yet.</p>
      )}
    </PageShell>
  );
}
