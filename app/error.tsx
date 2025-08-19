"use client";

/**
 * Title: Global Error Boundary (App Router)
 *
 * What this file is:
 * - Client component used by the App Router to render a fallback UI when an error is thrown.
 *
 * Replaces in the old code:
 * - Replaces _error.tsx / custom error pages from the Pages Router in favor of per-route error boundaries.
 *
 * New Next.js features used:
 * - Route-level error.tsx in the App Router with reset() for recovery.
 *
 * TODOs / Improvements:
 * - Wire up error reporting (Sentry/Datadog) and show a friendlier message by environment.
 */
import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Optionally report error to monitoring service
    // console.error(error);
  }, [error]);

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Something went wrong</h1>
      {error?.digest ? (
        <p style={{ color: "#888" }}>Error ID: {error.digest}</p>
      ) : null}
      <button onClick={() => reset()} style={{ marginTop: "1rem" }}>
        Try again
      </button>
    </main>
  );
}
