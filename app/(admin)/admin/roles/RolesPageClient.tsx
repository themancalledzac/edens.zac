'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import { Field } from '@/app/components/ui/Field/Field';
import { FormError } from '@/app/components/ui/Field/FormError';
import { Input } from '@/app/components/ui/Field/Input';
import { ApiError } from '@/app/lib/api/core';
import { createRole, listRoles } from '@/app/lib/api/roles';
import { type RoleSummary } from '@/app/types/Role';

import styles from './roles.module.scss';

/**
 * Admin roles list + create form. A user joins roles to inherit their per-collection grants
 * (managed on each role's detail page). Roles are admin-curated groups of users sharing the same
 * collection grants.
 */
export function RolesPageClient({ initialRoles }: { initialRoles: RoleSummary[] }) {
  const [roles, setRoles] = useState<RoleSummary[]>(initialRoles);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Role name is required.');
      return;
    }
    try {
      setSubmitting(true);
      await createRole({ name: name.trim() });
      setRoles(await listRoles());
      setName('');
    } catch (error_) {
      setError(
        error_ instanceof ApiError && error_.status === 409
          ? 'A role with that name already exists.'
          : 'Failed to create role. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/admin" className={styles.back}>
          &lt;- Admin
        </Link>
        <h1 className={styles.title}>Roles</h1>
      </div>

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
        <Button type="submit" loading={submitting}>
          {submitting ? 'Creating...' : 'Create role'}
        </Button>
        {error && <FormError>{error}</FormError>}
      </form>

      <ul className={styles.roleList}>
        {roles.length === 0 && <li className={styles.empty}>No roles yet.</li>}
        {roles.map(r => (
          <li key={r.id} className={styles.roleRow}>
            <Link href={`/admin/roles/${r.id}`} className={styles.roleLink}>
              <span className={styles.roleName}>{r.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
