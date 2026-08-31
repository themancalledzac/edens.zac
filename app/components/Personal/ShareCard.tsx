'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import { Card } from '@/app/components/ui/Card/Card';
import { FormError } from '@/app/components/ui/Field/FormError';
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

import styles from './ShareCard.module.scss';

export interface ShareCardProps {
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
 * "Share" card for `/user`: the link the owner hands to a friend, client or parent, plus the
 * controls for sending and revoking it.
 *
 * The link is deliberately shown in full and copyable on every visit, not just the one that
 * created it. Sending the same link to a second person months later must not require a reset —
 * a reset cuts off whoever is already using the first copy, which is the failure this whole
 * feature exists to avoid. Reset is therefore presented as the destructive action it is, well
 * away from the everyday copy and email controls.
 *
 * The opt-in list is off by default and covers only galleries the owner was granted access to but
 * is not tagged in. Tagged-in work is in every share already; a gallery someone else let them into
 * is not theirs to pass on, so sharing it has to be a deliberate act.
 *
 * Three smaller choices, so they are not undone by accident: the origin is read on the client so a
 * copied link matches the host the owner is actually on, without threading a base URL down from
 * the server; a refused clipboard permission is not an error, since the link is on screen and
 * selectable either way; and a failed settings read renders "unavailable" rather than the
 * create-a-link empty state, which would read as "you have none" to someone whose link is out
 * there working.
 */
export function ShareCard({ read }: ShareCardProps) {
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

  const busy = phase === 'pending';

  if (!read.ok) {
    return (
      <Card title="Share">
        <p className={styles.hint}>Your share link is unavailable right now.</p>
      </Card>
    );
  }

  if (!settings?.exists) {
    return (
      <Card title="Share">
        <Button type="button" variant="outline" loading={busy} onClick={handleReset}>
          Link to share
        </Button>
        {error && <FormError>{error}</FormError>}
      </Card>
    );
  }

  return (
    <Card title="Share">
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
              className={styles.input}
              placeholder="Email it to someone"
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
    </Card>
  );
}
