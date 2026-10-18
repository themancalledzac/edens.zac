'use client';

import { useSearchParams } from 'next/navigation';
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import { Button } from '@/app/components/ui/Button/Button';
import { Field } from '@/app/components/ui/Field/Field';
import { FormError } from '@/app/components/ui/Field/FormError';
import { Input } from '@/app/components/ui/Field/Input';
import { useCachedPanelData } from '@/app/hooks/useCachedPanelData';
import { ApiError } from '@/app/lib/api/core';
import { createRole, getRole, listRoles } from '@/app/lib/api/roles';
import { type RoleSummary } from '@/app/types/Role';
import { compareNames } from '@/app/utils/sortByName';

import { RoleDetailView } from './RoleDetailView';
import styles from './RolesPanel.module.scss';

type View = { mode: 'list' } | { mode: 'create' };

interface RoleCounts {
  members: number;
  collections: number;
}

/**
 * The muted half of a role row. Absent until the role's detail has been read, so a row never
 * claims "0 members" for a role whose membership simply has not arrived.
 */
function roleCounts(counts: RoleCounts | undefined): string | undefined {
  if (!counts) return undefined;
  const { members, collections } = counts;
  return `${members} ${members === 1 ? 'member' : 'members'} · ${collections} ${
    collections === 1 ? 'collection' : 'collections'
  }`;
}

interface RolesPanelProps {
  /** The hub's tab strip and collapse state; absent when mounted on its own. */
  shell?: ListPanelShell;
}

/**
 * Admin panel that owns the role list. A role is one line: its name, then "N members · M
 * collections" muted after a middle dot. The list endpoint returns only id and name, so the counts
 * are read per role with `getRole` after the list paints and fill in as they arrive. The reads
 * wait one tick so the list paints first. Tapping a row, or loading `/admin?role=[id]` (which is
 * what `UserRolesSection` links to, see `resolveAdminListTab`), opens a {@link ListDetailSheet}
 * holding {@link RoleDetailView}, whose Delete role button is the only delete. Closing the sheet
 * drops `?role=` from the URL with `history.replaceState`. The "+ New Role" create form stays in
 * the panel body under the view title.
 *
 * The tab strip and collapsed state arrive as `shell` and pass straight through to
 * {@link ListPanel}. This panel only asks the host to expand when the create form opens or a
 * deep link names a role, since the form lives in the body and would otherwise look like a dead
 * control.
 *
 * The body renders through {@link PanelBody}: a failed load is its own branch ahead of the empty
 * state, so a dead backend is never reported as "no roles", and a failed background revalidation
 * keeps the cached list up under a stale notice. `setData` is the cache's write-through, so a
 * deleted role cannot resurrect from stale cache on the next remount.
 *
 * Returning to the list after a change reconciles underneath the list rather than blanking it, but
 * announces a failure; a plain Cancel changed nothing, so it reconciles silently.
 */
export function RolesPanel({ shell }: RolesPanelProps) {
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>({ mode: 'list' });
  const [openRole, setOpenRole] = useState<RoleSummary | null>(null);
  const [name, setName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const seed = useAdminPanelSeed();

  const { data, loading, loadError, revalidationFailed, refresh } = useCachedPanelData(
    'roles',
    listRoles,
    'Could not load roles. Retry, or check that the backend is running.',
    seed.roles
  );
  const roles = useMemo(() => data ?? [], [data]);
  const [countsById, setCountsById] = useState<Record<number, RoleCounts>>({});
  const requestedCounts = useRef<Set<number>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => {
      for (const { id } of roles) {
        if (requestedCounts.current.has(id)) continue;
        requestedCounts.current.add(id);
        getRole(id)
          .then(detail => {
            if (!detail) return;
            setCountsById(previous => ({
              ...previous,
              [id]: { members: detail.members.length, collections: detail.collections.length },
            }));
          })
          .catch(() => requestedCounts.current.delete(id));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [roles]);

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

  const onCollapsedChange = shell?.onCollapsedChange;
  const openCreate = useCallback(() => {
    setView({ mode: 'create' });
    onCollapsedChange?.(false);
  }, [onCollapsedChange]);

  /**
   * Keyed on the id rather than a "have we done this yet" flag, so arriving from a second role
   * link opens that role too — the hub does not remount between two soft navigations to /admin.
   */
  const openedFromUrl = useRef<number | null>(null);

  useEffect(() => {
    const requested = Number(searchParams.get('role'));
    if (!requested || openedFromUrl.current === requested) return;
    const role = roles.find(r => r.id === requested);
    if (!role) return;
    openedFromUrl.current = requested;
    setOpenRole(role);
  }, [roles, searchParams]);

  const closeSheet = useCallback(() => {
    setOpenRole(null);
    const url = new URL(window.location.href);
    if (!url.searchParams.has('role')) return;
    url.searchParams.delete('role');
    window.history.replaceState(window.history.state, '', url);
  }, []);

  const handleDeleted = useCallback(() => {
    closeSheet();
    void refresh({ reportErrors: true });
  }, [closeSheet, refresh]);

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

  const viewTitle = view.mode === 'create' ? 'New Role' : undefined;

  const action =
    view.mode === 'list' ? (
      <PanelAction onClick={openCreate}>+ New Role</PanelAction>
    ) : (
      <PanelAction onClick={backToList}>← Back</PanelAction>
    );

  return (
    <ListPanel
      {...shell}
      title="Roles"
      ariaLabel="Role management"
      viewTitle={viewTitle}
      action={action}
    >
      {view.mode === 'create' ? (
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
      ) : (
        <PanelBody
          loading={loading}
          loadError={loadError}
          revalidationFailed={revalidationFailed}
          onRetry={() => void refresh()}
          loadingLabel="Loading roles…"
          isEmpty={sortedRoles.length === 0}
          emptyLabel="No roles yet. Use “+ New Role” to create one."
        >
          <ListRows>
            {sortedRoles.map(role => (
              <ListRow
                key={role.id}
                primary={role.name}
                secondary={roleCounts(countsById[role.id])}
                onActivate={() => setOpenRole(role)}
              />
            ))}
          </ListRows>
        </PanelBody>
      )}

      <ListDetailSheet open={openRole !== null} onClose={closeSheet} title={openRole?.name ?? ''}>
        {openRole && <RoleDetailView role={openRole} onDeleted={handleDeleted} />}
      </ListDetailSheet>
    </ListPanel>
  );
}
