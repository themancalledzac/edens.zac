'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { GenerateInviteButton } from '@/app/(admin)/admin/users/GenerateInviteButton';
import { useAdminPanelSeed } from '@/app/components/AdminPanel/AdminPanelSeedContext';
import { revalidateMetadataCache } from '@/app/components/ContentCollection/edit/collectionEditUtils';
import { ListPanel, ListRow, ListRows } from '@/app/components/ListPanel/ListPanel';
import { MergeIdentityModal } from '@/app/components/MergeIdentityModal/MergeIdentityModal';
import { Button } from '@/app/components/ui/Button/Button';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { LoadingText } from '@/app/components/ui/StatusText/LoadingText';
import { StaleNotice } from '@/app/components/ui/StatusText/StaleNotice';
import { UpgradeUserModal } from '@/app/components/UpgradeUserModal/UpgradeUserModal';
import { UserForm } from '@/app/components/UserForm/UserForm';
import { useCachedPanelData } from '@/app/hooks/useCachedPanelData';
import { listUsers } from '@/app/lib/api/users';
import { type AdminUserSummary } from '@/app/types/User';
import { compareNames } from '@/app/utils/sortByName';

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
 * to {@link ListPanel}. This panel only intervenes to force itself open when the body gains
 * something the user must see: the create and edit forms both live in the body, so opening one
 * while collapsed would otherwise look like the "+ New User" button did nothing.
 *
 * A failed load gets its own body branch, checked ahead of the empty state — an admin whose
 * backend is down must never be told there are no users, an invitation to create a duplicate
 * account. `useCachedPanelData` owns that distinction now: `loadError` is set only when a load
 * fails with nothing cached to show, while a failed background revalidation keeps the cached
 * list on screen and raises `revalidationFailed` instead — which the {@link StaleNotice} above
 * the list reports, so accounts served from a dead backend are never presented as current. The
 * list itself is cached across remounts (the hub re-packs — and remounts panels — whenever one
 * collapses) and across page loads, so it paints instantly and only re-renders when a fetch
 * actually changes it.
 *
 * On the hub it starts warmer still: the page fetched the user list server-side to size this panel,
 * and hands it over as the cache seed, so the very first paint is the list rather than "Loading…".
 * The seed belongs to the unfiltered fetch only — turning on "show tag-only people" is a different
 * request under its own cache key, so that variant loads on demand as it always has.
 *
 * Anything that changed the underlying users — a create, an edit, a merge, an upgrade — refreshes
 * with errors reported, so a mutation that succeeded but whose list refresh then failed surfaces
 * as `loadError` (which carries a Retry) rather than as a list that quietly did not update. It
 * still reconciles underneath the list rather than blanking a correct one. Cancel refreshes
 * silently, having changed nothing.
 *
 * The {@link LoadingText} region sits outside the `view.mode === 'list'` guard, not inside it. It
 * has to outlive the branches it reports on (see its docblock), and `backToList` flips the view and
 * re-enters loading in the same commit — scoped to the list view, the region would be inserted with
 * its text already in place on every return from a form, which is the case that fails to announce.
 * Empty it is zero-height, so standing in front of the forms costs nothing.
 */
export function UserManagementPanel({ collapsed, onCollapsedChange }: UserManagementPanelProps) {
  const router = useRouter();
  const seed = useAdminPanelSeed();
  const [view, setView] = useState<View>({ mode: 'list' });
  const [showPeople, setShowPeople] = useState(false);
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
      [...(users ?? [])].sort((a, b) =>
        compareNames(a.displayName ?? a.email ?? '', b.displayName ?? b.email ?? '')
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
        <ListRows>
          {sortedUsers.map(user => (
            <ListRow
              key={user.id}
              // A tag-only PERSON has no account page to reach, so it gets no `onActivate` and
              // ListRow renders its identity as a static section rather than a button. That is the
              // whole of the old .rowStatic / .rowMain fork — the identity markup itself was
              // duplicated across both arms and is written once here.
              onActivate={
                user.status === 'PERSON'
                  ? undefined
                  : () => router.push(`/admin/users/${user.id}`)
              }
              left={
                <span className={styles.identity}>
                  <span className={styles.nameLine}>
                    <span className={styles.dot} data-status={user.status} aria-hidden="true" />
                    <span className={styles.name}>{user.displayName ?? '—'}</span>
                    <span className={styles.srOnly}>{user.status}</span>
                  </span>
                  <span className={styles.email}>{user.email ?? ''}</span>
                </span>
              }
              right={
                user.status === 'PERSON' ? (
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
                )
              }
            />
          ))}
        </ListRows>
      );
    }
  }

  // The CONTROL is conditional, its SLOT is not: ListPanel always renders the middle wrapper, so
  // the header keeps three grid columns and the right rail holds still when a form view hides the
  // filter. Guarding the slot itself would slide the action into the middle column on every mode
  // change.
  const headerMiddle =
    view.mode === 'list' ? (
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={showPeople}
          onChange={e => setShowPeople(e.target.checked)}
        />
        Show tag-only people
      </label>
    ) : null;

  // `ghost`, not `secondary`: this is a panel-scope action and should not read with the same weight
  // as the row-level controls beneath it.
  const headerRight =
    view.mode === 'list' ? (
      <Button variant="ghost" size="sm" onClick={() => openView({ mode: 'create' })}>
        + New User
      </Button>
    ) : (
      <Button variant="ghost" size="sm" onClick={backToList}>
        ← Back
      </Button>
    );

  return (
    <ListPanel
      title={headerTitle}
      ariaLabel="User management"
      headerMiddle={headerMiddle}
      headerRight={headerRight}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
    >
      <LoadingText isLoading={loading}>Loading users…</LoadingText>

      {view.mode === 'create' && (
        <UserForm mode="create" onSuccess={backToListAfterChange} onCancel={backToList} />
      )}

      {view.mode === 'edit' && (
        <UserForm
          mode="edit"
          user={view.user}
          onSuccess={backToListAfterChange}
          onCancel={backToList}
        />
      )}

      {view.mode === 'list' && !loading && !loadError && revalidationFailed && <StaleNotice />}

      {view.mode === 'list' && listBody}

      {view.mode === 'list' && mergeFor && (
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

      {view.mode === 'list' && upgradeFor && (
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
