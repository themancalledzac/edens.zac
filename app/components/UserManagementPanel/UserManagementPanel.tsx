'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { GenerateInviteButton } from '@/app/(admin)/admin/users/GenerateInviteButton';
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

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await listUsers());
    } finally {
      setLoading(false);
    }
  }, []);

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
                      <span className={styles.email}>{user.email}</span>
                    </span>
                  </button>
                  <div className={styles.rowActions}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setView({ mode: 'edit', user })}
                    >
                      Update
                    </Button>
                    <GenerateInviteButton
                      userId={user.id}
                      email={user.email}
                      status={user.status}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )))}
      </div>
    </section>
  );
}

export default UserManagementPanel;
