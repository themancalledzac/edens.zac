'use client';

import Link from 'next/link';
import { type FormEvent, useEffect, useState } from 'react';

import { InviteLinkResult } from '@/app/components/InviteLinkResult/InviteLinkResult';
import { Button } from '@/app/components/ui/Button/Button';
import { Field } from '@/app/components/ui/Field/Field';
import { FormError } from '@/app/components/ui/Field/FormError';
import { Input } from '@/app/components/ui/Field/Input';
import { Textarea } from '@/app/components/ui/Field/Textarea';
import { ApiError } from '@/app/lib/api/core';
import {
  addUserToRole,
  listRoles,
  listUserRoles,
  removeUserFromRole,
} from '@/app/lib/api/roles';
import { createUser, updateUser } from '@/app/lib/api/users';
import { type RoleSummary, type UserRoleRow } from '@/app/types/Role';
import { type AdminUserSummary, type UserStatus } from '@/app/types/User';

import styles from './UserForm.module.scss';

const STATUS_OPTIONS: UserStatus[] = ['INVITED', 'ACTIVE', 'DISABLED'];

export type UserFormProps =
  | { mode: 'create'; onSuccess: () => void; onCancel: () => void }
  | { mode: 'edit'; user: AdminUserSummary; onSuccess: () => void; onCancel: () => void };

/**
 * Reusable inline form for creating or editing a user. In `create` mode it collects email + display
 * name, calls {@link createUser}, then shows the copyable invite link. In `edit` mode it prefills
 * the user's values and saves email (the login identity — the server rejects with 409 if another
 * user owns it), display name, status, and description via {@link updateUser}. Designed to live
 * inside `UserManagementPanel`'s body, not a modal.
 */
export function UserForm(props: UserFormProps) {
  const isEdit = props.mode === 'edit';
  const editUser = isEdit ? props.user : null;
  const [email, setEmail] = useState(isEdit ? (props.user.email ?? '') : '');
  const [displayName, setDisplayName] = useState(isEdit ? (props.user.displayName ?? '') : '');
  const [status, setStatus] = useState<UserStatus>(isEdit ? props.user.status : 'INVITED');
  const [description, setDescription] = useState(isEdit ? (props.user.description ?? '') : '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<UserRoleRow[]>([]);
  const [allRoles, setAllRoles] = useState<RoleSummary[]>([]);
  const [addRoleId, setAddRoleId] = useState<string>('');
  const editUserId = editUser?.id ?? null;

  useEffect(() => {
    if (editUserId !== null) {
      listUserRoles(editUserId)
        .then(setUserRoles)
        .catch(() => setUserRoles([]));
      listRoles()
        .then(setAllRoles)
        .catch(() => setAllRoles([]));
    }
  }, [editUserId]);

  const availableRoles = allRoles.filter(r => !userRoles.some(ur => ur.roleId === r.id));

  async function addRole() {
    if (editUserId === null || !addRoleId) return;
    try {
      await addUserToRole(editUserId, Number(addRoleId));
      setUserRoles(await listUserRoles(editUserId));
      setAddRoleId('');
    } catch {
      setError('Failed to add role. Please try again.');
    }
  }

  async function removeRole(roleId: number) {
    if (editUserId === null) return;
    try {
      await removeUserFromRole(editUserId, roleId);
      setUserRoles(await listUserRoles(editUserId));
    } catch {
      setError('Failed to remove role. Please try again.');
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    if (props.mode === 'create') {
      try {
        setSubmitting(true);
        const result = await createUser({
          email: email.trim(),
          ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
        });
        setInviteUrl(result.inviteUrl);
      } catch (error_) {
        setError(
          error_ instanceof ApiError && error_.status === 409
            ? 'A user with that email already exists.'
            : 'Failed to create user. Please try again.'
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      setSubmitting(true);
      await updateUser(props.user.id, {
        email: email.trim(),
        displayName: displayName.trim() ? displayName.trim() : null,
        status,
        description: description.trim() ? description.trim() : null,
      });
      props.onSuccess();
    } catch (error_) {
      if (error_ instanceof ApiError && error_.status === 409) {
        setError('A user with that email already exists.');
      } else if (error_ instanceof ApiError && error_.status === 404) {
        setError('This user no longer exists — refresh the list.');
      } else {
        setError('Failed to update user. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (inviteUrl) {
    return (
      <div className={styles.form}>
        <InviteLinkResult
          inviteUrl={inviteUrl}
          label="Share this invite link with the new client:"
        />
        <div className={styles.actions}>
          <Button variant="ghost" onClick={props.onSuccess}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Field label="Email *" htmlFor="user-form-email">
        <Input
          id="user-form-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="client@example.com"
          autoComplete="off"
          disabled={submitting}
        />
      </Field>

      <Field label="Display Name" htmlFor="user-form-display-name">
        <Input
          id="user-form-display-name"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="Jane Smith"
          autoComplete="off"
          disabled={submitting}
        />
      </Field>

      {isEdit && (
        <Field label="Description" htmlFor="user-form-description">
          <Textarea
            id="user-form-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Short profile description shown on the user's page"
            maxLength={500}
            rows={4}
            disabled={submitting}
          />
        </Field>
      )}

      {isEdit && (
        <Field label="Status" htmlFor="user-form-status">
          <select
            id="user-form-status"
            className={styles.select}
            value={status}
            onChange={e => setStatus(e.target.value as UserStatus)}
            disabled={submitting}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      )}

      {isEdit && (
        <section className={styles.collections}>
          <h3 className={styles.collectionsHeading}>Roles</h3>
          {userRoles.length === 0 && (
            <p className={styles.collectionsEmpty}>Not in any roles yet.</p>
          )}
          {userRoles.map(r => (
            <div key={r.roleId} className={styles.collectionRow}>
              <span>{r.name}</span>
              <Button variant="ghost" size="sm" type="button" onClick={() => removeRole(r.roleId)}>
                Remove
              </Button>
            </div>
          ))}
          {availableRoles.length > 0 && (
            <div className={styles.collectionRow}>
              <select value={addRoleId} onChange={e => setAddRoleId(e.target.value)}>
                <option value="">Add to role...</option>
                {availableRoles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={addRole}
                disabled={!addRoleId}
              >
                Add
              </Button>
            </div>
          )}
          <Link href="/admin/roles" className={styles.manageRolesLink}>
            Manage roles and grants
          </Link>
        </section>
      )}

      {error && <FormError>{error}</FormError>}

      <div className={styles.actions}>
        <Button variant="ghost" type="button" onClick={props.onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {props.mode === 'create'
            ? (submitting
              ? 'Creating...'
              : 'Create User')
            : (submitting
              ? 'Saving...'
              : 'Save')}
        </Button>
      </div>
    </form>
  );
}

export default UserForm;
