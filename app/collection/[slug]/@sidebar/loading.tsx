/**
 * Title: Sidebar Slot — Loading Skeleton
 *
 * What this file is:
 * - loading.tsx for the @sidebar parallel route, rendering lightweight skeletons for title/desc/pagination.
 *
 * Replaces in the old code:
 * - Replaces bespoke spinner components with a slot-specific loader in App Router.
 *
 * New Next.js features used:
 * - Slot-scoped loading behavior for Parallel Routes.
 *
 * TODOs / Improvements:
 * - Move inline styles to CSS Modules.
 * - Mirror the exact pagination control styling for visual stability.
 */
export default function SidebarLoading() {
  return (
    <aside>
      <div style={{ height: 24, width: '70%', background: '#eee', borderRadius: 6 }} />
      <div style={{ height: 16, width: '90%', background: '#f3f3f3', marginTop: 10, borderRadius: 6 }} />
      <ul style={{ listStyle: 'none', padding: 0, marginTop: 16, display: 'grid', gap: 6 }}>
        {['a','b','c','d','e'].map((k) => (
          <li key={k}>
            <div style={{ height: 14, width: '60%', background: '#f7f7f7', borderRadius: 6 }} />
          </li>
        ))}
      </ul>
    </aside>
  );
}
