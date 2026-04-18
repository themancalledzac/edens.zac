import { MetadataPageClient } from '@/app/components/MetadataPage/MetadataPageClient';
import { getMetadata } from '@/app/lib/api/collections';

export const revalidate = 3600;

export default async function MetadataPage() {
  const metadata = await getMetadata();

  if (!metadata) {
    return <p>Failed to load metadata.</p>;
  }

  const { tags, people, locations } = metadata;

  return <MetadataPageClient tags={tags} people={people} locations={locations} />;
}
