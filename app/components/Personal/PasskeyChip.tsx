'use client';

import { useState } from 'react';

import { FilterChip } from '@/app/components/ui/FilterChip/FilterChip';
import { registerPasskey } from '@/app/lib/api/auth';
import { ApiError } from '@/app/lib/api/core';

import styles from './PasskeyChip.module.scss';

/** Non-breaking around the slash so the label never wraps mid-phrase. */
export const PASSKEY_LABEL = 'Face / Touch ID';

export interface PasskeyChipProps {
  /** From `MeResponse.passkeyCount > 0`. */
  initiallyEnrolled: boolean;
}

type Phase = 'idle' | 'pending' | 'error';

function mapEnrollError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return 'Prompt closed. Try again.';
    if (error.name === 'SecurityError') return 'Not available on this site.';
  }
  if (error instanceof ApiError && error.status === 401) return 'Session expired. Sign in again.';
  return "Couldn't save. Try again.";
}

/**
 * Passkey enrollment as a chip in the filter bar's upper tier. Renders nothing once a passkey
 * exists, including the moment enrollment succeeds; the success announcement stays mounted for
 * assistive tech after the chip itself unmounts. Disabled while the ceremony runs so a double tap
 * cannot start two.
 */
export function PasskeyChip({ initiallyEnrolled }: PasskeyChipProps) {
  const [enrolled, setEnrolled] = useState(initiallyEnrolled);
  const [announce, setAnnounce] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleEnroll = async () => {
    setError(null);
    setPhase('pending');
    try {
      await registerPasskey();
      setEnrolled(true);
      setAnnounce(true);
    } catch (error_) {
      setError(mapEnrollError(error_));
      setPhase('error');
    }
  };

  if (enrolled) {
    return announce ? (
      <span className={styles.srOnly} role="status">
        {PASSKEY_LABEL} added.
      </span>
    ) : null;
  }

  const pending = phase === 'pending';
  return (
    <span className={styles.wrap}>
      <FilterChip
        label={PASSKEY_LABEL}
        trailing={pending ? '…' : ''}
        state={pending ? 'unavailable' : 'available'}
        onToggle={handleEnroll}
      />
      {error && (
        <span role="alert" className={styles.error}>
          {error}
        </span>
      )}
    </span>
  );
}
