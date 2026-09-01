'use client';

import { useEffect } from 'react';

import { logger } from '@/app/utils/logger';

/**
 * Last-resort boundary for a failure in the root layout itself.
 *
 * Next replaces the whole document when this renders, so it owns `<html>` and `<body>` and
 * pulls in no component, provider or stylesheet of its own. Anything it imported could be the
 * thing that just crashed, and a boundary that throws shows the browser's default error page.
 * That is why the styling is inline rather than an SCSS module.
 *
 * The digest is rendered because it is the only identifier a viewer can quote that matches a
 * line in CloudWatch — the stack never leaves the server.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('global-error', 'Root layout error boundary', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#fff',
          color: '#1a1a1a',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
        }}
      >
        <div role="alert" style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.75rem' }}>
            Something went wrong
          </h1>
          <p style={{ margin: '0 0 1.5rem', lineHeight: 1.5 }}>
            The page could not be loaded. Retrying may be enough; if it is not, the ID below
            identifies this failure.
          </p>
          {error?.digest ? (
            <p style={{ margin: '0 0 1.5rem', fontFamily: 'ui-monospace, monospace' }}>
              Error ID: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: '0.625rem 1.25rem',
              fontSize: '1rem',
              cursor: 'pointer',
              color: '#fff',
              background: '#1a1a1a',
              border: 'none',
              borderRadius: '0.25rem',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
