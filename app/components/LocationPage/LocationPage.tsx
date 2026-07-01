import { FollowsProvider } from '@/app/components/Personal/FollowsContext';
import { CollectionHeader } from '@/app/components/ui/CollectionHeader/CollectionHeader';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { meServer } from '@/app/lib/api/auth';
import { listFollowedCollectionIdsServer } from '@/app/lib/api/personal';
import { type CollectionModel } from '@/app/types/Collection';
import { type ContentImageModel } from '@/app/types/Content';

import LocationPageClient from './LocationPageClient';

interface LocationPageProps {
  locationName: string;
  collections: CollectionModel[];
  images: ContentImageModel[];
  coverImage: ContentImageModel | null;
}

export default async function LocationPage({
  locationName,
  collections,
  images,
  coverImage,
}: LocationPageProps) {
  // Seed the viewer's followed collection ids so the FollowsProvider primes without a client
  // round-trip. Only logged-in viewers can follow; the read returns [] for anonymous viewers.
  const me = await meServer();
  const followedIds = me ? await listFollowedCollectionIdsServer() : [];

  return (
    <PageShell>
      <CollectionHeader
        title={locationName}
        count={images.length}
        cover={coverImage?.imageUrl ? { src: coverImage.imageUrl } : undefined}
      />
      <FollowsProvider initialFollowedIds={followedIds}>
        <LocationPageClient images={images} collections={collections} />
      </FollowsProvider>
    </PageShell>
  );
}
