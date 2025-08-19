/**
 * Collection Layout with Parallel Routes (@viewer, @sidebar)
 *
 * What this file is:
 * - Layout for /collection/[slug] that arranges the @viewer and @sidebar slots responsively.
 * - Enables independent loading/error boundaries for each slot.
 *
 * Replaces in the old code:
 * - Replaces monolithic page layouts in Pages Router that coupled metadata and viewer in a single render path.
 *
 * New Next.js features used:
 * - Parallel Routes in the App Router (named slots) + responsive CSS via a simple grid.
 *
 * TODOs / Improvements:
 * - Move inline styles to CSS Modules and adopt a shared layout system.
 * - Consider adding error.tsx per slot for finer error UX.
 */
import type { ReactNode } from 'react';

// Parallel routes layout for collection pages
// Renders @viewer and @sidebar independently so each can load/fail in isolation
export default function CollectionLayout({
  children,
  viewer,
  sidebar,
}: {
  children: ReactNode;
  viewer: ReactNode;
  sidebar: ReactNode;
}) {
  // children is unused here; we rely on parallel routes viewer/sidebar
  // but include it for completeness/fallback rendering when needed
  return (
    <main style={{ padding: '1rem', maxWidth: 1400, margin: '0 auto' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '1rem',
        }}
      >
        <div style={{ order: 1 }}>{viewer}</div>
        <aside style={{ order: 2 }}>{sidebar}</aside>
      </div>
      <noscript>{children}</noscript>
      <style>{`
        @media (min-width: 960px) {
          main > div { 
            display: grid; 
            grid-template-columns: 3fr 1fr; 
            align-items: start;
          }
        }
      `}</style>
    </main>
  );
}
