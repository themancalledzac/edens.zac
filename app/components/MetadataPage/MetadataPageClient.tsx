'use client';

import type { LocationModel } from '@/app/types/Collection';
import type { ContentPersonModel, ContentTagModel } from '@/app/types/ImageMetadata';

import { SiteHeader } from '@/app/components/SiteHeader/SiteHeader';

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
    <div className={styles.container}>
      <main className={styles.main}>
        <SiteHeader pageType="default" />
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Metadata</h1>
        </div>

        <div className={styles.grid}>
          <MetadataTagList items={tags} />
          <MetadataPersonList items={people} />
          <MetadataLocationList items={locations} />
        </div>
      </main>
    </div>
  );
}
