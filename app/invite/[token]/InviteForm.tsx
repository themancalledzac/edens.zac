'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import { Field } from '@/app/components/ui/Field/Field';
import { FormError } from '@/app/components/ui/Field/FormError';
import { Input } from '@/app/components/ui/Field/Input';
import { registerPasskey } from '@/app/lib/api/auth';
import { ApiError } from '@/app/lib/api/core';
import { acceptInvite } from '@/app/lib/api/users';
import { type AcceptInviteRequest } from '@/app/types/User';

import styles from './InviteForm.module.scss';

/** Mirrors the backend `@Size(min = 8)` rule on the invite-accept password. */
const PASSWORD_MIN_LENGTH = 8;

export interface InviteFormProps {
  token: string;
  email: string;
  displayName: string | null;
}

/**
 * Client-side onboarding form rendered inside the invite page.
 *
 * Fields: display name (pre-filled), password, confirm password, and an optional
 * "Enable Face/Touch ID" checkbox. On submit → `acceptInvite` (auto-login via cookie)
 * → optional `registerPasskey` (best-effort; failure does not block redirect) → `/user`.
 */
export default function InviteForm({ token, email, displayName }: InviteFormProps) {
  const router = useRouter();

  const [name, setName] = useState(displayName ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [enablePasskey, setEnablePasskey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Display name is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    const body: AcceptInviteRequest = {
      displayName: name.trim(),
      password,
    };

    try {
      setSubmitting(true);
      await acceptInvite(token, body);

      if (enablePasskey) {
        try {
          await registerPasskey();
        } catch {
          // Passkey enrollment is optional — a failure here should not block
          // the redirect. The user can enroll later from their account settings.
        }
      }

      router.push('/user');
    } catch (error_) {
      let message = 'Something went wrong. Please try again.';
      if (error_ instanceof ApiError) {
        if (error_.status === 410) {
          message = 'This invite link has already been used.';
        } else if (error_.status === 404) {
          message = 'This invite link is invalid or has expired.';
        } else if (error_.status === 400) {
          message = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
        }
      }
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <p className={styles.forEmail}>Setting up account for {email}</p>

      <Field label="Display Name *" htmlFor="invite-display-name">
        <Input
          id="invite-display-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
          disabled={submitting}
        />
      </Field>

      <Field
        label="Password *"
        htmlFor="invite-password"
        hint={`At least ${PASSWORD_MIN_LENGTH} characters`}
      >
        <Input
          id="invite-password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Choose a password"
          autoComplete="new-password"
          disabled={submitting}
        />
      </Field>

      <Field label="Confirm Password *" htmlFor="invite-confirm">
        <Input
          id="invite-confirm"
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Repeat your password"
          autoComplete="new-password"
          disabled={submitting}
        />
      </Field>

      <label className={styles.passkeyLabel}>
        <input
          type="checkbox"
          checked={enablePasskey}
          onChange={e => setEnablePasskey(e.target.checked)}
          disabled={submitting}
          className={styles.passkeyCheckbox}
        />
        Enable Face / Touch ID (optional)
      </label>

      {error && <FormError>{error}</FormError>}

      <Button type="submit" loading={submitting} className={styles.submitButton}>
        {submitting ? 'Setting up…' : 'Create Account'}
      </Button>
    </form>
  );
}
