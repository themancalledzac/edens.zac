'use client';

import { CollectionHeader } from '@/app/components/ui/CollectionHeader/CollectionHeader';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import type { LocationModel } from '@/app/types/Collection';
import type { ContentPersonModel, ContentTagModel } from '@/app/types/ImageMetadata';

import { MetadataLocationList } from './MetadataLocationList';
import styles from './MetadataPage.module.scss';
import { MetadataPersonList } from './MetadataPersonList';
import { MetadataTagList } from './MetadataTagList';

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
        <MetadataTagList items={tags} />
        <MetadataPersonList items={people} />
        <MetadataLocationList items={locations} />
      </div>
    </PageShell>
  );
}
