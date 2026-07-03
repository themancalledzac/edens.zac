'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { GenerateInviteButton } from '@/app/(admin)/admin/users/GenerateInviteButton';
import { AdminPanel } from '@/app/components/AdminPanel/AdminPanel';
import { revalidateMetadataCache } from '@/app/components/ContentCollection/edit/collectionEditUtils';
import { MergeIdentityModal } from '@/app/components/MergeIdentityModal/MergeIdentityModal';
import { Button } from '@/app/components/ui/Button/Button';
import { UserForm } from '@/app/components/UserForm/UserForm';
import { listUsers, loginAsUser } from '@/app/lib/api/users';
import { type AdminUserSummary } from '@/app/types/User';
import { isLocalEnvironment } from '@/app/utils/environment';
import { logger } from '@/app/utils/logger';

import styles from './UserManagementPanel.module.scss';

type View = { mode: 'list' } | { mode: 'create' } | { mode: 'edit'; user: AdminUserSummary };

/**
 * Tall, self-contained admin panel that owns the user list and swaps its body between a scrollable
 * list, a create form, and an edit form — all in the same fixed-size space. Lives on the `/admin`
 * hub. Per-row "Update" opens edit-in-place; "Reset" reuses {@link GenerateInviteButton}; clicking
 * the rest of a row navigates to `/admin/users/[id]`.
 */
export function UserManagementPanel() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ mode: 'list' });
  const [showPeople, setShowPeople] = useState(false);
  const [mergeFor, setMergeFor] = useState<AdminUserSummary | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);

  // Dev-only "log in as this user". The button is hidden outside local, and the backend endpoint is
  // @Profile("dev") so it does not exist in prod at all — impersonation is never reachable there.
  const canImpersonate = isLocalEnvironment();

  const handleLoginAs = useCallback(async (userId: number) => {
    setImpersonatingId(userId);
    try {
      await loginAsUser(userId);
      // Full navigation so the freshly-set ezac_session cookie is used for the /user server render.
      window.location.assign('/user');
    } catch (error) {
      logger.error('UserManagementPanel', 'impersonation failed', error, { userId });
      setImpersonatingId(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await listUsers({ includePeople: showPeople }));
    } finally {
      setLoading(false);
    }
  }, [showPeople]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const backToList = useCallback(() => {
    setView({ mode: 'list' });
    void refresh();
  }, [refresh]);

  // Alphabetical by display name (falling back to email), case-insensitive.
  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) =>
        (a.displayName ?? a.email ?? '').localeCompare(b.displayName ?? b.email ?? '', undefined, {
          sensitivity: 'base',
        })
      ),
    [users]
  );

  const headerTitle =
    view.mode === 'create' ? 'New User' : (view.mode === 'edit' ? 'Edit User' : 'Users');

  const headerAction = (
    <>
      {view.mode === 'list' && (
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={showPeople}
            onChange={e => setShowPeople(e.target.checked)}
          />
          Show tag-only people
        </label>
      )}
      {view.mode === 'list' ? (
        <Button variant="secondary" size="sm" onClick={() => setView({ mode: 'create' })}>
          + New User
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={backToList}>
          ← Back
        </Button>
      )}
    </>
  );

  return (
    <AdminPanel title={headerTitle} ariaLabel="User management" action={headerAction}>
      {view.mode === 'create' && (
        <UserForm mode="create" onSuccess={backToList} onCancel={backToList} />
      )}

      {view.mode === 'edit' && (
        <UserForm mode="edit" user={view.user} onSuccess={backToList} onCancel={backToList} />
      )}

      {view.mode === 'list' &&
        (loading ? (
          <p className={styles.muted}>Loading users…</p>
        ) : (sortedUsers.length === 0 ? (
          <p className={styles.muted}>No users yet. Use "+ New User" to create one.</p>
        ) : (
          <ul className={styles.list}>
            {sortedUsers.map(user => (
              <li key={user.id} className={styles.row}>
                {user.status === 'PERSON' ? (
                  <div className={styles.rowStatic}>
                    <span className={styles.identity}>
                      <span className={styles.nameLine}>
                        <span className={styles.dot} data-status={user.status} aria-hidden="true" />
                        <span className={styles.name}>{user.displayName ?? '—'}</span>
                        <span className={styles.srOnly}>{user.status}</span>
                      </span>
                      <span className={styles.email}>{user.email ?? ''}</span>
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.rowMain}
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                  >
                    <span className={styles.identity}>
                      <span className={styles.nameLine}>
                        <span className={styles.dot} data-status={user.status} aria-hidden="true" />
                        <span className={styles.name}>{user.displayName ?? '—'}</span>
                        <span className={styles.srOnly}>{user.status}</span>
                      </span>
                      <span className={styles.email}>{user.email ?? ''}</span>
                    </span>
                  </button>
                )}
                <div className={styles.rowActions}>
                  {user.status === 'PERSON' ? (
                    <Button variant="secondary" size="sm" onClick={() => setMergeFor(user)}>
                      Merge…
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setView({ mode: 'edit', user })}
                      >
                        Update
                      </Button>
                      <GenerateInviteButton
                        userId={user.id}
                        email={user.email ?? ''}
                        status={user.status}
                      />
                      {canImpersonate && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={impersonatingId === user.id}
                          onClick={() => void handleLoginAs(user.id)}
                        >
                          {impersonatingId === user.id ? 'Logging in…' : 'Log in as'}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )))}

      {view.mode === 'list' && mergeFor && (
        <MergeIdentityModal
          source={mergeFor}
          candidates={users.filter(u => u.id !== mergeFor.id)}
          open
          onClose={() => setMergeFor(null)}
          onMerged={async () => {
            setMergeFor(null);
            await revalidateMetadataCache();
            void refresh();
          }}
        />
      )}
    </AdminPanel>
  );
}

export default UserManagementPanel;
