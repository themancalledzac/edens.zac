import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { type CollectionModel } from '@/app/types/Collection';
import { type AnyContentModel, type ContentParallaxImageModel } from '@/app/types/Content';
import { clampParallaxDimensions, processContentBlocks } from '@/app/utils/contentLayout';

import styles from './ContentCollectionPage.module.scss';

interface ContentCollectionPageProps {
  collection: CollectionModel | CollectionModel[];
  chunkSize?: number; // Number of images per row (default: 2)
}

/**
 * Converts a CollectionModel to ContentParallaxImageModel for unified parallax rendering.
 * Dimensions are clamped to a minimum 4:5 aspect ratio.
 */
function collectionToContentModel(col: CollectionModel): ContentParallaxImageModel {
  const { imageWidth, imageHeight } = clampParallaxDimensions(
    col.coverImage?.imageWidth,
    col.coverImage?.imageHeight
  );

  return {
    contentType: 'IMAGE',
    enableParallax: true,
    id: col.id,
    title: col.title,
    slug: col.slug,
    collectionType: col.type,
    description: col.description ?? null,
    imageUrl: col.coverImage?.imageUrl ?? '',
    overlayText: col.title || col.slug || '',
    imageWidth,
    imageHeight,
    width: imageWidth,
    height: imageHeight,
    orderIndex: 0,
    visible: col.visible ?? true,
    createdAt: col.createdAt,
    updatedAt: col.updatedAt,
    collectionDate: col.collectionDate,
  };
}

/**
 * Content Collection Page
 *
 * Unified component that displays content using ContentComponent with intelligent chunking.
 * Handles both:
 * - Array of CollectionModel: Converts to ParallaxImageContentModel and displays as cards
 * - Single CollectionModel: Extracts and displays content blocks from collection.content
 *
 * Uses ContentBlockWithFullScreen for:
 * - Intelligent chunking based on image dimensions (groups items in chunks of 2, or 1 for wide shots)
 * - Fullscreen image viewing
 * - Parallax support for both collections and content (all collections are now Parallax type)
 * - Mixed content support (collections + images + text + etc.)
 *
 * @param collection - Single CollectionModel or array of CollectionModels
 * @param collectionType - Optional collection type for future customization
 * @returns Server component displaying unified collection content
 */
export default async function CollectionPage({
  collection,
  chunkSize,
}: ContentCollectionPageProps) {
  const contentBlocks: AnyContentModel[] = Array.isArray(collection)
    ? collection.map(collectionToContentModel)
    : processContentBlocks(collection.content ?? [], true, collection.id, collection.displayMode);

  const singleCollection = Array.isArray(collection) ? null : collection;
  const collectionSlug = singleCollection?.slug;
  const pageSize = singleCollection?.contentPerPage ?? 30;

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <SiteHeader
          pageType={singleCollection ? 'collection' : 'collectionsCollection'}
          collectionSlug={collectionSlug}
        />
        {contentBlocks && contentBlocks.length > 0 ? (
          <ContentBlockWithFullScreen
            content={contentBlocks}
            priorityBlockIndex={0}
            enableFullScreenView
            initialPageSize={pageSize}
            chunkSize={chunkSize}
            collectionSlug={collectionSlug}
            collectionData={singleCollection ?? undefined}
          />
        ) : null}
      </main>
    </div>
  );
}
