'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { GenerateInviteButton } from '@/app/(admin)/admin/users/GenerateInviteButton';
import { AdminPanel } from '@/app/components/AdminPanel/AdminPanel';
import { revalidateMetadataCache } from '@/app/components/ContentCollection/edit/collectionEditUtils';
import { MergeIdentityModal } from '@/app/components/MergeIdentityModal/MergeIdentityModal';
import { Button } from '@/app/components/ui/Button/Button';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { LoadingText } from '@/app/components/ui/StatusText/LoadingText';
import { UpgradeUserModal } from '@/app/components/UpgradeUserModal/UpgradeUserModal';
import { UserForm } from '@/app/components/UserForm/UserForm';
import { listUsers } from '@/app/lib/api/users';
import { type AdminUserSummary } from '@/app/types/User';
import { logger } from '@/app/utils/logger';

import styles from './UserManagementPanel.module.scss';

type View = { mode: 'list' } | { mode: 'create' } | { mode: 'edit'; user: AdminUserSummary };

interface UserManagementPanelProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

/**
 * Tall, self-contained admin panel that owns the user list and swaps its body between a scrollable
 * list, a create form, and an edit form — all in the same fixed-size space. Lives on the `/admin`
 * hub. Per-row "Update" opens edit-in-place; "Reset" reuses {@link GenerateInviteButton}; clicking
 * the rest of a row navigates to `/admin/users/[id]`, which renders that user's space as they see
 * it. Tag-only PERSON rows are not navigable and instead offer "Merge…" (fold into an existing
 * account) and "Upgrade" (promote in place).
 *
 * Collapsed state is owned by `AdminPanelRenderer` (it sizes the box) and passed straight through
 * to {@link AdminPanel}. This panel only intervenes to force itself open when the body gains
 * something the user must see: the create and edit forms both live in the body, so opening one
 * while collapsed would otherwise look like the "+ New User" button did nothing.
 *
 * A failed load gets its own body branch, checked ahead of the empty state. `listUsers` throws
 * `ApiError` out of `fetchAdminGetApi` on any non-OK response, so a `catch`-less `refresh` would
 * leave `users` at `[]` and tell an admin whose backend is down that there are no users — an
 * invitation to create a duplicate account. Failed and empty must never look alike here.
 *
 * The {@link LoadingText} region sits outside the `view.mode === 'list'` guard, not inside it. It
 * has to outlive the branches it reports on (see its docblock), and `backToList` flips the view and
 * re-enters loading in the same commit — scoped to the list view, the region would be inserted with
 * its text already in place on every return from a form, which is the case that fails to announce.
 * Empty it is zero-height, so standing in front of the forms costs nothing.
 */
export function UserManagementPanel({ collapsed, onCollapsedChange }: UserManagementPanelProps) {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ mode: 'list' });
  const [showPeople, setShowPeople] = useState(false);
  const [mergeFor, setMergeFor] = useState<AdminUserSummary | null>(null);
  const [upgradeFor, setUpgradeFor] = useState<AdminUserSummary | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setUsers(await listUsers({ includePeople: showPeople }));
    } catch (error) {
      logger.error('UserManagementPanel', 'Failed to load users', error);
      setUsers([]);
      setLoadError('Could not load users. Retry, or check that the backend is running.');
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

  // Both forms render in the panel body, so entering one has to open the panel — otherwise the
  // header swaps to "New User" / "Edit User" with nothing beneath it.
  const openView = useCallback(
    (next: View) => {
      setView(next);
      onCollapsedChange?.(false);
    },
    [onCollapsedChange]
  );

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
    view.mode === 'create' ? 'New User' : view.mode === 'edit' ? 'Edit User' : 'Users';

  let listBody: ReactNode = null;
  if (!loading) {
    if (loadError) {
      listBody = (
        <div className={styles.loadError} role="alert">
          <p className={styles.error}>{loadError}</p>
          <Button variant="secondary" size="sm" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      );
    } else if (sortedUsers.length === 0) {
      listBody = <EmptyState>No users yet. Use “+ New User” to create one.</EmptyState>;
    } else {
      listBody = (
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
                  <>
                    <Button variant="secondary" size="sm" onClick={() => setMergeFor(user)}>
                      Merge…
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setUpgradeFor(user)}>
                      Upgrade
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openView({ mode: 'edit', user })}
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
      );
    }
  }

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
        <Button variant="secondary" size="sm" onClick={() => openView({ mode: 'create' })}>
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
    <AdminPanel
      title={headerTitle}
      ariaLabel="User management"
      action={headerAction}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
    >
      <LoadingText isLoading={loading}>Loading users…</LoadingText>

      {view.mode === 'create' && (
        <UserForm mode="create" onSuccess={backToList} onCancel={backToList} />
      )}

      {view.mode === 'edit' && (
        <UserForm mode="edit" user={view.user} onSuccess={backToList} onCancel={backToList} />
      )}

      {view.mode === 'list' && listBody}

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

      {view.mode === 'list' && upgradeFor && (
        <UpgradeUserModal
          source={upgradeFor}
          onClose={() => setUpgradeFor(null)}
          onUpgraded={async () => {
            await revalidateMetadataCache();
            void refresh();
          }}
        />
      )}
    </AdminPanel>
  );
}

export default UserManagementPanel;
