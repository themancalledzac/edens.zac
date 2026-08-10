'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import { Modal } from '@/app/components/ui/Modal/Modal';
import { LoadingText } from '@/app/components/ui/StatusText/LoadingText';
import { ApiError } from '@/app/lib/api/core';
import { type CollectionModel } from '@/app/types/Collection';

import styles from './ClientGalleryGate.module.scss';

interface ClientGalleryGateProps {
  collection: CollectionModel;
}

type SubmitState = 'idle' | 'verifying' | 'unlocking';

// Failsafe: if router.refresh() never replaces this gate with the page (e.g.
// the gallery is empty so the wrapper still routes to <CollectionPage> with
// nothing to show, but for whatever reason the prop change doesn't unmount us),
// drop the spinner after this many ms so the user isn't stuck.
const UNLOCKING_FAILSAFE_MS = 5000;

/**
 * Client Gallery Gate
 *
 * Password form for locked CLIENT_GALLERY collections. The wrapper
 * (`CollectionPageWrapper`) routes between this component and
 * `<CollectionPage>` based on `Array.isArray(collection.content)` — so this
 * component is only mounted when the viewer has no valid `gallery_access_<slug>`
 * cookie. Successful submission sets the cookie and triggers `router.refresh()`,
 * which re-runs the wrapper server-side and unmounts the gate in favor of the
 * page. The brief in-between window shows a "Loading gallery…" state.
 *
 * That window used to be a second `return` with its own card, which meant the "Loading gallery…"
 * live region was created at the same moment it got its text — the case screen readers routinely
 * miss (see {@link LoadingText}). The card is now one tree: the region is always mounted below the
 * form, empty and zero-height until unlocking swaps the form out and fills it in. The empty node
 * costs no layout because `.gateCard` is a plain block with no `gap` for it to claim a slot in.
 * The message itself moves up 1rem into the slot the form vacates — see `.gateLoading`.
 *
 * ## Neither control is `disabled` while verifying
 *
 * Browsers drop focus from a control the instant it becomes disabled, and focus lands on `<body>`.
 * Inside this `Modal` that is worse than it sounds: the dialog is `aria-modal`, so one Tab from
 * `<body>` walks the page BEHIND the gate — the very page the password is protecting. Both
 * controls here are the ones the user is focused on when it happens: the input is `autoFocus`ed,
 * and pressing Enter in it submits, so whichever of the two holds focus is the one that would be
 * disabled out from under them.
 *
 * The submit button takes the same treatment as the other pending buttons in this branch
 * (`RatingStars`, `MenuDropdown`'s Clear Cache): `aria-disabled` for the semantics, focusable
 * throughout, and {@link handleSubmit} guards the pending state itself so a second Enter or click
 * cannot issue a second request.
 *
 * The input takes `readOnly` rather than `aria-disabled`, because a text field has a native
 * attribute for exactly this and a button does not. `readOnly` stays focusable, keeps the value
 * selectable and submittable, blocks editing without a JS guard, and is announced as read-only.
 * `aria-disabled` on a still-editable field would announce a state the field is not in.
 */
export default function ClientGalleryGate({ collection }: ClientGalleryGateProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

  useEffect(() => {
    if (submitState !== 'unlocking') return;
    const timer = setTimeout(() => {
      setSubmitState('idle');
      setError(
        'Verified, but the gallery did not load. Please refresh the page or contact the gallery owner.'
      );
    }, UNLOCKING_FAILSAFE_MS);
    return () => clearTimeout(timer);
  }, [submitState]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (submitState !== 'idle') return;
      setError(null);

      if (!password.trim()) {
        setError('Please enter a password.');
        return;
      }

      setSubmitState('verifying');

      try {
        const { validateClientGalleryAccess } = await import('@/app/lib/api/collections');
        const result = await validateClientGalleryAccess(collection.slug, password);

        if (result.hasAccess) {
          // Cookie is now set on the response. Trigger an SSR re-fetch — the
          // wrapper will route to <CollectionPage> on the next render and
          // unmount us. Show a loading state during that window.
          setSubmitState('unlocking');
          router.refresh();
        } else {
          setError('Incorrect password. Please try again.');
          setPassword('');
          setSubmitState('idle');
        }
      } catch (error_) {
        if (error_ instanceof ApiError) {
          if (error_.status === 429) {
            setError('Too many attempts. Please wait 15 minutes and try again.');
          } else if (error_.status === 404) {
            setError('Gallery not found. Check the URL and try again.');
            setPassword('');
          } else if (error_.status === 403) {
            setError('Access denied. Please contact the gallery owner.');
            setPassword('');
          } else {
            setError('Unable to verify access. Please try again later.');
            setPassword('');
          }
        } else {
          setError('Network error. Please check your connection and try again.');
          setPassword('');
        }
        setSubmitState('idle');
      }
    },
    [collection.slug, password, router, submitState]
  );

  const isVerifying = submitState === 'verifying';
  const isUnlocking = submitState === 'unlocking';

  return (
    <Modal open onClose={() => {}} variant="overlay" labelledBy="gate-title">
      <div className={styles.gateCard}>
        <h1 id="gate-title" className={styles.gateTitle}>
          {collection.title}
        </h1>
        <p className={styles.gateSubtitle}>Client Gallery</p>

        {!isUnlocking && (
          <form onSubmit={handleSubmit} className={styles.gateForm}>
            <label htmlFor="gallery-password" className={styles.gateLabel}>
              Enter the password to view this gallery
            </label>
            <input
              id="gallery-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={styles.gateInput}
              placeholder="Gallery password"
              autoFocus
              autoComplete="off"
              readOnly={isVerifying}
            />
            {error && <p className={styles.gateError}>{error}</p>}
            <Button
              type="submit"
              className={styles.gateButton}
              aria-disabled={isVerifying || undefined}
            >
              {isVerifying ? 'Verifying…' : 'Enter Gallery'}
            </Button>
          </form>
        )}

        <LoadingText isLoading={isUnlocking} className={styles.gateLoading}>
          <span className={styles.gateSpinner} aria-hidden="true" />
          Loading gallery…
        </LoadingText>
      </div>
    </Modal>
  );
}
