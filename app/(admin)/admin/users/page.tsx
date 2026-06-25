// Admin = perimeter today (BFF INTERNAL_API_SECRET) → authenticated admin principal later
// (see docs 009). Gating centralized in app/(admin)/layout.tsx.
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { listUsers } from '@/app/lib/api/users';

import { GenerateInviteButton } from './GenerateInviteButton';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

/**
 * Admin users view — lists every account and lets the admin (re)issue a single-use invite /
 * password-reset link per user. Behind the same admin perimeter as the rest of /admin.
 */
export default async function AdminUsersPage() {
  const users = await listUsers();

  return (
    <PageShell pageType="collectionsCollection">
      <div className={styles.header}>
        <h1 className={styles.title}>Users</h1>
        <span className={styles.subtitle}>
          {users.length} account{users.length === 1 ? '' : 's'}
        </span>
      </div>

      {users.length === 0 ? (
        <p className={styles.empty}>No users yet. Create one from the admin hub.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Email</th>
              <th scope="col">Name</th>
              <th scope="col">Status</th>
              <th scope="col" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.displayName ?? '—'}</td>
                <td>
                  <span className={styles.status} data-status={user.status}>
                    {user.status}
                  </span>
                </td>
                <td className={styles.actionCell}>
                  <GenerateInviteButton userId={user.id} email={user.email} status={user.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageShell>
  );
}
