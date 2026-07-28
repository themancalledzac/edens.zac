'use client';

import { type FormEvent, useState } from 'react';

import { InviteLinkResult } from '@/app/components/InviteLinkResult/InviteLinkResult';
import { Button } from '@/app/components/ui/Button/Button';
import { Field } from '@/app/components/ui/Field/Field';
import { FormError } from '@/app/components/ui/Field/FormError';
import { Input } from '@/app/components/ui/Field/Input';
import { Modal } from '@/app/components/ui/Modal/Modal';
import { ApiError } from '@/app/lib/api/core';
import { upgradeUser } from '@/app/lib/api/users';
import { type AdminUserSummary } from '@/app/types/User';

import styles from './UpgradeUserModal.module.scss';

export interface UpgradeUserModalProps {
  /** The tag-only PERSON being promoted in place into an INVITED account. */
  source: AdminUserSummary;
  /** Dismiss the modal. The caller owns mount/unmount, so this component is always open. */
  onClose: () => void;
  /**
   * Called the moment the upgrade succeeds — not on close — so the caller refreshes and revalidates
   * even if the admin navigates away instead of dismissing the modal. Must not unmount this
   * component, or the returned invite link (shown only once) is lost.
   */
  onUpgraded: () => void;
}

/**
 * Modal for promoting a tag-only PERSON (`source`) in place into an `INVITED` account, keeping its
 * existing image tags and collections. Collects the required login email, calls {@link upgradeUser},
 * and on success shows the copyable single-use invite link. Distinct from the merge flow: no data is
 * moved and the identity survives. Errors from the backend (409 email-taken / not-a-PERSON, 404
 * unknown id) are surfaced rather than swallowed.
 *
 * Rendered only while open — the caller mounts it on demand and unmounts it from `onClose`, so
 * there is no `open` prop and no local state to reset.
 */
export function UpgradeUserModal({ source, onClose, onUpgraded }: UpgradeUserModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Email is required to issue an invite.');
      return;
    }

    setLoading(true);
    try {
      const result = await upgradeUser(source.id, trimmed);
      setInviteUrl(result.inviteUrl);
      onUpgraded();
    } catch (error_) {
      if (error_ instanceof ApiError && error_.status === 404) {
        setError('This person no longer exists — refresh the list.');
      } else if (error_ instanceof ApiError && error_.status === 409) {
        setError('That email is already taken, or this identity can no longer be upgraded.');
      } else {
        setError('Could not upgrade this person. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} variant="overlay" labelledBy="upgrade-user-title">
      <div className={styles.card}>
        <h2 id="upgrade-user-title" className={styles.title}>
          Upgrade “{source.displayName ?? '—'}” to an account
        </h2>

        {inviteUrl ? (
          <>
            <p className={styles.muted}>
              This person is now an invited account and keeps its existing image tags and
              collections.
            </p>
            <InviteLinkResult
              inviteUrl={inviteUrl}
              label="Share this single-use invite link to finish setup:"
            />
            <div className={styles.actions}>
              <Button onClick={onClose} variant="ghost">
                Close
              </Button>
            </div>
          </>
        ) : (
          <form className={styles.form} onSubmit={e => void handleSubmit(e)}>
            <Field
              label="Login email"
              htmlFor="upgrade-user-email"
              hint="Required — the address the invite is sent to and the account signs in with."
            >
              <Input
                id="upgrade-user-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="person@example.com"
                autoComplete="off"
              />
            </Field>

            {error && <FormError>{error}</FormError>}

            <div className={styles.actions}>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" loading={loading} disabled={loading}>
                Upgrade
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

export default UpgradeUserModal;
