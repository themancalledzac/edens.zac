// Admin = authenticated admin principal: the backend enforces hasRole('ADMIN') on
// /api/admin/** (gating centralized in app/(admin)/layout.tsx via requireAdmin()).
import { notFound } from 'next/navigation';

import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { getRole } from '@/app/lib/api/roles';

import { RoleDetailClient } from './RoleDetailClient';

export const dynamic = 'force-dynamic';

/** Admin role detail — edit a role's members and its per-collection grants. */
export default async function AdminRoleDetailPage({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const { roleId } = await params;
  const id = Number(roleId);
  if (!Number.isInteger(id)) notFound();

  const role = await getRole(id).catch(() => null);
  if (!role) notFound();

  return (
    <PageShell pageType="collectionsCollection">
      <RoleDetailClient initialRole={role} />
    </PageShell>
  );
}
