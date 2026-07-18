// Admin = authenticated admin principal: the backend enforces hasRole('ADMIN') on
// /api/admin/** (gating centralized in app/(admin)/layout.tsx via requireAdmin()).
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { listRoles } from '@/app/lib/api/roles';

import { RolesPageClient } from './RolesPageClient';

export const dynamic = 'force-dynamic';

/** Admin roles hub — list every role and create new ones. Grants + members live on the detail page. */
export default async function AdminRolesPage() {
  const roles = await listRoles().catch(() => []);
  return (
    <PageShell pageType="collectionsCollection">
      <RolesPageClient initialRoles={roles} />
    </PageShell>
  );
}
