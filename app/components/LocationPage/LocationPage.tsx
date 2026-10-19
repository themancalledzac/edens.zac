import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import { FollowsProvider } from '@/app/components/Personal/FollowsContext';
import { LAYOUT } from '@/app/constants';
import { meServer } from '@/app/lib/api/auth';
import { listFollowedCollectionIdsServer, listSavedImageIdsServer } from '@/app/lib/api/personal';
import { type CollectionModel } from '@/app/types/Collection';
import { type ContentImageModel } from '@/app/types/Content';
import { buildLocationCollection } from '@/app/utils/locationCollection';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

interface LocationPageProps {
  locationName: string;
  collections: CollectionModel[];
  images: ContentImageModel[];
}

/**
 * Server shell for a location page. Renders the location as a synthetic collection through
 * {@link CollectionPage}, so it shares the cover header, filter rail and grid of every collection
 * page, with the location's collections ahead of its images.
 *
 * Signed-in viewers get a {@link FollowsProvider} seeded with their followed ids, which arms the
 * Follow button on collection cards, and their saved image ids for the save hearts. A failed
 * follow read degrades to unfollowed. Anonymous viewers get no provider and so no Follow button.
 */
export default async function LocationPage({
  locationName,
  collections,
  images,
}: LocationPageProps) {
  const [me, ssrViewport] = await Promise.all([meServer(), resolveSsrViewport()]);
  const [followedRead, savedImageIds] = me
    ? await Promise.all([listFollowedCollectionIdsServer(), listSavedImageIdsServer()])
    : [null, []];
  const followedIds = followedRead?.ok ? followedRead.items : [];

  const page = (
    <CollectionPage
      collection={buildLocationCollection({ name: locationName, collections, images })}
      chunkSize={LAYOUT.defaultChunkSize}
      ssrViewport={ssrViewport}
      me={me}
      initialSavedImageIds={savedImageIds}
    />
  );

  return me ? <FollowsProvider initialFollowedIds={followedIds}>{page}</FollowsProvider> : page;
}
