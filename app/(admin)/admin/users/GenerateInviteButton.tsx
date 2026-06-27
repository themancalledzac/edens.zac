'use client';

import { useState } from 'react';

import { InviteLinkResult } from '@/app/components/InviteLinkResult/InviteLinkResult';
import { Button } from '@/app/components/ui/Button/Button';
import { FormError } from '@/app/components/ui/Field/FormError';
import { Modal } from '@/app/components/ui/Modal/Modal';
import { ApiError } from '@/app/lib/api/core';
import { regenerateInvite } from '@/app/lib/api/users';
import { type UserStatus } from '@/app/types/User';

import styles from './GenerateInviteButton.module.scss';

export interface GenerateInviteButtonProps {
  userId: number;
  email: string;
  status: UserStatus;
}

/**
 * Per-user action that re-issues a single-use invite / password-reset link. Opens a modal that
 * shows the fresh copyable link. The label adapts to the account status: a resend for an `INVITED`
 * user, a password reset for an `ACTIVE` one.
 */
export function GenerateInviteButton({ userId, email, status }: GenerateInviteButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actionLabel = status === 'ACTIVE' ? 'Reset password link' : 'Resend invite';
  const buttonLabel = status === 'ACTIVE' ? 'Reset pw' : 'Resend';

  const handleGenerate = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    setInviteUrl(null);
    try {
      const result = await regenerateInvite(userId);
      setInviteUrl(result.inviteUrl);
    } catch (error_) {
      setError(
        error_ instanceof ApiError && error_.status === 404
          ? 'This user no longer exists — refresh the list.'
          : 'Could not generate a link. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setInviteUrl(null);
    setError(null);
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={handleGenerate}>
        {buttonLabel}
      </Button>
      <Modal open={open} onClose={handleClose} variant="overlay" labelledBy="generate-invite-title">
        <div className={styles.card}>
          <h2 id="generate-invite-title" className={styles.title}>
            {actionLabel} · {email}
          </h2>
          {loading && <p className={styles.loading}>Generating link…</p>}
          {error && <FormError>{error}</FormError>}
          {inviteUrl && (
            <InviteLinkResult
              inviteUrl={inviteUrl}
              label="Share this single-use link (any previous link is now invalid):"
            />
          )}
          <div className={styles.actions}>
            <Button onClick={handleClose} variant="ghost">
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default GenerateInviteButton;
