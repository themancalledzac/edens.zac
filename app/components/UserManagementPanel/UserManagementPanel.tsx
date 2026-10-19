'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

import { GenerateInviteButton } from '@/app/(site)/(admin)/admin/users/GenerateInviteButton';
import { revalidateMetadataCache } from '@/app/components/ContentCollection/edit/collectionEditUtils';
import { useAdminPanelSeed } from '@/app/components/ListPanel/AdminPanelSeedContext';
import { ListDetailSheet } from '@/app/components/ListPanel/ListDetailSheet';
import {
  ListPanel,
  type ListPanelShell,
  ListRow,
  ListRows,
  PanelAction,
} from '@/app/components/ListPanel/ListPanel';
import { PanelBody } from '@/app/components/ListPanel/PanelBody';
import { MergeIdentityModal } from '@/app/components/MergeIdentityModal/MergeIdentityModal';
import { Button } from '@/app/components/ui/Button/Button';
import { Chip } from '@/app/components/ui/Chip/Chip';
import { UpgradeUserModal } from '@/app/components/UpgradeUserModal/UpgradeUserModal';
import { UserForm } from '@/app/components/UserForm/UserForm';
import { UserRolesSection } from '@/app/components/UserForm/UserRolesSection';
import { useCachedPanelData } from '@/app/hooks/useCachedPanelData';
import { listUsers, updateUser } from '@/app/lib/api/users';
import { type AdminUserSummary, type UserStatus } from '@/app/types/User';
import { compareNames } from '@/app/utils/sortByName';

import styles from './UserManagementPanel.module.scss';

type View = { mode: 'list' } | { mode: 'create' };

const STATUS_OPTIONS: UserStatus[] = ['INVITED', 'ACTIVE', 'DISABLED'];

/**
 * Predicates the detail sheet branches on, held on an object so a test can replace one and watch
 * the sheet's contents change.
 */
export const userPanelGuards = {
  offersPersonActions(user: AdminUserSummary): boolean {
    return user.status === 'PERSON';
  },
};

interface UserManagementPanelProps {
  /** The hub's tab strip and collapse state; absent when mounted on its own. */
  shell?: ListPanelShell;
}

/**
 * Tall, self-contained admin panel that owns the user list and swaps its body between a scrollable
 * list and a create form in the same fixed-size space. The Users tab of the `/admin` hub's list
 * panel.
 *
 * Each row is one line (status dot, name, muted email, and "Invited" when the invite is pending)
 * and the row itself is the only control. Tapping it opens a {@link ListDetailSheet} holding the
 * status select, role chips with add, Reset password or Resend ({@link GenerateInviteButton}),
 * Open space (`/admin/users/[id]`) and Edit, which swaps the sheet's content for the
 * {@link UserForm}. Tag-only PERSON rows have no account, so their sheet offers "Merge…" (fold into
 * an existing account) and "Upgrade" (promote in place) instead, gated by
 * {@link userPanelGuards.offersPersonActions}. Both open their modal and close the sheet.
 *
 * The tab strip and collapsed state arrive as `shell` and pass straight through to
 * {@link ListPanel}; collapse state lives in the host. This panel only intervenes to force itself
 * open when the body gains the create form, which would otherwise look like "+ New User" did
 * nothing.
 *
 * The "People" {@link Chip} is the body's first line (`toolbar`): it filters this list, so it
 * sits on the list, and the header keeps exactly one action.
 *
 * Loading, a load failure with Retry, the empty state and the stale notice all render through
 * {@link PanelBody}, which checks the failure ahead of the empty state so a dead backend is never
 * reported as "no users". The list is cached across remounts and page loads via
 * `useCachedPanelData`; on the hub it starts from the server-fetched seed. The seed belongs to the
 * unfiltered fetch only; turning on People is a different request under its own cache key.
 *
 * Anything that changed the underlying users (a create, an edit, a status change, a merge, an
 * upgrade) refreshes with errors reported, so a mutation whose list refresh then failed surfaces as
 * `loadError` with a Retry rather than as a list that quietly did not update. Cancel refreshes
 * silently, having changed nothing.
 *
 * The create form renders in the panel body under `viewTitle`, never in the sheet. The loading
 * region lives in {@link PanelBody} and stays mounted across view changes so it announces each
 * transition.
 */
