'use client';

import { useCallback, useEffect, useState } from 'react';

import { type CollectionModel } from '@/app/types/Collection';

import styles from './ClientGalleryGate.module.scss';

interface ClientGalleryGateProps {
  collection: CollectionModel;
  children: React.ReactNode;
}

type GateStatus = 'checking' | 'locked' | 'unlocked';

const SESSION_KEY_PREFIX = 'client-gallery-access-';

function getSessionKey(slug: string): string {
  return `${SESSION_KEY_PREFIX}${slug}`;
}

/**
 * Client Gallery Gate
 *
 * Password-protected gate for CLIENT_GALLERY collections.
 * Shows a password prompt before granting access to gallery content.
 * Stores access grants in sessionStorage so users do not need to
 * re-enter credentials during the same browser session.
 *
 * If the gallery has no password, an "Enter Gallery" button grants access.
 * If the gallery has a password, a password input + submit is shown.
 */
export default function ClientGalleryGate({ collection, children }: ClientGalleryGateProps) {
  const [status, setStatus] = useState<GateStatus>('checking');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(getSessionKey(collection.slug));
      if (stored === 'granted') {
        setStatus('unlocked');
        return;
      }
    } catch {
      // sessionStorage may be unavailable (SSR, privacy mode)
    }

    if (collection.isPasswordProtected === false) {
      try {
        sessionStorage.setItem(getSessionKey(collection.slug), 'granted');
      } catch { /* ignore */ }
      setStatus('unlocked');
      return;
    }

    // Probe: galleries without a password return hasAccess: true for empty password
    if (collection.isPasswordProtected === undefined) {
      (async () => {
        try {
          const { validateClientGalleryAccess } = await import('@/app/lib/api/collections');
          const result = await validateClientGalleryAccess(collection.slug, '');
          if (result.hasAccess) {
            try {
              sessionStorage.setItem(getSessionKey(collection.slug), 'granted');
            } catch { /* ignore */ }
            setStatus('unlocked');
            return;
          }
        } catch {
          // Backend error or gallery requires password — fall through to locked
        }
        setStatus('locked');
      })();
      return;
    }

    setStatus('locked');
  }, [collection.slug, collection.isPasswordProtected]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);

      if (!password.trim()) {
        setError('Please enter a password.');
        return;
      }

      setIsSubmitting(true);

      try {
        // Dynamic import avoids bundling API code on the client
        const { validateClientGalleryAccess } = await import('@/app/lib/api/collections');
        const result = await validateClientGalleryAccess(collection.slug, password);

        if (result.hasAccess) {
          try {
            sessionStorage.setItem(getSessionKey(collection.slug), 'granted');
          } catch {
            // Ignore storage errors
          }
          setStatus('unlocked');
        } else {
          setError('Incorrect password. Please try again.');
          setPassword('');
        }
      } catch {
        setError('Unable to verify access. Please try again later.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [collection.slug, password]
  );

  if (status === 'checking') {
    return null;
  }

  if (status === 'unlocked') {
    return <div>{children}</div>;
  }

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
            disabled={isSubmitting}
          />
          {error && <p className={styles.gateError}>{error}</p>}
          <button
            type="submit"
            className={styles.gateButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Verifying...' : 'Enter Gallery'}
          </button>
        </form>
      </div>
    </div>
  );
}
