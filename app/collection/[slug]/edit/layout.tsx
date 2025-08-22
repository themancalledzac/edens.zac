/**
 * Edit Collection Layout — wraps standard collection layout and shows Edit mode banner.
 */
import type { ReactNode } from 'react';

export default function EditCollectionLayout({ children, viewer, sidebar }: { children: ReactNode; viewer: ReactNode; sidebar: ReactNode }) {
  return (
    <main style={{ padding: '1rem', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{
        padding: '0.5rem 0.75rem',
        background: '#e3f2fd',
        border: '1px solid #90caf9',
        color: '#0d47a1',
        borderRadius: 8,
        marginBottom: '1rem',
        fontWeight: 600,
      }}>
        Edit mode — URL: /edit
      </div>
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
          main > div:nth-of-type(2) { 
            display: grid; 
            grid-template-columns: 3fr 1fr; 
            align-items: start;
          }
        }
      `}</style>
    </main>
  );
}