export function UserManagementPanel({ shell }: UserManagementPanelProps) {
  const seed = useAdminPanelSeed();
  const [view, setView] = useState<View>({ mode: 'list' });
  const [showPeople, setShowPeople] = useState(false);
  const [sheetUserId, setSheetUserId] = useState<number | null>(null);
  const [sheetEditing, setSheetEditing] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [mergeFor, setMergeFor] = useState<AdminUserSummary | null>(null);
  const [upgradeFor, setUpgradeFor] = useState<AdminUserSummary | null>(null);

  const {
    data: users,
    loading,
    loadError,
    revalidationFailed,
    refresh,
  } = useCachedPanelData(
    showPeople ? 'users:people' : 'users:base',
    () => listUsers({ includePeople: showPeople }),
    'Could not load users. Retry, or check that the backend is running.',
    showPeople ? null : seed.users
  );

  const returnToList = useCallback(
    (reportErrors: boolean) => {
      setView({ mode: 'list' });
      void refresh({ reportErrors });
    },
    [refresh]
  );

  const backToList = useCallback(() => returnToList(false), [returnToList]);
  const backToListAfterChange = useCallback(() => returnToList(true), [returnToList]);

  const onCollapsedChange = shell?.onCollapsedChange;
  const openCreate = useCallback(() => {
    setView({ mode: 'create' });
    onCollapsedChange?.(false);
  }, [onCollapsedChange]);

  const sortedUsers = useMemo(
    () =>
      [...(users ?? [])].sort((a, b) =>
        compareNames(a.displayName ?? a.email ?? '', b.displayName ?? b.email ?? '')
      ),
    [users]
  );

  const sheetUser = sortedUsers.find(u => u.id === sheetUserId) ?? null;

  const closeSheet = useCallback(() => {
    setSheetUserId(null);
    setSheetEditing(false);
    setStatusError(null);
  }, []);

  const openSheet = useCallback((user: AdminUserSummary) => {
    setSheetUserId(user.id);
    setSheetEditing(false);
    setStatusError(null);
  }, []);

  const changeStatus = async (user: AdminUserSummary, status: UserStatus) => {
    setStatusError(null);
    try {
      await updateUser(user.id, { status });
      void refresh({ reportErrors: true });
    } catch {
      setStatusError('Could not change the status. Please try again.');
    }
  };

  const inList = view.mode === 'list';
  const viewTitle = view.mode === 'create' ? 'New User' : undefined;

  const toolbar =
    view.mode === 'list' ? (
      <Chip label="People" active={showPeople} onToggle={() => setShowPeople(!showPeople)} />
    ) : null;

  const action =
    view.mode === 'list' ? (
      <PanelAction onClick={openCreate}>+ New User</PanelAction>
    ) : (
      <PanelAction onClick={backToList}>← Back</PanelAction>
    );

  return (
    <ListPanel
      {...shell}
      title="Users"
      ariaLabel="User management"
      viewTitle={viewTitle}
      toolbar={toolbar}
      action={action}
    >
      <PanelBody
        loading={loading}
        loadError={inList ? loadError : null}
        revalidationFailed={inList && revalidationFailed}
        onRetry={() => void refresh()}
        loadingLabel="Loading users…"
        isEmpty={inList && sortedUsers.length === 0}
        emptyLabel="No users yet. Use “+ New User” to create one."
      >
        {inList ? (
          <ListRows>
            {sortedUsers.map(user => (
              <ListRow
                key={user.id}
                primary={user.displayName ?? '—'}
                secondary={user.email ?? undefined}
                fact={user.status === 'INVITED' ? 'Invited' : undefined}
                leading={
                  <>
                    <span className={styles.dot} data-status={user.status} aria-hidden="true" />
                    <span className={styles.srOnly}>{user.status}</span>
                  </>
                }
                onActivate={() => openSheet(user)}
              />
            ))}
          </ListRows>
        ) : (
          <UserForm mode="create" onSuccess={backToListAfterChange} onCancel={backToList} />
        )}
      </PanelBody>

      {sheetUser && (
        <ListDetailSheet
          open
          onClose={closeSheet}
          title={sheetUser.displayName ?? sheetUser.email ?? 'User'}
          footer={
            sheetEditing ? undefined : userPanelGuards.offersPersonActions(sheetUser) ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setMergeFor(sheetUser);
                    closeSheet();
                  }}
                >
                  Merge…
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setUpgradeFor(sheetUser);
                    closeSheet();
                  }}
                >
                  Upgrade
                </Button>
              </>
            ) : (
              <>
                <GenerateInviteButton
                  userId={sheetUser.id}
                  email={sheetUser.email ?? ''}
                  status={sheetUser.status}
                />
                <Link href={`/admin/users/${sheetUser.id}`} className={styles.openSpace}>
                  Open space
                </Link>
                <Button variant="secondary" size="sm" onClick={() => setSheetEditing(true)}>
                  Edit
                </Button>
              </>
            )
          }
        >
          {sheetEditing ? (
            <UserForm
              mode="edit"
              user={sheetUser}
              onSuccess={() => {
                closeSheet();
                backToListAfterChange();
              }}
              onCancel={() => setSheetEditing(false)}
            />
          ) : (
            <div className={styles.sheetBody}>
              <div className={styles.sheetIdentity}>
                <span className={styles.badge}>
                  <span className={styles.dot} data-status={sheetUser.status} aria-hidden="true" />
                  {sheetUser.status}
                </span>
                {sheetUser.email && <span className={styles.sheetEmail}>{sheetUser.email}</span>}
              </div>
              {!userPanelGuards.offersPersonActions(sheetUser) && (
                <>
                  <select
                    aria-label="Status"
                    className={styles.statusSelect}
                    value={sheetUser.status}
                    onChange={e => void changeStatus(sheetUser, e.target.value as UserStatus)}
                  >
                    {STATUS_OPTIONS.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {statusError && <p role="alert">{statusError}</p>}
                  <UserRolesSection userId={sheetUser.id} compact />
                </>
              )}
            </div>
          )}
        </ListDetailSheet>
      )}

      {mergeFor && (
        <MergeIdentityModal
          source={mergeFor}
          candidates={sortedUsers.filter(u => u.id !== mergeFor.id)}
          open
          onClose={() => setMergeFor(null)}
          onMerged={async () => {
            setMergeFor(null);
            await revalidateMetadataCache();
            void refresh({ reportErrors: true });
          }}
        />
      )}

      {upgradeFor && (
        <UpgradeUserModal
          source={upgradeFor}
          onClose={() => setUpgradeFor(null)}
          onUpgraded={async () => {
            await revalidateMetadataCache();
            void refresh({ reportErrors: true });
          }}
        />
      )}
    </ListPanel>
  );
}

export default UserManagementPanel;
