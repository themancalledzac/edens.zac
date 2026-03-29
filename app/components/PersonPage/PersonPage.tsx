import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { type ContentImageModel } from '@/app/types/Content';
import { processContentBlocks } from '@/app/utils/contentLayout';

import styles from './PersonPage.module.scss';

interface PersonPageProps {
  personName: string;
  images: ContentImageModel[];
}

export default function PersonPage({ personName, images }: PersonPageProps) {
  const contentBlocks = processContentBlocks(images, true);

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <SiteHeader pageType="default" />
        <div className={styles.pageHeader}>
          <div className={styles.headerMeta}>
            <h1 className={styles.pageName}>{personName}</h1>
            <span className={styles.imageCount}>
              {images.length} {images.length === 1 ? 'photo' : 'photos'}
            </span>
          </div>
        </div>
        {contentBlocks.length > 0 && (
          <ContentBlockWithFullScreen
            content={contentBlocks}
            priorityBlockIndex={0}
            enableFullScreenView
            initialPageSize={30}
            chunkSize={4}
          />
        )}
      </main>
    </div>
  );
}
