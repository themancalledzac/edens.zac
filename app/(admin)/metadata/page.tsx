// Admin = authenticated admin principal: the backend enforces hasRole('ADMIN') on
// /api/admin/** (see docs 009). Gating centralized in app/(admin)/layout.tsx via requireAdmin().
import { MetadataPageClient } from '@/app/components/MetadataPage/MetadataPageClient';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { meServer } from '@/app/lib/api/auth';
import { getMetadata } from '@/app/lib/api/collections';

// Render on every request. `getMetadata()` calls fetchAdminGetApi which would
// fail mid-build if the build container can't reach the proxy/backend (which
// it can't reliably during a fresh deploy — the proxy points at a not-yet-live
// version of itself). See app/tag/[slug]/page.tsx for the same rationale.
export const dynamic = 'force-dynamic';

/**
 * Catches backend failures so a transient outage returns a fallback page instead of a 500.
 * `getMetadata()` calls fetchAdminGetApi, which re-throws on failure. `meServer()` failures fall
 * back to null.
 */
export default async function MetadataPage() {
  const mePromise = meServer().catch(() => null);
  let metadata;
  try {
    metadata = await getMetadata();
  } catch {
    metadata = null;
  }
  const me = await mePromise;

  if (!metadata) {
    return (
      <PageShell backHref="/admin" me={me}>
        <p>Failed to load metadata.</p>
      </PageShell>
    );
  }

  const { tags, people, locations } = metadata;

  return <MetadataPageClient tags={tags} people={people} locations={locations} me={me} />;
}
