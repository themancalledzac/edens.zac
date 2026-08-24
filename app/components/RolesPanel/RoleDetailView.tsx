'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import { FormError } from '@/app/components/ui/Field/FormError';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { LoadError } from '@/app/components/ui/StatusText/LoadError';
import { LoadingText } from '@/app/components/ui/StatusText/LoadingText';
import { getAllCollectionsAdmin } from '@/app/lib/api/collections';
import {
  addRoleMember,
  deleteRole,
  getRole,
  removeRoleGrant,
  removeRoleMember,
  setRoleGrant,
} from '@/app/lib/api/roles';
import { listUsers } from '@/app/lib/api/users';
import { type CollectionModel } from '@/app/types/Collection';
import {
  type AccessLevel,
  type RoleDetail,
  type RoleMemberRow,
  type RoleSummary,
} from '@/app/types/Role';
import { type AdminUserSummary } from '@/app/types/User';
import { logger } from '@/app/utils/logger';
import { compareNames } from '@/app/utils/sortByName';

import styles from './RolesPanel.module.scss';

interface RoleDetailViewProps {
  role: RoleSummary;
  onDeleted: () => void;
}

/** How a member is labelled: their name, falling back to the email, then to a bare id. */
function memberLabel(member: RoleMemberRow): string {
  return member.name ?? member.email ?? `User #${member.userId}`;
}

/** The same fallback chain for a user who is not a member yet — `displayName` is the name field. */
function userLabel(user: AdminUserSummary): string {
  return user.displayName ?? user.email ?? `User #${user.id}`;
}

/**
 * A role's members (the users who inherit its grants) and its per-collection grants
 * (GENERAL = view; CLIENT = download/tag/star), rendered inside {@link RolesPanel}'s body.
 *
 * Every list here is sorted by the label the admin actually reads — collections by title, people by
 * name — because these are pick-from-a-list controls, and backend order is insertion order. People
 * are labelled name-first: the email is the database's idea of who someone is, not the admin's.
 *
 * Every mutation re-fetches the role rather than patching local state, so a grant that the backend
 * refused or transformed (the waterfall materializes grants down to child collections) can never
 * leave a stale row on screen.
 */
