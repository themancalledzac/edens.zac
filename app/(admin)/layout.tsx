import { type ReactNode } from 'react';

import { requireAdmin } from '@/app/utils/admin';

import { AdminScrollManager } from './AdminScrollManager';

/**
 * Root layout for every (admin) route. Gates access via {@link requireAdmin}, and otherwise gets
 * out of the way.
 *
 * It used to wrap the subtree in `data-surface="dark"` plus a painted `.surface` box, which gave
 * the admin area a bespoke charcoal visual language the public site never had. That is gone: admin
 * routes now render on the same light surface as every other page, through the same `PageShell` /
 * `CollectionHeader` primitives, so a change to the shared chrome cannot drift between the two
 * halves of the site. A real dark mode, if it comes, belongs to the whole site behind a user
 * preference — not to a route group.
 *
 * The scoped `[data-surface='dark']` token block in `app/styles/globals.css` and the surface
 * bridge in `Modal` survive deliberately: they are the general mechanism for that future toggle,
 * and neither is admin-specific. What was deleted here is the admin-only wiring into it.
 *
 * No wrapper element remains — `PageShell` (and the collection-edit pages' own container) already
 * carry `min-height: 100dvh`, and the removed box only existed to paint behind them.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin(); // redirects non-admins (and anon) to /login
  return (
    <>
      <AdminScrollManager />
      {children}
    </>
  );
}
