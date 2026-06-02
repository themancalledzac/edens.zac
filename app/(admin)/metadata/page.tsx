import { MetadataPageClient } from '@/app/components/MetadataPage/MetadataPageClient';
import { getMetadata } from '@/app/lib/api/collections';

// Render on every request. `getMetadata()` calls fetchAdminGetApi which would
// fail mid-build if the build container can't reach the proxy/backend (which
// it can't reliably during a fresh deploy — the proxy points at a not-yet-live
// version of itself). See app/tag/[slug]/page.tsx for the same rationale.
export const dynamic = 'force-dynamic';

export default async function MetadataPage() {
  // Catch backend failures so a transient outage returns a fallback page instead
  // of a 500. getMetadata() calls fetchAdminGetApi, which re-throws on failure.
  let metadata;
  try {
    metadata = await getMetadata();
  } catch {
    metadata = null;
  }

  if (!metadata) {
    return <p>Failed to load metadata.</p>;
  }

  const { tags, people, locations } = metadata;

  return <MetadataPageClient tags={tags} people={people} locations={locations} />;
}
