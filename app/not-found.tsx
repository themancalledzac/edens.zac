/**
 * Global 404 Not Found (App Router)
 *
 * What this file is:
 * - Catch-all not-found UI for routes that call notFound() or fail to resolve.
 *
 * Replaces in the old code:
 * - Replaces custom 404 page in Pages Router (pages/404.tsx) with App Router not-found.tsx.
 *
 * New Next.js features used:
 * - Route-aware notFound() handling that renders this component automatically.
 *
 * TODOs / Improvements:
 * - Add helpful links or search; consider logging missing slugs during migration.
 */
import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>404 — Not Found</h1>
      <p>The page you’re looking for doesn’t exist.</p>
      <p>
        <Link href="/">Return home</Link>
      </p>
    </main>
  );
}
