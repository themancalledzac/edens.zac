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

  // FollowButton self-gates to null when no FollowsProvider is present, so mount the provider only
  // for logged-in viewers. Anonymous viewers render the client WITHOUT it — no Follow button that
  // would 401 on click.
  const client = <LocationPageClient images={images} collections={collections} />;

  return (
    <PageShell>
      <CollectionHeader
        title={locationName}
        count={images.length}
        cover={coverImage?.imageUrl ? { src: coverImage.imageUrl } : undefined}
      />
      {me ? <FollowsProvider initialFollowedIds={followedIds}>{client}</FollowsProvider> : client}
    </PageShell>
  );
}
