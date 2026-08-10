'use client';

import { type FormEvent, useState } from 'react';

import { InviteLinkResult } from '@/app/components/InviteLinkResult/InviteLinkResult';
import { Button } from '@/app/components/ui/Button/Button';
import { Field } from '@/app/components/ui/Field/Field';
import { FormError } from '@/app/components/ui/Field/FormError';
import { Input } from '@/app/components/ui/Field/Input';
import { Textarea } from '@/app/components/ui/Field/Textarea';
import { ApiError } from '@/app/lib/api/core';
import { createUser, updateUser } from '@/app/lib/api/users';
import { type AdminUserSummary, type UserStatus } from '@/app/types/User';

import styles from './UserForm.module.scss';
import { UserRolesSection } from './UserRolesSection';

const STATUS_OPTIONS: UserStatus[] = ['INVITED', 'ACTIVE', 'DISABLED'];

interface UserFormCommonProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export type UserFormProps =
  | ({ mode: 'create' } & UserFormCommonProps)
  | ({ mode: 'edit'; user: AdminUserSummary } & UserFormCommonProps);

/**
 * Reusable inline form for creating or editing a user. In `create` mode it collects email + display
 * name, calls {@link createUser}, then shows the copyable invite link. In `edit` mode it prefills
 * the user's values and saves email (the login identity — the server rejects with 409 if another
 * user owns it), display name, status, and description via {@link updateUser}. Designed to live
 * inside `UserManagementPanel`'s body, not a modal.
 *
 * Field order is Name (+ Status beside it), Email, Description, Roles — identity first, then how
 * to reach them, then the free text, then access. Status shares the Name row and carries only an
 * `aria-label`: its three values (`ACTIVE` / `INVITED` / `DISABLED`) name the thing they are, so a
 * visible "Status" caption above them spent a line of vertical space restating the options.
 *
 * Role membership lives in {@link UserRolesSection}, which both this form and the read-only view
 * on `/admin/users/[id]` render — including the rule that a failed roles read is reported as
 * unknown rather than as "no roles". See that component for why.
 *
 * The email input is `required` so the constraint is real and announced, but the form is
 * `noValidate`: native validation bubbles would pre-empt {@link handleSubmit} and route this one
 * field around the inline `FormError` (`role="alert"`) channel every other failure here uses —
 * including the whitespace-only email that `required` does not catch. The label carries no `*`;
 * the asterisk duplicated in punctuation what `required` already announces, and it was the only
 * field caption on the page wearing one.
 */
export function UserForm(props: UserFormProps) {
  const isEdit = props.mode === 'edit';
  const [email, setEmail] = useState(isEdit ? (props.user.email ?? '') : '');
  const [displayName, setDisplayName] = useState(isEdit ? (props.user.displayName ?? '') : '');
  const [status, setStatus] = useState<UserStatus>(isEdit ? props.user.status : 'INVITED');
  const [description, setDescription] = useState(isEdit ? (props.user.description ?? '') : '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const save = async () => {
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

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void save();
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
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.identityRow}>
        <Field label="Name" htmlFor="user-form-display-name" className={styles.nameField}>
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
          <select
            id="user-form-status"
            aria-label="Status"
            className={styles.statusSelect}
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
        )}
      </div>

      <Field label="Email" htmlFor="user-form-email">
        <Input
          id="user-form-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="client@example.com"
          autoComplete="off"
          required
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
            rows={3}
            disabled={submitting}
          />
        </Field>
      )}

      {isEdit && <UserRolesSection userId={props.user.id} />}

      {error && <FormError>{error}</FormError>}

      <div className={styles.actions}>
        <Button variant="ghost" type="button" onClick={props.onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {props.mode === 'create'
            ? submitting
              ? 'Creating…'
              : 'Create User'
            : submitting
              ? 'Saving…'
              : 'Save'}
        </Button>
      </div>
    </form>
  );
}

export default UserForm;
