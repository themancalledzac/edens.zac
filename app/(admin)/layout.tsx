import { type ReactNode } from 'react';

import { requireAdmin } from '@/app/utils/admin';

import { AdminScrollManager } from './AdminScrollManager';
import styles from './layout.module.scss';

/**
 * Root layout for every (admin) route. Gates access via {@link requireAdmin} and
 * opts the subtree into the dark surface via `data-surface="dark"`.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin(); // non-enforcing today
  return (
    <div data-surface="dark" className={styles.surface}>
      <AdminScrollManager />
      {children}
    </div>
  );
}
