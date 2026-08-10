'use client';

import { useSearchParams } from 'next/navigation';
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AdminPanel } from '@/app/components/AdminPanel/AdminPanel';
import { Button } from '@/app/components/ui/Button/Button';
import { Field } from '@/app/components/ui/Field/Field';
import { FormError } from '@/app/components/ui/Field/FormError';
import { Input } from '@/app/components/ui/Field/Input';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { LoadingText } from '@/app/components/ui/StatusText/LoadingText';
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
 * {@link AdminPanel}. This panel only intervenes to force itself open when the body gains something
 * the user must see: the create form and the detail editor both live in the body, so opening one
 * while collapsed would otherwise look like the control did nothing.
 *
 * A failed load gets its own body branch, checked ahead of the empty state. `listRoles` throws
 * `ApiError` out of `fetchAdminGetApi` on any non-OK response, so a `catch`-less `refresh` would
 * leave `roles` at `[]` and tell an admin whose backend is down that there are no roles — an
 * invitation to create a duplicate. Failed and empty must never look alike here.
 *
 * The {@link LoadingText} region sits outside the `view.mode === 'list'` guard, not inside it. It
 * has to outlive the branches it reports on (see its docblock), and `backToList` flips the view and
 * re-enters loading in the same commit.
 */
export function RolesPanel({ collapsed, onCollapsedChange }: RolesPanelProps) {
  const searchParams = useSearchParams();
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ mode: 'list' });
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setRoles(await listRoles());
    } catch (error) {
      logger.error('RolesPanel', 'Failed to load roles', error);
      setRoles([]);
      setLoadError('Could not load roles. Retry, or check that the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const backToList = useCallback(() => {
    setView({ mode: 'list' });
    setCreateError(null);
    setName('');
    void refresh();
  }, [refresh]);

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
      backToList();
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
      listBody = (
        <div className={styles.loadError} role="alert">
          <p className={styles.error}>{loadError}</p>
          <Button variant="secondary" size="sm" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      );
    } else if (sortedRoles.length === 0) {
      listBody = <EmptyState>No roles yet. Use “+ New Role” to create one.</EmptyState>;
    } else {
      listBody = (
        <>
          <ul className={styles.list}>
            {sortedRoles.map(role => (
              <li key={role.id} className={styles.row}>
                <button
                  type="button"
                  className={styles.rowMain}
                  onClick={() => openView({ mode: 'detail', role })}
                >
                  <span className={styles.name}>{role.name}</span>
                </button>
                <button
                  type="button"
                  className={styles.deleteButton}
                  aria-label={`Delete role ${role.name}`}
                  disabled={deletingId === role.id}
                  onClick={() => void handleDelete(role)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          {deleteError && <p className={styles.error}>{deleteError}</p>}
        </>
      );
    }
  }

  const headerAction =
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
    <AdminPanel
      title={headerTitle}
      ariaLabel="Role management"
      action={headerAction}
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

      {view.mode === 'detail' && <RoleDetailView role={view.role} onDeleted={backToList} />}

      {view.mode === 'list' && listBody}
    </AdminPanel>
  );
}

export default RolesPanel;
