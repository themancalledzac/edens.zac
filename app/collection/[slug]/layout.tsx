/**
 * Collection Layout
 *
 * Responsive layout component for collection pages using parallel routes.
 * Arranges viewer and sidebar slots independently with responsive grid
 * positioning and fallback rendering support.
 *
 * @dependencies
 * - React ReactNode type for slot typing
 * - Next.js parallel routes (@viewer, @sidebar)
 * - Responsive CSS grid with mobile-first approach
 *
 * @param children - Fallback content for noscript scenarios
 * @param viewer - Main content viewer slot (@viewer)
 * @param sidebar - Sidebar metadata slot (@sidebar)
 * @returns Layout component with responsive grid arrangement
 */
import type { ReactNode } from 'react';

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
