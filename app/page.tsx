import Link from 'next/link';
import React from 'react';

/**
 * Temporary App Router home page (RSC) while migrating from Pages Router.
 * Keeps legacy pages/index.tsx intact. //TODO:deprecate legacy page after 5.2 parity
 */
export default async function HomePage() {
  return (
    <main style={{ padding: '2rem', display: 'grid', gap: '1rem' }}>
      <h1>Welcome</h1>
      <p>
        App Router scaffold is active. The full home experience from the Pages Router
        will be migrated incrementally in phase 5.2.
      </p>
      <nav style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/catalog/sample">Go to a catalog (legacy)</Link>
        <Link href="/blog/sample">Go to a blog (legacy)</Link>
      </nav>
    </main>
  );
}
