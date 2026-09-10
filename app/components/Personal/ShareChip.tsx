'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import { CloseButton } from '@/app/components/ui/CloseButton/CloseButton';
import { FormError } from '@/app/components/ui/Field/FormError';
import { FilterChip } from '@/app/components/ui/FilterChip/FilterChip';
import { Modal } from '@/app/components/ui/Modal/Modal';
import { ApiError } from '@/app/lib/api/core';
import {
  addShareCollection,
  buildShareUrl,
  emailShareLink,
  removeShareCollection,
  rotateShareLink,
  type ShareSettings,
  type ShareSettingsRead,
} from '@/app/lib/api/share';
import { type CollectionModel } from '@/app/types/Collection';
import { isEmailDisabled } from '@/app/utils/emailSendReason';

import styles from './ShareChip.module.scss';

export interface ShareChipProps {
  /**
   * Server-resolved starting state. The failure arm is kept distinct from "no link yet" on
   * purpose — see {@link ShareSettingsRead}.
   */
  read: ShareSettingsRead;
}

type Phase = 'idle' | 'pending' | 'error';

/**
 * Map a failed share action to user-facing copy. Anything unmapped falls through to the caller's
 * `fallback`, which reads as transient — so a status only earns a branch here when retrying is
 * the wrong advice, or when the right advice is more specific than "try again".
 *
 * The 429 is the share-email limiter (5 per sender per hour, 200 a day across everyone). It fires
 * before the backend reveals the token, so it can never coexist with the 409 and the link is
 * always intact when it arrives — hence "wait", and deliberately no nudge toward Reset, which
 * would cut off whoever already holds the link over a limit that clears by itself.
 */
function mapError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Your session has expired. Sign in again to manage your link.';
    if (error.status === 409) {
      return 'This link was created before links could be re-shown. Reset it to get one you can copy.';
    }
    if (error.status === 403) return 'You no longer have access to that gallery.';
    if (error.status === 429) {
      return 'Too many share emails just now. Your link still works — wait a little and send it again.';
    }
  }
  return fallback;
}

/**
 * Share chip for the owner's own space. Opens a dialog holding the link, copy, send-by-email,
 * gallery opt-ins and reset controls. The failure arm stays distinct from "no link yet" (see
 * {@link ShareSettingsRead}).
 */
export function ShareChip({ read }: ShareChipProps) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<ShareSettings | null>(read.ok ? read.settings : null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [emailNote, setEmailNote] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');

  useEffect(() => setOrigin(window.location.origin), []);

  const shareUrl = useMemo(
    () => (settings?.token && origin ? buildShareUrl(settings.token, origin) : null),
    [settings?.token, origin]
  );

  const optedIn = useMemo(
    () => new Set(settings?.optedInCollectionIds ?? []),
    [settings?.optedInCollectionIds]
  );

  const run = async (action: () => Promise<void>, fallback: string) => {
    setError(null);
    setEmailNote(null);
    setPhase('pending');
    try {
      await action();
      setPhase('idle');
    } catch (error_) {
      setError(mapError(error_, fallback));
      setPhase('error');
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy automatically — select the link above and copy it.');
    }
  };

  const handleReset = () =>
    run(async () => {
      setSettings(await rotateShareLink());
      setCopied(false);
    }, 'Could not reset your link. Please try again.');

  const handleEmail = () =>
    run(async () => {
      const result = await emailShareLink(recipient.trim());
      setEmailNote(
        result.sent
          ? `Sent to ${recipient.trim()}.`
          : isEmailDisabled(result.reason)
            ? 'Email is not switched on right now — copy the link and send it yourself.'
            : 'That email did not go out — copy the link and send it yourself.'
      );
      setRecipient('');
    }, 'Could not send that email. Please try again.');

  const toggleCollection = (collection: CollectionModel, include: boolean) =>
    run(async () => {
      await (include ? addShareCollection(collection.id) : removeShareCollection(collection.id));
      setSettings(current =>
        current
          ? {
              ...current,
              optedInCollectionIds: include
                ? [...current.optedInCollectionIds, collection.id]
                : current.optedInCollectionIds.filter(id => id !== collection.id),
            }
          : current
      );
    }, 'Could not update what your link shows. Please try again.');

  const openDialog = () => {
    setError(null);
    setEmailNote(null);
    setRecipient('');
    setCopied(false);
    setOpen(true);
  };

  const busy = phase === 'pending';

  const body = !read.ok ? (
    <p className={styles.hint}>Your share link is unavailable right now.</p>
  ) : !settings?.exists ? (
    <>
      <Button type="button" variant="outline" loading={busy} onClick={handleReset}>
        Create link
      </Button>
      {error && <FormError>{error}</FormError>}
    </>
  ) : (
    <>
      {shareUrl ? (
        <>
          <p className={styles.hint}>
            Anyone with this link can see your work. The same link keeps working until you reset it,
            so you can send it to as many people as you like.
          </p>
          <p className={styles.link}>{shareUrl}</p>
          <div className={styles.row}>
            <Button type="button" variant="outline" onClick={handleCopy} disabled={busy}>
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </div>

          <div className={styles.row}>
            <input
              type="email"
              name="recipientEmail"
              autoComplete="email"
              spellCheck={false}
              className={styles.input}
              placeholder="name@example.com…"
              aria-label="Send the link to this email address"
              value={recipient}
              onChange={event => setRecipient(event.target.value)}
              disabled={busy}
            />
            <Button
              type="button"
              variant="outline"
              loading={busy}
              disabled={!recipient.trim()}
              onClick={handleEmail}
            >
              Send
            </Button>
          </div>
          {emailNote && <p className={styles.note}>{emailNote}</p>}
        </>
      ) : (
        <p className={styles.hint}>
          Your link is active, but it was created before links could be shown again here. Reset it
          to get one you can copy.
        </p>
      )}

      {settings.candidateCollections.length > 0 && (
        <div className={styles.optIns}>
          <p className={styles.hint}>
            Galleries you were given access to are not shared by default. Add any you want your link
            to include.
          </p>
          <ul className={styles.optInList}>
            {settings.candidateCollections.map(collection => (
              <li key={collection.id} className={styles.optInItem}>
                <label className={styles.optInLabel}>
                  <input
                    type="checkbox"
                    checked={optedIn.has(collection.id)}
                    disabled={busy}
                    onChange={event => toggleCollection(collection, event.target.checked)}
                  />
                  <span>{collection.title}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.danger}>
        <p className={styles.hint}>
          Resetting makes a new link and stops the old one working — anyone still using it will lose
          access.
        </p>
        <Button type="button" variant="outline" loading={busy} onClick={handleReset}>
          Reset link
        </Button>
      </div>

      {error && <FormError>{error}</FormError>}
    </>
  );

  return (
    <>
      <FilterChip label="Share" onToggle={openDialog} ariaHasPopup="dialog" ariaExpanded={open} />
      <Modal open={open} onClose={() => setOpen(false)} variant="overlay" labelledBy="share-title">
        <div className={styles.content}>
          <div className={styles.header}>
            <h2 id="share-title" className={styles.title}>
              Share
            </h2>
            <CloseButton onClick={() => setOpen(false)} aria-label="Close" />
          </div>
          {body}
        </div>
      </Modal>
    </>
  );
}
