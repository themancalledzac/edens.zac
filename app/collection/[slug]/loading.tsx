/**
 * Collection Route — Global Loading Skeleton
 *
 * What this file is:
 * - Global loading.tsx for /collection/[slug] that shows a skeleton while the route tree resolves.
 *
 * Replaces in the old code:
 * - Replaces manual client-side loading spinners previously used in Pages Router during CSR/SSR waterfalls.
 *
 * New Next.js features used:
 * - App Router route-level loading state decoupled from component logic.
 *
 * TODOs / Improvements:
 * - Move inline styles to CSS Modules.
 * - Align skeleton shapes with real content block components from Phase 5.4.
 */
export default function Loading() {
  return (
    <main style={{ padding: '1rem', maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: '1rem' }}>
        <div style={{ height: 28, width: '40%', background: '#eee', borderRadius: 6 }} />
        <div style={{ height: 18, width: '60%', background: '#f3f3f3', marginTop: 12, borderRadius: 6 }} />
        <div style={{ height: 12, width: 160, background: '#f7f7f7', marginTop: 8, borderRadius: 6 }} />
      </header>
      <section style={{ display: 'grid', gap: '1rem' }}>
        {['a','b','c','d','e','f'].map((key) => (
          <div key={key} style={{ height: 120, background: '#fafafa', border: '1px solid #eee', borderRadius: 8 }} />
        ))}
      </section>
    </main>
  );
}
