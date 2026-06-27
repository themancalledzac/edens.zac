'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { GenerateInviteButton } from '@/app/(admin)/admin/users/GenerateInviteButton';
import { revalidateMetadataCache } from '@/app/components/ContentCollection/edit/collectionEditUtils';
import { MergeIdentityModal } from '@/app/components/MergeIdentityModal/MergeIdentityModal';
import { Button } from '@/app/components/ui/Button/Button';
import { UserForm } from '@/app/components/UserForm/UserForm';
import { listUsers } from '@/app/lib/api/users';
import { type AdminUserSummary } from '@/app/types/User';

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

  const headerTitle =
    view.mode === 'create' ? 'New User' : (view.mode === 'edit' ? 'Edit User' : 'Users');

  return (
    <section className={styles.panel} aria-label="User management">
      <div className={styles.header}>
        <h2 className={styles.title}>{headerTitle}</h2>
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
      </div>

      <div className={styles.body}>
        {view.mode === 'create' && (
          <UserForm mode="create" onSuccess={backToList} onCancel={backToList} />
        )}

        {view.mode === 'edit' && (
          <UserForm mode="edit" user={view.user} onSuccess={backToList} onCancel={backToList} />
        )}

        {view.mode === 'list' &&
          (loading ? (
            <p className={styles.muted}>Loading users…</p>
          ) : (users.length === 0 ? (
            <p className={styles.muted}>No users yet. Use “+ New User” to create one.</p>
          ) : (
            <ul className={styles.list}>
              {users.map(user => (
                <li key={user.id} className={styles.row}>
                  {user.status === 'PERSON' ? (
                    // Tag-only people have no account detail page — render a static, non-navigable
                    // identity so a click can't reach the account-only `/admin/users/[id]` view.
                    <div className={styles.rowStatic}>
                      <span className={styles.identity}>
                        <span className={styles.name}>{user.displayName ?? '—'}</span>
                        <span className={styles.email}>{user.email ?? ''}</span>
                      </span>
                      <span className={styles.status} data-status={user.status}>
                        {user.status}
                      </span>
                      <span className={styles.badge}>tag-only · no account</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.rowMain}
                      onClick={() => router.push(`/admin/users/${user.id}`)}
                    >
                      <span className={styles.identity}>
                        <span className={styles.name}>{user.displayName ?? '—'}</span>
                        <span className={styles.email}>{user.email ?? ''}</span>
                      </span>
                      <span className={styles.status} data-status={user.status}>
                        {user.status}
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
      </div>
    </section>
  );
}

export default UserManagementPanel;
