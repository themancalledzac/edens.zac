'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import { FormError } from '@/app/components/ui/Field/FormError';
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
import { type AccessLevel, type RoleDetail } from '@/app/types/Role';
import { type AdminUserSummary } from '@/app/types/User';

import styles from '../roles.module.scss';

/**
 * Role detail editor: a role's members (users who inherit its grants) and its per-collection grants
 * (GENERAL = view; CLIENT = download/tag/star). Collection and user pickers are loaded client-side;
 * every mutation re-fetches the role so the view stays authoritative.
 */
export function RoleDetailClient({ initialRole }: { initialRole: RoleDetail }) {
  const router = useRouter();
  const [role, setRole] = useState<RoleDetail>(initialRole);
  const [collections, setCollections] = useState<CollectionModel[]>([]);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [addCollectionId, setAddCollectionId] = useState('');
  const [addLevel, setAddLevel] = useState<AccessLevel>('GENERAL');
  const [addUserId, setAddUserId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAllCollectionsAdmin()
      .then(setCollections)
      .catch(() => setCollections([]));
    listUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  async function refresh() {
    const fresh = await getRole(role.id);
    if (fresh) setRole(fresh);
  }

  const grantedIds = new Set(role.collections.map(c => c.collectionId));
  const memberIds = new Set(role.members.map(m => m.userId));
  const grantableCollections = collections.filter(
    c => typeof c.id === 'number' && !grantedIds.has(c.id)
  );
  const addableUsers = users.filter(u => u.status !== 'PERSON' && !memberIds.has(u.id));

  async function run(action: () => Promise<void>, failMessage: string) {
    setError(null);
    try {
      await action();
      await refresh();
    } catch {
      setError(failMessage);
    }
  }

  const onAddGrant = () =>
    addCollectionId &&
    run(
      () => setRoleGrant(role.id, Number(addCollectionId), addLevel).then(() => setAddCollectionId('')),
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
    if (!window.confirm(`Delete role "${role.name}"? Everyone in it loses that access.`)) return;
    setError(null);
    try {
      await deleteRole(role.id);
      router.push('/admin/roles');
    } catch {
      setError('Failed to delete the role.');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/admin/roles" className={styles.back}>
          &lt;- Roles
        </Link>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{role.name}</h1>
          <Button variant="danger" size="sm" onClick={onDeleteRole}>
            Delete role
          </Button>
        </div>
      </div>

      {error && <FormError>{error}</FormError>}

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Collections</h2>
        {role.collections.length === 0 && (
          <p className={styles.empty}>No collections granted yet.</p>
        )}
        {role.collections.map(c => (
          <div key={c.collectionId} className={styles.row}>
            <span className={styles.rowName}>{c.title}</span>
            <select
              className={styles.select}
              value={c.level}
              onChange={e => onChangeLevel(c.collectionId, e.target.value as AccessLevel)}
            >
              <option value="GENERAL">General (view)</option>
              <option value="CLIENT">Client (download/tag/star)</option>
            </select>
            <Button variant="ghost" size="sm" onClick={() => onRemoveGrant(c.collectionId)}>
              Remove
            </Button>
          </div>
        ))}
        {grantableCollections.length > 0 && (
          <div className={styles.addRow}>
            <select
              className={`${styles.select} ${styles.grow}`}
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
              value={addLevel}
              onChange={e => setAddLevel(e.target.value as AccessLevel)}
            >
              <option value="GENERAL">General</option>
              <option value="CLIENT">Client</option>
            </select>
            <Button variant="ghost" size="sm" onClick={onAddGrant} disabled={!addCollectionId}>
              Add
            </Button>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Members</h2>
        {role.members.length === 0 && <p className={styles.empty}>No members yet.</p>}
        {role.members.map(m => (
          <div key={m.userId} className={styles.row}>
            <span className={styles.rowName}>{m.email ?? m.name ?? `User #${m.userId}`}</span>
            <Button variant="ghost" size="sm" onClick={() => onRemoveMember(m.userId)}>
              Remove
            </Button>
          </div>
        ))}
        {addableUsers.length > 0 && (
          <div className={styles.addRow}>
            <select
              className={`${styles.select} ${styles.grow}`}
              value={addUserId}
              onChange={e => setAddUserId(e.target.value)}
            >
              <option value="">Add a member...</option>
              {addableUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.email ?? u.displayName ?? `User #${u.id}`}
                </option>
              ))}
            </select>
            <Button variant="ghost" size="sm" onClick={onAddMember} disabled={!addUserId}>
              Add
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
