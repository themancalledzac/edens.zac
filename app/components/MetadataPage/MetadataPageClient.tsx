'use client';

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
        />
      </div>
    </PageShell>
  );
}
