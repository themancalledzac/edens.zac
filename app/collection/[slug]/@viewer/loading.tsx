/**
 * Viewer Slot — Loading Skeleton
 *
 * What this file is:
 * - loading.tsx specifically for the @viewer parallel route, shown while viewer data streams.
 *
 * Replaces in the old code:
 * - Replaces manual suspense placeholders or client spinners in a unified slot-aware loading file.
 *
 * New Next.js features used:
 * - Slot-scoped loading for Parallel Routes in the App Router.
 *
 * TODOs / Improvements:
 * - Move inline styles to CSS Modules and align with final block/grid layout.
 */
export default function ViewerLoading() {
  return (
    <section aria-label="Loading viewer" style={{ display: 'grid', gap: '1rem' }}>
      {['a','b','c','d','e','f'].map((k) => (
        <div key={k} style={{ height: 180, background: '#fafafa', border: '1px solid #eee', borderRadius: 8 }} />
      ))}
    </section>
  );
}
