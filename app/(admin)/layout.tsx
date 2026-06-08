import { type ReactNode } from 'react';

import { requireAdmin } from '@/app/utils/admin';

import styles from './layout.module.scss';

/**
 * Layout for every (admin) route — the single home for admin gating, and the
 * one place the admin subtree opts into the dark surface.
 *
 * Gating: perimeter-only today (see requireAdmin); when identity/session auth
 * lands (009), the gate goes inside requireAdmin and this is the one
 * enforcement point.
 *
 * Surface: the wrapper carries data-surface="dark" so the scoped token
 * overrides in globals.css apply to every admin descendant, and paints the
 * surface itself (background/color). The page containers (PageShell,
 * ManageClient) only own height and otherwise show through to the white body,
 * so this wrapper is what actually makes admin render dark. The public site is
 * untouched — only the (admin) segment opts in.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin(); // non-enforcing today
  return (
    <div data-surface="dark" className={styles.surface}>
      {children}
    </div>
  );
}
