import { MetadataPageClient } from '@/app/components/MetadataPage/MetadataPageClient';
import { getMetadata } from '@/app/lib/api/collections';

export const revalidate = 3600;

export default async function MetadataPage() {
  // getMetadata() calls fetchAdminGetApi, which re-throws on any fetch failure.
  // Without this catch the page rejects during ISR prerender (build time) when
  // the build container can't reach the proxy/backend, taking the whole Amplify
  // build down with it. Render the same fallback we'd show for a null payload.
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
