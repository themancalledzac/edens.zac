import { type ReactNode } from 'react';

import { requireAdmin } from '@/app/utils/admin';

/**
 * Layout for every (admin) route — the single home for admin gating.
 * Today perimeter-only (see requireAdmin); renders children unchanged. When identity/session
 * auth lands (009), the gate goes inside requireAdmin and this is the one enforcement point.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin(); // non-enforcing today
  return children;
}
