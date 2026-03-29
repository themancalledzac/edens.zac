import Image from 'next/image';

import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { type CollectionModel } from '@/app/types/Collection';
import { type ContentImageModel } from '@/app/types/Content';

import styles from './LocationPage.module.scss';
import LocationPageClient from './LocationPageClient';

interface LocationPageProps {
  locationName: string;
  collections: CollectionModel[];
  images: ContentImageModel[];
  coverImage: ContentImageModel | null;
}

export default function LocationPage({
  locationName,
  collections,
  images,
  coverImage,
}: LocationPageProps) {
  const imageCount = images.length;

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <SiteHeader pageType="default" />

        <div className={styles.locationHeader}>
          {coverImage?.imageUrl ? (
            <>
              <div className={styles.coverImageWrapper}>
                <Image
                  src={coverImage.imageUrl}
                  alt={locationName}
                  fill
                  sizes="(min-width: 768px) 280px, 140px"
                  className={styles.coverImage}
                  priority
                />
              </div>
              <div className={styles.headerInfo}>
                <h1 className={styles.locationName}>{locationName}</h1>
                <span className={styles.imageCount}>
                  {imageCount} {imageCount === 1 ? 'photo' : 'photos'}
                </span>
              </div>
            </>
          ) : (
            <div className={styles.headerInfo}>
              <h1 className={styles.locationName}>{locationName}</h1>
              <span className={styles.imageCount}>
                {imageCount} {imageCount === 1 ? 'photo' : 'photos'}
              </span>
            </div>
          )}
        </div>

        <LocationPageClient images={images} collections={collections} />
      </main>
    </div>
  );
}
