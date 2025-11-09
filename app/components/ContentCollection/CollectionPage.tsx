import { type CollectionModel } from '@/app/types/Collection';
import {
  type AnyContentModel,
  type ParallaxImageContentModel,
} from '@/app/types/Content';
import { processContentBlocks } from '@/app/utils/contentLayout';

import ContentBlockWithFullScreen from '../Content/ContentBlockWithFullScreen';
import SiteHeader from '../SiteHeader/SiteHeader';
import styles from './ContentCollectionPage.module.scss';

interface ContentCollectionPageProps {
  collection: CollectionModel | CollectionModel[];
}

/**
 * Convert CollectionModel to ParallaxImageContentModel
 * Converts collections to Parallax type for unified rendering using the proven parallax path
 * Includes all necessary fields for proper positioning, aspect ratio, and parallax effects
 */
function collectionToContentModel(col: CollectionModel): ParallaxImageContentModel {
  // Extract dimensions from coverImage - prioritize imageWidth/imageHeight for accurate aspect ratios
  const imageWidth = col.coverImage?.imageWidth;
  const imageHeight = col.coverImage?.imageHeight;
  
  return {
    contentType: 'PARALLAX',
    enableParallax: true,
    id: col.id,
    title: col.title,
    slug: col.slug, // For navigation detection
    collectionType: col.type, // For badge display
    description: col.description ?? null,
    imageUrl: col.coverImage?.imageUrl ?? '',
    overlayText: col.title || col.slug || '', // Display title on collection cards
    // Use explicit width/height from coverImage dimensions for proper chunking
    // Prioritize imageWidth/imageHeight for accurate aspect ratio calculations
    imageWidth,
    imageHeight,
    // Also set width/height on base Content interface for layout (fallback)
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
}: ContentCollectionPageProps) {
  // Get content blocks to display
  const contentBlocks: AnyContentModel[] = Array.isArray(collection)
    ? collection.map(collectionToContentModel)
    : processContentBlocks(collection.content ?? [], true, collection.id);

  // Determine if this is a single collection (for passing slug to SiteHeader)
  const singleCollection = Array.isArray(collection) ? null : collection;
  const collectionSlug = singleCollection?.slug;

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <SiteHeader pageType={singleCollection ? 'collection' : 'collectionsCollection'} collectionSlug={collectionSlug} />
        {contentBlocks && contentBlocks.length > 0 ? (
          <ContentBlockWithFullScreen
            content={contentBlocks}
            priorityBlockIndex={0}
            enableFullScreenView
            initialPageSize={30}
            collectionSlug={collectionSlug}
            collectionData={singleCollection ?? undefined}
          />
        ) : null}
      </main>
    </div>
  );
}
