import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { type CollectionModel,CollectionType } from '@/app/types/Collection';
import { type AnyContentModel, type ContentParallaxImageModel } from '@/app/types/Content';
import { clampParallaxDimensions } from '@/app/utils/contentLayout';

import CollectionPageClient from './CollectionPageClient';
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
  // Defense-in-depth: never render a coverImage for a password-protected CLIENT_GALLERY in
  // list views. Backend BE-H5 strips it at the API, but a stale cache or future regression
  // could re-expose it.
  const isProtected =
    col.type === CollectionType.CLIENT_GALLERY && col.isPasswordProtected === true;
  const safeCoverImage = isProtected ? null : col.coverImage;
  const { imageWidth, imageHeight } = clampParallaxDimensions(
    safeCoverImage?.imageWidth,
    safeCoverImage?.imageHeight
  );

  return {
    contentType: 'IMAGE',
    enableParallax: true,
    id: col.id,
    title: col.title,
    slug: col.slug,
    collectionType: col.type,
    description: col.description ?? null,
    imageUrl: safeCoverImage?.imageUrl ?? '',
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
    locations: [],
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
  // Single collection: delegate to client component for filter support
  if (!Array.isArray(collection)) {
    return (
      <div className={styles.container}>
        <main className={styles.main}>
          <SiteHeader pageType="collection" collectionSlug={collection.slug} />
          <CollectionPageClient collection={collection} chunkSize={chunkSize} />
        </main>
      </div>
    );
  }

  // Array of collections: server-rendered grid (no filters)
  const contentBlocks: AnyContentModel[] = collection.map(collectionToContentModel);

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <SiteHeader pageType="collectionsCollection" />
        {contentBlocks.length > 0 ? (
          <ContentBlockWithFullScreen
            content={contentBlocks}
            priorityBlockIndex={0}
            enableFullScreenView
            initialPageSize={30}
            chunkSize={chunkSize}
          />
        ) : null}
      </main>
    </div>
  );
}
