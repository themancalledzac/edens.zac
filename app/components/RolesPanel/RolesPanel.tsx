'use client';

import { useSearchParams } from 'next/navigation';
import {
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAdminPanelSeed } from '@/app/components/AdminPanel/AdminPanelSeedContext';
import { ListPanel, ListRow, ListRows } from '@/app/components/ListPanel/ListPanel';
import { Button } from '@/app/components/ui/Button/Button';
import { Field } from '@/app/components/ui/Field/Field';
import { FormError } from '@/app/components/ui/Field/FormError';
import { Input } from '@/app/components/ui/Field/Input';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { LoadError } from '@/app/components/ui/StatusText/LoadError';
import { LoadingText } from '@/app/components/ui/StatusText/LoadingText';
import { StaleNotice } from '@/app/components/ui/StatusText/StaleNotice';
import { useCachedPanelData } from '@/app/hooks/useCachedPanelData';
import { ApiError } from '@/app/lib/api/core';
import { createRole, deleteRole, listRoles } from '@/app/lib/api/roles';
import { type RoleSummary } from '@/app/types/Role';
import { logger } from '@/app/utils/logger';
import { compareNames } from '@/app/utils/sortByName';

import { RoleDetailView } from './RoleDetailView';
import styles from './RolesPanel.module.scss';

type View = { mode: 'list' } | { mode: 'create' } | { mode: 'detail'; role: RoleSummary };

interface RolesPanelProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

/**
 * Tall, self-contained admin panel that owns the role list and swaps its body between a scrollable
 * list, a create form, and a role's detail editor — all in the same fixed-size space. Lives on the
 * `/admin` hub alongside {@link UserManagementPanel} and {@link MessagesPanel}, and replaces the
 * former standalone `/admin/roles` and `/admin/roles/[roleId]` routes.
 *
 * A role is an admin-curated group of users that carries per-collection grants; joining the role is
 * how a user inherits them. Opening one swaps the body rather than navigating, so an admin can move
 * through several roles without losing the hub.
 *
 * A role stays addressable even without a route of its own: `/admin?role=[id]` opens that role's
 * detail directly, which is what `UserRolesSection` links a user's role names to. The param is an
 * entry point only — moving around inside the panel does not rewrite the URL, so a Back to the
 * list leaves `?role=` standing and a reload would reopen that role.
 *
 * Deleting is offered twice on purpose: the per-row × here for the common case, and a Delete role
 * button inside {@link RoleDetailView} for when you have opened a role to check what it grants
 * before removing it. Both confirm first, matching the rest of the admin surface.
 *
 * Collapsed state is owned by `AdminPanelRenderer` (it sizes the box) and passed straight through to
 * {@link ListPanel}. This panel only intervenes to force itself open when the body gains something
 * the user must see: the create form and the detail editor both live in the body, so opening one
 * while collapsed would otherwise look like the control did nothing.
 *
 * A failed load gets its own body branch, checked ahead of the empty state — an admin whose
 * backend is down must never be told there are no roles, an invitation to create a duplicate.
 * `useCachedPanelData` owns that distinction: `loadError` is set only when a load fails with
 * nothing cached to show, while a failed background revalidation keeps the cached list up and
 * raises `revalidationFailed` instead — which is what the {@link StaleNotice} above the list
 * reports, so a list served from a dead backend is never presented as current. The optimistic
 * delete's `setRoles` wraps the hook's write-through `setData`, so a deleted role cannot
 * resurrect from stale cache on the next remount, nor from a fetch that was already in the air
 * when it was deleted.
 *
 * On the hub the first paint is warmer than that: the page fetched the role list server-side to
 * size this panel, and hands it over as the cache seed, so the list is on screen before any client
 * fetch — which then reconciles underneath it.
 *
 * Returning to the list after a change (`backToListAfterChange`) reconciles underneath the list
 * rather than blanking it, but announces a failure; a plain Cancel changed nothing, so it
 * reconciles silently. A create that succeeded and then failed to refresh has to say so, and it
 * lands in `loadError`, which carries a Retry.
 *
 * The {@link LoadingText} region sits outside the `view.mode === 'list'` guard, not inside it. It
 * has to outlive the branches it reports on (see its docblock), and `backToList` flips the view and
 * re-enters loading in the same commit.
 */
