'use client';

import { revalidateLocationCaches } from '@/app/components/ContentCollection/edit/collectionEditUtils';
import { CollectionHeader } from '@/app/components/ui/CollectionHeader/CollectionHeader';
import { MetadataList } from '@/app/components/ui/MetadataList/MetadataList';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import type { LocationModel } from '@/app/types/Collection';
import type { ContentPersonModel, ContentTagModel } from '@/app/types/Metadata';

import styles from './MetadataPage.module.scss';

interface MetadataPageClientProps {
  tags: ContentTagModel[];
  people: ContentPersonModel[];
  locations: LocationModel[];
}

/**
 * Renders one {@link MetadataList} per entity type.
 *
 * Owns the slug-keyed revalidation the lists cannot do themselves: a location rename recomputes
 * `slug` backend-side (`MetadataService.updateLocation`) with no slug-history table behind it, so
 * `/location/{old-slug}` stops resolving while `collections-location-${oldSlug}` keeps serving a
 * cached snapshot of it. Deleting a location strands the tag the same way. Passing both the old
 * and new location clears each side.
 *
 * Tags and people get no callback: `collections-location-${slug}` is the only slug-keyed cache tag
 * registered anywhere in `app/lib/api/`, and `updatePerson` does not even have a slug to change.
 */
export function MetadataPageClient({ tags, people, locations }: MetadataPageClientProps) {
  return (
    <PageShell>
      <CollectionHeader title="Metadata" />
      <div className={styles.grid}>
        <MetadataList title="Tags" emptyLabel="No tags" items={tags} basePath="/metadata/tags" />
        <MetadataList
          title="People"
          emptyLabel="No people"
          items={people}
          basePath="/metadata/people"
        />
        <MetadataList
          title="Locations"
          emptyLabel="No locations"
          items={locations}
          basePath="/metadata/locations"
          getHref={item => (item.slug ? `/location/${item.slug}` : null)}
          onRenamed={(previous, next) => void revalidateLocationCaches([previous], [next])}
          onDeleted={item => void revalidateLocationCaches([item], [])}
        />
      </div>
    </PageShell>
  );
}
