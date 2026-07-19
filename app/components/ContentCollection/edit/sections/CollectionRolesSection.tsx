'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import { Field } from '@/app/components/ui/Field/Field';
import { FormError } from '@/app/components/ui/Field/FormError';
import { Input } from '@/app/components/ui/Field/Input';
import { ApiError } from '@/app/lib/api/core';
import {
  createRole,
  listCollectionRoles,
  listRoles,
  removeRoleGrant,
  setRoleGrant,
} from '@/app/lib/api/roles';
import { type AccessLevel, type CollectionRoleRow, type RoleSummary } from '@/app/types/Role';

import styles from './CollectionRolesSection.module.scss';

interface CollectionRolesSectionProps {
  /** Saved collection id — the section only renders for persisted collections. */
  collectionId: number;
  /** Current title, used as the default name for the create-role shortcut. */
  collectionTitle: string;
}

/**
 * Role access panel on the collection edit Info tab — the inverse of the role-detail page:
 * which roles can view this collection, at what level (GENERAL = view; CLIENT =
 * download/tag/star). Changes save immediately via the existing role-grant endpoints, and every
 * mutation re-fetches the grant list so the view stays authoritative. The add/create controls
 * offer SHARED roles only; per-user access is granted by adding the user to a role instead.
 */
export function CollectionRolesSection({
  collectionId,
  collectionTitle,
}: CollectionRolesSectionProps) {
  const [grants, setGrants] = useState<CollectionRoleRow[]>([]);
  const [allRoles, setAllRoles] = useState<RoleSummary[]>([]);
  const [addRoleId, setAddRoleId] = useState('');
  const [addLevel, setAddLevel] = useState<AccessLevel>('GENERAL');
  const [createName, setCreateName] = useState(collectionTitle);
  const [createLevel, setCreateLevel] = useState<AccessLevel>('GENERAL');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCollectionRoles(collectionId)
      .then(setGrants)
      .catch(() => {
        setGrants([]);
        setError('Failed to load role access.');
      });
    listRoles()
      .then(setAllRoles)
      .catch(() => setAllRoles([]));
  }, [collectionId]);

  const grantedIds = new Set(grants.map(g => g.roleId));
  const grantableRoles = allRoles.filter(r => r.kind === 'SHARED' && !grantedIds.has(r.id));

  async function refresh() {
    setGrants(await listCollectionRoles(collectionId));
  }

  async function run(action: () => Promise<void>, failMessage: string) {
    setError(null);
    try {
      await action();
      await refresh();
    } catch {
      setError(failMessage);
    }
  }

  const onAddRole = () =>
    addRoleId &&
    run(
      () => setRoleGrant(Number(addRoleId), collectionId, addLevel).then(() => setAddRoleId('')),
      'Failed to add the role.'
    );

  const onChangeLevel = (roleId: number, level: AccessLevel) =>
    run(() => setRoleGrant(roleId, collectionId, level), 'Failed to change the access level.');

  const onRemove = (roleId: number) =>
    run(() => removeRoleGrant(roleId, collectionId), 'Failed to remove the role.');

  async function onCreateRole() {
    const name = createName.trim();
    if (!name) return;
    setError(null);
    try {
      const created = await createRole({ name, kind: 'SHARED' });
      if (created) {
        await setRoleGrant(created.id, collectionId, createLevel);
      }
      setAllRoles(await listRoles());
      await refresh();
      setCreateName('');
    } catch (error_) {
      setError(
        error_ instanceof ApiError && error_.status === 409
          ? 'A role with that name already exists.'
          : 'Failed to create the role.'
      );
    }
  }

  return (
    <section aria-labelledby="collection-roles-heading" className={styles.section}>
      <h3 id="collection-roles-heading" className={styles.sectionTitle}>
        Role Access
      </h3>
      <p className={styles.fieldHint}>
        Roles that can view this collection. Changes save immediately.
      </p>

      {error && <FormError>{error}</FormError>}

      {grants.length === 0 && <p className={styles.empty}>No roles have access yet.</p>}
      {grants.map(g => (
        <div key={g.roleId} className={styles.row}>
          <span className={styles.rowName}>
            {g.name} <span className={styles.kindBadge}>{g.kind}</span>
          </span>
          <select
            className={styles.select}
            value={g.level}
            onChange={e => onChangeLevel(g.roleId, e.target.value as AccessLevel)}
            aria-label={`Access level for ${g.name}`}
          >
            <option value="GENERAL">General (view)</option>
            <option value="CLIENT">Client (download/tag/star)</option>
          </select>
          <Button variant="ghost" size="sm" onClick={() => onRemove(g.roleId)}>
            Remove
          </Button>
        </div>
      ))}

      {grantableRoles.length > 0 && (
        <div className={styles.addRow}>
          <select
            className={`${styles.select} ${styles.grow}`}
            value={addRoleId}
            onChange={e => setAddRoleId(e.target.value)}
            aria-label="Add a role"
          >
            <option value="">Add a role...</option>
            {grantableRoles.map(r => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            value={addLevel}
            onChange={e => setAddLevel(e.target.value as AccessLevel)}
            aria-label="Access level for added role"
          >
            <option value="GENERAL">General</option>
            <option value="CLIENT">Client</option>
          </select>
          <Button variant="ghost" size="sm" onClick={onAddRole} disabled={!addRoleId}>
            Add
          </Button>
        </div>
      )}

      <div className={`${styles.addRow} ${styles.createRow}`}>
        <div className={styles.grow}>
          <Field label="Create role for this collection" htmlFor="collection-role-create-name">
            <Input
              id="collection-role-create-name"
              value={createName}
              onChange={e => setCreateName(e.target.value)}
              autoComplete="off"
            />
          </Field>
        </div>
        <select
          className={styles.select}
          value={createLevel}
          onChange={e => setCreateLevel(e.target.value as AccessLevel)}
          aria-label="Access level for created role"
        >
          <option value="GENERAL">General</option>
          <option value="CLIENT">Client</option>
        </select>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void onCreateRole()}
          disabled={!createName.trim()}
        >
          Create
        </Button>
      </div>
    </section>
  );
}