export function RolesPanel({ collapsed, onCollapsedChange }: RolesPanelProps) {
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>({ mode: 'list' });
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const seed = useAdminPanelSeed();

  const { data, loading, loadError, revalidationFailed, refresh, setData } = useCachedPanelData(
    'roles',
    listRoles,
    'Could not load roles. Retry, or check that the backend is running.',
    seed.roles
  );
  const roles = useMemo(() => data ?? [], [data]);

  const setRoles = useCallback<Dispatch<SetStateAction<RoleSummary[]>>>(
    action =>
      setData(previous => {
        const base = previous ?? [];
        return typeof action === 'function' ? action(base) : action;
      }),
    [setData]
  );

  const returnToList = useCallback(
    (reportErrors: boolean) => {
      setView({ mode: 'list' });
      setCreateError(null);
      setName('');
      void refresh({ reportErrors });
    },
    [refresh]
  );

  const backToList = useCallback(() => returnToList(false), [returnToList]);
  const backToListAfterChange = useCallback(() => returnToList(true), [returnToList]);

  // The create form and the detail editor both render in the panel body, so entering one has to
  // open the panel — otherwise the header swaps to "New Role" with nothing beneath it.
  const openView = useCallback(
    (next: View) => {
      setView(next);
      onCollapsedChange?.(false);
    },
    [onCollapsedChange]
  );

  // Keyed on the id rather than a "have we done this yet" flag, so arriving from a second role
  // link opens that role too — the hub does not remount between two soft navigations to /admin.
  const openedFromUrl = useRef<number | null>(null);

  useEffect(() => {
    const requested = Number(searchParams.get('role'));
    if (!requested || openedFromUrl.current === requested) return;
    const role = roles.find(r => r.id === requested);
    if (!role) return;
    openedFromUrl.current = requested;
    openView({ mode: 'detail', role });
  }, [roles, searchParams, openView]);

  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => compareNames(a.name, b.name)),
    [roles]
  );

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null);
    if (!name.trim()) {
      setCreateError('Role name is required.');
      return;
    }
    try {
      setSubmitting(true);
      await createRole({ name: name.trim() });
      backToListAfterChange();
    } catch (error) {
      setCreateError(
        error instanceof ApiError && error.status === 409
          ? 'A role with that name already exists.'
          : 'Failed to create role. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Optimistic, with rollback — the same shape as useMessageDelete: the row leaves immediately and
  // comes back if the backend refuses, so a failed delete never reads as a successful one.
  const handleDelete = async (role: RoleSummary) => {
    if (!window.confirm(`Delete role “${role.name}”? Everyone in it loses that access.`)) return;
    setDeleteError(null);
    setDeletingId(role.id);
    const previous = roles;
    setRoles(current => current.filter(r => r.id !== role.id));
    try {
      await deleteRole(role.id);
    } catch (error) {
      logger.error('RolesPanel', 'Failed to delete role', error);
      setRoles(previous);
      setDeleteError(`Failed to delete role “${role.name}”.`);
    } finally {
      setDeletingId(null);
    }
  };

  const headerTitle =
    view.mode === 'create' ? 'New Role' : view.mode === 'detail' ? view.role.name : 'Roles';

  let listBody: ReactNode = null;
  if (!loading) {
    if (loadError) {
      listBody = <LoadError message={loadError} onRetry={() => void refresh()} />;
    } else if (sortedRoles.length === 0) {
      listBody = <EmptyState>No roles yet. Use “+ New Role” to create one.</EmptyState>;
    } else {
      listBody = (
        <>
          <ListRows>
            {sortedRoles.map(role => (
              <ListRow
                key={role.id}
                // No `ariaLabel`: the activation button names itself from the role name it
                // contains, which is what it did as `.rowMain` and what the tests read.
                onActivate={() => openView({ mode: 'detail', role })}
                left={<span className={styles.name}>{role.name}</span>}
                right={
                  <button
                    type="button"
                    className={styles.deleteButton}
                    aria-label={`Delete role ${role.name}`}
                    disabled={deletingId === role.id}
                    onClick={() => void handleDelete(role)}
                  >
                    ×
                  </button>
                }
              />
            ))}
          </ListRows>
          {deleteError && <p className={styles.error}>{deleteError}</p>}
        </>
      );
    }
  }

  const headerRight =
    view.mode === 'list' ? (
      <Button variant="secondary" size="sm" onClick={() => openView({ mode: 'create' })}>
        + New Role
      </Button>
    ) : (
      <Button variant="ghost" size="sm" onClick={backToList}>
        ← Back
      </Button>
    );

  return (
    <ListPanel
      title={headerTitle}
      ariaLabel="Role management"
      headerRight={headerRight}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
    >
      <LoadingText isLoading={loading}>Loading roles…</LoadingText>

      {view.mode === 'create' && (
        <form onSubmit={handleCreate} className={styles.createForm}>
          <Field label="New role name" htmlFor="role-name">
            <Input
              id="role-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="power"
              autoComplete="off"
              disabled={submitting}
            />
          </Field>
          <div className={styles.formActions}>
            <Button type="submit" size="sm" loading={submitting}>
              {submitting ? 'Creating…' : 'Create role'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={backToList}>
              Cancel
            </Button>
          </div>
          {createError && <FormError>{createError}</FormError>}
        </form>
      )}

      {view.mode === 'detail' && (
        <RoleDetailView role={view.role} onDeleted={backToListAfterChange} />
      )}

      {view.mode === 'list' && !loading && !loadError && revalidationFailed && <StaleNotice />}

      {view.mode === 'list' && listBody}
    </ListPanel>
  );
}

export default RolesPanel;
