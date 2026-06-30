import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { type MeResponse } from '@/app/types/Auth';
import { type CollectionModel, CollectionType } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import { type AnyContentModel, type ContentParallaxImageModel } from '@/app/types/Content';
import { clampParallaxDimensions } from '@/app/utils/contentLayout';
import { type SsrViewport } from '@/app/utils/ssrViewport';

import CollectionPageClient from './CollectionPageClient';
import styles from './ContentCollectionPage.module.scss';

interface ContentCollectionPageProps {
  collection: CollectionModel | CollectionModel[];
  chunkSize?: number; // Number of images per row (default: 2)
  /**
   * Opt-in flag to bypass the defense-in-depth strip of cover images on
   * password-protected CLIENT_GALLERY entries. Admin-only callers (e.g.
   * /all-collections, /collectionType/* in local dev) set this true so the
   * admin can see their own covers. Default false preserves the strip for
   * anonymous public list views.
   */
  showProtectedCovers?: boolean;
  /** UA-derived SSR fallback viewport from {@link resolveSsrViewport}. */
  ssrViewport?: SsrViewport;
  /** Mounts the admin edit surface in CollectionPageClient (single-collection branch only). */
  editMode?: boolean;
  /** Server-resolved principal (from `meServer()`), forwarded to the gallery client. */
  me?: MeResponse | null;
  /** The viewer's persisted selected image ids for this collection (client galleries only). */
  initialSelectedIds?: number[];
  /**
   * Surfaces a "Send a message" button in the collection header's filter-bar area
   * (single-collection branch only). Set by the /user page.
   */
  showSendMessage?: boolean;
}

/**
 * Converts a CollectionModel to ContentParallaxImageModel for unified parallax rendering.
 * Dimensions are clamped to a minimum 4:5 aspect ratio.
 */
function collectionToContentModel(
  col: CollectionModel,
  showProtectedCovers: boolean
): ContentParallaxImageModel {
  // Defense-in-depth: never render a coverImage for a password-protected CLIENT_GALLERY in
  // list views unless the caller explicitly opts in. Backend BE-H5 strips it at the API,
  // but a stale cache or future regression could re-expose it.
  const isProtected =
    col.type === CollectionType.CLIENT_GALLERY && col.isPasswordProtected === true;
  const safeCoverImage = isProtected && !showProtectedCovers ? null : col.coverImage;
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
    // Map collection-level visibility -> content-block visible flag.
    // LISTED (or unknown/undefined) = render; UNLISTED/HIDDEN = hide from list views.
    visible: col.visibility === undefined ? true : col.visibility === CollectionVisibility.LISTED,
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
export default function CollectionPage({
  collection,
  chunkSize,
  showProtectedCovers = false,
  ssrViewport,
  editMode = false,
  me = null,
  initialSelectedIds = [],
  showSendMessage = false,
}: ContentCollectionPageProps) {
  // Single collection: delegate to client component for filter support
  if (!Array.isArray(collection)) {
    // The collection title is shown visually as an overlay inside the content
    // tree, so emit the page's real <h1> visually-hidden for SEO + screen readers.
    const headingText = collection.title?.trim() || collection.slug?.trim() || 'Untitled';
    return (
      <div className={styles.container}>
        <main className={styles.main}>
          <SiteHeader pageType="collection" collectionSlug={collection.slug} />
          <h1 className={styles.srOnly}>{headingText}</h1>
          <CollectionPageClient
            collection={collection}
            chunkSize={chunkSize}
            serverContentWidth={ssrViewport?.contentWidth}
            serverViewportHeight={ssrViewport?.viewportHeight}
            serverIsMobile={ssrViewport?.isMobile}
            editMode={editMode}
            me={me}
            initialSelectedIds={initialSelectedIds}
            showSendMessage={showSendMessage}
          />
        </main>
      </div>
    );
  }

  // Array of collections: server-rendered grid (no filters)
  const contentBlocks: AnyContentModel[] = collection.map(c =>
    collectionToContentModel(c, showProtectedCovers)
  );

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
            serverContentWidth={ssrViewport?.contentWidth}
            serverViewportHeight={ssrViewport?.viewportHeight}
            serverIsMobile={ssrViewport?.isMobile}
          />
        ) : null}
      </main>
    </div>
  );
}
