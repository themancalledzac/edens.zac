import { FollowsProvider } from '@/app/components/Personal/FollowsContext';
import { CollectionHeader } from '@/app/components/ui/CollectionHeader/CollectionHeader';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { meServer } from '@/app/lib/api/auth';
import { listFollowedCollectionIdsServer } from '@/app/lib/api/personal';
import { type CollectionModel } from '@/app/types/Collection';
import { type ContentImageModel, type ViewableContent } from '@/app/types/Content';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

import LocationPageClient from './LocationPageClient';

interface LocationPageProps {
  locationName: string;
  collections: CollectionModel[];
  images: ViewableContent[];
  coverImage: ContentImageModel | null;
}

/**
 * Server shell for a location page. Seeds the viewer's followed collection ids so the
 * FollowsProvider primes without a client round-trip; only logged-in viewers can follow. The read
 * reports failure as `ok: false`, but seeding makes no claim to the viewer (an unseeded Follow
 * button renders unfollowed either way), so a failed read is flattened and degrades to unfollowed.
 * FollowButton self-gates to null without a FollowsProvider, so the provider mounts only for
 * logged-in viewers; anonymous viewers get no Follow button that would 401 on click. The SSR
 * viewport resolves alongside `meServer` so the grid lays out on the server.
 */
export default async function LocationPage({
  locationName,
  collections,
  images,
  coverImage,
}: LocationPageProps) {
  const [me, ssrViewport] = await Promise.all([meServer(), resolveSsrViewport()]);
  const followedRead = me ? await listFollowedCollectionIdsServer() : null;
  const followedIds = followedRead?.ok ? followedRead.items : [];

  const client = (
    <LocationPageClient images={images} collections={collections} ssrViewport={ssrViewport} />
  );

  return (
    <PageShell me={me}>
      <CollectionHeader
        title={locationName}
        count={images.length}
        cover={coverImage?.imageUrl ? { src: coverImage.imageUrl } : undefined}
      />
      {me ? <FollowsProvider initialFollowedIds={followedIds}>{client}</FollowsProvider> : client}
    </PageShell>
  );
}
