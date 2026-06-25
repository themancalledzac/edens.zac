'use client';

import { type FormEvent, useState } from 'react';

import { InviteLinkResult } from '@/app/components/InviteLinkResult/InviteLinkResult';
import { Button } from '@/app/components/ui/Button/Button';
import { Field } from '@/app/components/ui/Field/Field';
import { FormError } from '@/app/components/ui/Field/FormError';
import { Input } from '@/app/components/ui/Field/Input';
import { ApiError } from '@/app/lib/api/core';
import { createUser, updateUser } from '@/app/lib/api/users';
import { type AdminUserSummary, type UserStatus } from '@/app/types/User';

import styles from './UserForm.module.scss';

const STATUS_OPTIONS: UserStatus[] = ['INVITED', 'ACTIVE', 'DISABLED'];

export type UserFormProps =
  | { mode: 'create'; onSuccess: () => void; onCancel: () => void }
  | { mode: 'edit'; user: AdminUserSummary; onSuccess: () => void; onCancel: () => void };

/**
 * Reusable inline form for creating or editing a user. In `create` mode it collects email + display
 * name, calls {@link createUser}, then shows the copyable invite link. In `edit` mode it prefills
 * the user's values, locks the email (immutable identity), and saves display name + status via
 * {@link updateUser}. Designed to live inside `UserManagementPanel`'s body, not a modal.
 */
export function UserForm(props: UserFormProps) {
  const isEdit = props.mode === 'edit';
  const [email] = useState(isEdit ? props.user.email : '');
  const [emailInput, setEmailInput] = useState('');
  const [displayName, setDisplayName] = useState(isEdit ? (props.user.displayName ?? '') : '');
  const [status, setStatus] = useState<UserStatus>(isEdit ? props.user.status : 'INVITED');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (props.mode === 'create') {
      if (!emailInput.trim()) {
        setError('Email is required.');
        return;
      }
      try {
        setSubmitting(true);
        const result = await createUser({
          email: emailInput.trim(),
          role: 'CLIENT',
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
        displayName: displayName.trim() ? displayName.trim() : null,
        status,
      });
      props.onSuccess();
    } catch (error_) {
      setError(
        error_ instanceof ApiError && error_.status === 404
          ? 'This user no longer exists — refresh the list.'
          : 'Failed to update user. Please try again.'
      );
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
          value={isEdit ? email : emailInput}
          onChange={e => setEmailInput(e.target.value)}
          placeholder="client@example.com"
          autoComplete="off"
          disabled={submitting}
          readOnly={isEdit}
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
