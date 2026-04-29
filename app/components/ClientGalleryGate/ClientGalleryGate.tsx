'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

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
    [collection.slug, password, router]
  );

  if (submitState === 'unlocking') {
    return (
      <div className={styles.gateContainer}>
        <div className={styles.gateCard}>
          <h1 className={styles.gateTitle}>{collection.title}</h1>
          <p className={styles.gateSubtitle}>Client Gallery</p>
          <p className={styles.gateLoading} role="status" aria-live="polite">
            <span className={styles.gateSpinner} aria-hidden="true" />
            Loading gallery…
          </p>
        </div>
      </div>
    );
  }

  const isVerifying = submitState === 'verifying';

  return (
    <div className={styles.gateContainer}>
      <div className={styles.gateCard}>
        <h1 className={styles.gateTitle}>{collection.title}</h1>
        <p className={styles.gateSubtitle}>Client Gallery</p>

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
            disabled={isVerifying}
          />
          {error && <p className={styles.gateError}>{error}</p>}
          <button type="submit" className={styles.gateButton} disabled={isVerifying}>
            {isVerifying ? 'Verifying...' : 'Enter Gallery'}
          </button>
        </form>
      </div>
    </div>
  );
}
