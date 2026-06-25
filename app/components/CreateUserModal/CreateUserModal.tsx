'use client';

import { type FormEvent, useState } from 'react';

import { InviteLinkResult } from '@/app/components/InviteLinkResult/InviteLinkResult';
import { Button } from '@/app/components/ui/Button/Button';
import { Field } from '@/app/components/ui/Field/Field';
import { FormError } from '@/app/components/ui/Field/FormError';
import { Input } from '@/app/components/ui/Field/Input';
import { Modal } from '@/app/components/ui/Modal/Modal';
import { ApiError } from '@/app/lib/api/core';
import { createUser } from '@/app/lib/api/users';
import { type UserCreateRequest } from '@/app/types/User';

import styles from './CreateUserModal.module.scss';

export interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
}

type SubmitState = 'idle' | 'creating' | 'done';

/**
 * Admin modal for creating a new CLIENT user and obtaining a copyable invite link.
 *
 * On successful submission the backend returns an `inviteUrl`; the modal
 * transitions to a "done" view where the admin can copy the link and share it.
 * Reuses `Modal` (variant overlay) and the canonical `Field`/`Input`/`Button`/`FormError` kit.
 */
export default function CreateUserModal({ open, onClose }: CreateUserModalProps) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const handleClose = () => {
    // Reset state when the modal is closed so it's clean on next open.
    setEmail('');
    setDisplayName('');
    setError(null);
    setSubmitState('idle');
    setInviteUrl(null);
    onClose();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    const req: UserCreateRequest = {
      email: email.trim(),
      role: 'CLIENT',
      ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
    };

    try {
      setSubmitState('creating');
      const result = await createUser(req);
      setInviteUrl(result.inviteUrl);
      setSubmitState('done');
    } catch (error_) {
      const message =
        error_ instanceof ApiError && error_.status === 409
          ? 'A user with that email already exists.'
          : 'Failed to create user. Please try again.';
      setError(message);
      setSubmitState('idle');
    }
  };

  return (
    <Modal open={open} onClose={handleClose} variant="overlay" labelledBy="create-user-title">
      <div className={styles.card}>
        <h2 id="create-user-title" className={styles.title}>
          Create User
        </h2>

        {submitState === 'done' && inviteUrl ? (
          <div className={styles.successSection}>
            <InviteLinkResult
              inviteUrl={inviteUrl}
              label="Share this invite link with the new client:"
            />
            <div className={styles.doneActions}>
              <Button onClick={handleClose} variant="ghost">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <Field label="Email *" htmlFor="create-user-email">
              <Input
                id="create-user-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="client@example.com"
                autoComplete="off"
                disabled={submitState === 'creating'}
              />
            </Field>

            <Field label="Display Name" htmlFor="create-user-display-name">
              <Input
                id="create-user-display-name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Jane Smith"
                autoComplete="off"
                disabled={submitState === 'creating'}
              />
            </Field>

            {error && <FormError>{error}</FormError>}

            <div className={styles.actions}>
              <Button variant="ghost" type="button" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" loading={submitState === 'creating'}>
                {submitState === 'creating' ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
