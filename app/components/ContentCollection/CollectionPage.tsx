import { type CollectionModel } from '@/app/types/Collection';
import {
  type AnyContentModel,
  type CollectionContentModel,
  type ParallaxImageContentModel,
} from '@/app/types/Content';
import { isCollectionContent } from '@/app/utils/contentTypeGuards';

import ContentBlockWithFullScreen from '../Content/ContentBlockWithFullScreen';
import SiteHeader from '../SiteHeader/SiteHeader';
import styles from './ContentCollectionPage.module.scss';

interface ContentCollectionPageProps {
  collection: CollectionModel | CollectionModel[];
  collectionType?: string;
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
 * Convert CollectionContentModel to ParallaxImageContentModel
 * Used when processing content blocks from a collection that contain child collections
 */
function collectionContentToParallax(col: CollectionContentModel): ParallaxImageContentModel {
  // Extract dimensions - prioritize width/height from CollectionContentModel
  const imageWidth = col.width;
  const imageHeight = col.height;
  
  return {
    contentType: 'PARALLAX',
    enableParallax: true,
    id: col.id,
    title: col.title,
    slug: col.slug,
    collectionType: col.collectionType,
    description: col.description ?? null,
    imageUrl: col.imageUrl ?? '',
    // Use explicit width/height for proper chunking
    // Map width/height to imageWidth/imageHeight for parallax images
    imageWidth,
    imageHeight,
    // Also set width/height on base Content interface for layout
    width: imageWidth,
    height: imageHeight,
    orderIndex: col.orderIndex,
    visible: col.visible ?? true,
    createdAt: col.createdAt,
    updatedAt: col.updatedAt,
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
  collectionType: _collectionType,
}: ContentCollectionPageProps) {
  // Get content blocks to display
  const contentBlocks: AnyContentModel[] = Array.isArray(collection)
    ? collection.map(collectionToContentModel)
    : (collection.content ?? []).map(block => {
        // TODO: this logic should be out of this location maybe? large if block might be bad?
        // Convert any CollectionContentModel blocks to ParallaxImageContentModel
        // (child collections within a collection's content array)
        if (isCollectionContent(block)) {
          return collectionContentToParallax(block);
        }
        // Ensure PARALLAX content blocks have imageWidth/imageHeight preserved
        // (they might be missing if backend didn't provide them)
        if (block.contentType === 'PARALLAX' && 'enableParallax' in block && block.enableParallax) {
          const parallaxBlock = block as ParallaxImageContentModel;
          // Ensure dimensions are preserved - use imageWidth/imageHeight if available,
          // otherwise fall back to width/height
          if (!parallaxBlock.imageWidth || !parallaxBlock.imageHeight) {
            return {
              ...parallaxBlock,
              imageWidth: parallaxBlock.imageWidth || parallaxBlock.width,
              imageHeight: parallaxBlock.imageHeight || parallaxBlock.height,
            };
          }
        }
        return block;
      });

  // Determine if this is a single collection (for passing slug to SiteHeader)
  const singleCollection = Array.isArray(collection) ? null : collection;
  const collectionSlug = singleCollection?.slug;

  return (
    <div className={styles.container}>
      <SiteHeader pageType={singleCollection ? 'collection' : 'default'} collectionSlug={collectionSlug} />
      <main className={styles.main}>
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
