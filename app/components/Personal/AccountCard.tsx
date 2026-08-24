'use client';

import { useState } from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import { Card } from '@/app/components/ui/Card/Card';
import { FormError } from '@/app/components/ui/Field/FormError';
import { registerPasskey } from '@/app/lib/api/auth';
import { ApiError } from '@/app/lib/api/core';

import styles from './AccountCard.module.scss';

export interface AccountCardProps {
  /** The signed-in principal's email, from the server-resolved `meServer()`. */
  email: string;
}

type EnrollPhase = 'idle' | 'pending' | 'success' | 'error';

/**
 * Map a failed `registerPasskey()` ceremony to user-facing copy. Browser-side
 * failures are `DOMException`s (`NotAllowedError` = sheet dismissed / timed out;
 * `SecurityError` = WebAuthn misconfig for this domain); server-side failures are
 * `ApiError`s, of which only the expired-session 401 gets dedicated wording.
 */
function mapEnrollError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') {
      return "Face / Touch ID wasn't saved — the prompt was closed or timed out. Try again whenever you like.";
    }
    if (err.name === 'SecurityError') {
      return "Face / Touch ID isn't available right now. Please try again later.";
    }
  }
  if (err instanceof ApiError && err.status === 401) {
    return 'Your session has expired. Sign in again to add Face / Touch ID.';
  }
  return "Face / Touch ID couldn't be saved. Please try again.";
}

/**
 * "Account" card for the `/user` page: the signed-in email plus a passkey
 * (Face / Touch ID) enrollment control driving the existing `registerPasskey()`
 * WebAuthn ceremony, with pending / success / error feedback (never a silent
 * swallow). Stateless about existing credentials — the backend exposes no
 * credential-list endpoint yet — so the button is always offered; enrolling the
 * same authenticator twice is stopped by the ceremony's `excludeCredentials`.
 *
 * The button sits on the email row, end-aligned, rather than under a sentence of its own. The
 * label already says what it does; the sentence that used to explain it just made the card taller
 * than the one thing it holds.
 */
export function AccountCard({ email }: AccountCardProps) {
  const [phase, setPhase] = useState<EnrollPhase>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleEnroll = async () => {
    setError(null);
    setPhase('pending');
    try {
      await registerPasskey();
      setPhase('success');
    } catch (error_) {
      setError(mapEnrollError(error_));
      setPhase('error');
    }
  };

  return (
    <Card title="Account">
      <div className={styles.emailRow}>
        <p className={styles.email}>{email}</p>
        <Button
          type="button"
          variant="outline"
          loading={phase === 'pending'}
          onClick={handleEnroll}
          className={styles.enrollButton}
        >
          Add Face / Touch ID
        </Button>
      </div>
      {phase === 'success' && (
        <p className={styles.success} role="status">
          Face / Touch ID added. You can use it the next time you sign in.
        </p>
      )}
      {error && <FormError>{error}</FormError>}
    </Card>
  );
}