export function RoleDetailView({ role, onDeleted }: RoleDetailViewProps) {
  const [detail, setDetail] = useState<RoleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionModel[]>([]);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [addCollectionId, setAddCollectionId] = useState('');
  const [addLevel, setAddLevel] = useState<AccessLevel>('GENERAL');
  const [addUserId, setAddUserId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setDetail(await getRole(role.id));
    } catch (error_) {
      logger.error('RoleDetailView', 'Failed to load role', error_);
      setDetail(null);
      setLoadError('Could not load this role. Retry, or check that the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [role.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    getAllCollectionsAdmin()
      .then(setCollections)
      .catch(() => setCollections([]));
    listUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  const grantedIds = useMemo(
    () => new Set((detail?.collections ?? []).map(c => c.collectionId)),
    [detail]
  );
  const memberIds = useMemo(() => new Set((detail?.members ?? []).map(m => m.userId)), [detail]);

  const grantedCollections = useMemo(
    () => [...(detail?.collections ?? [])].sort((a, b) => compareNames(a.title, b.title)),
    [detail]
  );

  const members = useMemo(
    () => [...(detail?.members ?? [])].sort((a, b) => compareNames(memberLabel(a), memberLabel(b))),
    [detail]
  );

  const grantableCollections = useMemo(
    () =>
      collections
        .filter(c => typeof c.id === 'number' && !grantedIds.has(c.id))
        .sort((a, b) => compareNames(a.title, b.title)),
    [collections, grantedIds]
  );

  const addableUsers = useMemo(
    () =>
      users
        .filter(u => u.status !== 'PERSON' && !memberIds.has(u.id))
        .sort((a, b) => compareNames(userLabel(a), userLabel(b))),
    [users, memberIds]
  );

  async function run(action: () => Promise<void>, failMessage: string) {
    setError(null);
    try {
      await action();
      await load();
    } catch {
      setError(failMessage);
    }
  }

  const onAddGrant = () =>
    addCollectionId &&
    run(
      () =>
        setRoleGrant(role.id, Number(addCollectionId), addLevel).then(() => setAddCollectionId('')),
      'Failed to add the collection grant.'
    );

  const onChangeLevel = (collectionId: number, level: AccessLevel) =>
    run(() => setRoleGrant(role.id, collectionId, level), 'Failed to change the access level.');

  const onRemoveGrant = (collectionId: number) =>
    run(() => removeRoleGrant(role.id, collectionId), 'Failed to remove the grant.');

  const onAddMember = () =>
    addUserId &&
    run(
      () => addRoleMember(role.id, Number(addUserId)).then(() => setAddUserId('')),
      'Failed to add the member.'
    );

  const onRemoveMember = (userId: number) =>
    run(() => removeRoleMember(role.id, userId), 'Failed to remove the member.');

  async function onDeleteRole() {
    if (!window.confirm(`Delete role “${role.name}”? Everyone in it loses that access.`)) return;
    setError(null);
    try {
      await deleteRole(role.id);
      onDeleted();
    } catch {
      setError('Failed to delete the role.');
    }
  }

  return (
    <div className={styles.detail}>
      <LoadingText isLoading={loading}>Loading role…</LoadingText>

      {!loading && loadError && <LoadError message={loadError} onRetry={() => void load()} />}

      {!loading && !loadError && detail && (
        <>
          {error && <FormError>{error}</FormError>}

          <section className={styles.section}>
            <h3 className={styles.sectionHeading}>Collections</h3>
            {grantedCollections.length === 0 && (
              <EmptyState>No collections granted yet.</EmptyState>
            )}
            {grantedCollections.map(c => (
              <div key={c.collectionId} className={styles.detailRow}>
                <span className={styles.rowName}>{c.title}</span>
                <select
                  className={styles.select}
                  aria-label={`Access level for ${c.title}`}
                  value={c.level}
                  onChange={e => onChangeLevel(c.collectionId, e.target.value as AccessLevel)}
                >
                  <option value="GENERAL">General (view)</option>
                  <option value="CLIENT">Client (download/tag/star)</option>
                  <option value="COLLABORATOR">Collaborator (edit collection)</option>
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${c.title}`}
                  onClick={() => onRemoveGrant(c.collectionId)}
                >
                  Remove
                </Button>
              </div>
            ))}
            {grantableCollections.length > 0 && (
              <div className={styles.addRow}>
                <select
                  className={`${styles.select} ${styles.grow}`}
                  aria-label="Add a collection"
                  value={addCollectionId}
                  onChange={e => setAddCollectionId(e.target.value)}
                >
                  <option value="">Add a collection...</option>
                  {grantableCollections.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <select
                  className={styles.select}
                  aria-label="Access level for the collection being added"
                  value={addLevel}
                  onChange={e => setAddLevel(e.target.value as AccessLevel)}
                >
                  <option value="GENERAL">General</option>
                  <option value="CLIENT">Client</option>
                  <option value="COLLABORATOR">Collaborator</option>
                </select>
                <Button variant="ghost" size="sm" onClick={onAddGrant} disabled={!addCollectionId}>
                  Add
                </Button>
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionHeading}>Members</h3>
            {members.length === 0 && <EmptyState>No members yet.</EmptyState>}
            {members.map(m => (
              <div key={m.userId} className={styles.detailRow}>
                <span className={styles.rowName}>{memberLabel(m)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${memberLabel(m)}`}
                  onClick={() => onRemoveMember(m.userId)}
                >
                  Remove
                </Button>
              </div>
            ))}
            {addableUsers.length > 0 && (
              <div className={styles.addRow}>
                <select
                  className={`${styles.select} ${styles.grow}`}
                  aria-label="Add a member"
                  value={addUserId}
                  onChange={e => setAddUserId(e.target.value)}
                >
                  <option value="">Add a member...</option>
                  {addableUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {userLabel(u)}
                    </option>
                  ))}
                </select>
                <Button variant="ghost" size="sm" onClick={onAddMember} disabled={!addUserId}>
                  Add
                </Button>
              </div>
            )}
          </section>

          <div className={styles.dangerRow}>
            <Button variant="danger" size="sm" onClick={() => void onDeleteRole()}>
              Delete role
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default RoleDetailView;
