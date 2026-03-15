import { IMAGE, LAYOUT } from '@/app/constants';
import { type CollectionModel } from '@/app/types/Collection';
import {
  type AnyContentModel,
  type ContentCollectionModel,
  type ContentImageModel,
  type ContentParallaxImageModel,
  type ContentTextModel,
  type TextBlockItem,
} from '@/app/types/Content';
import {
  getContentDimensions,
  isContentCollection,
} from '@/app/utils/contentTypeGuards';
import { acToBoxTree, type BoxTree, buildRows, hChain, type TemplateKey, toImageType } from '@/app/utils/rowCombination';
import { optimizeRows } from '@/app/utils/rowOptimizer';
import { calculateSizesFromBoxTree } from '@/app/utils/rowStructureAlgorithm';

/**
 * Simplified Layout utilities for Content system
 * Direct processing without complex normalization - works with proper Content types
 */

// ===================== Content sizing =====================

export interface CalculatedContentSize {
  content: AnyContentModel;
  width: number;
  height: number;
}

/**
 * Row with calculated sizes and rendering tree
 * Used for rendering content layouts
 */
export interface RowWithPatternAndSizes {
  templateKey: TemplateKey | 'standard' | 'header';
  items: CalculatedContentSize[];
  boxTree: BoxTree;
}

/**
 * Options for content display processing
 */
export interface ProcessContentOptions {
  /** Whether the viewport is mobile (disables pattern detection) */
  isMobile?: boolean;
  /** Collection model for creating header row (cover image + metadata) */
  collectionData?: CollectionModel;
  /** Display mode — controls content sort order */
  displayMode?: 'CHRONOLOGICAL' | 'ORDERED' | 'FIXED';
  /** Target aspect ratio for AR-aware tree structure selection (default 1.5) */
  targetAR?: number;
}

/** Build a horizontal BoxTree from content items using the shared hChain helper */
function createSimpleHorizontalBoxTree(items: AnyContentModel[]): BoxTree {
  if (items.length === 0) {
    throw new Error('Cannot create BoxTree from empty items array');
  }
  // rowWidth=5 is arbitrary here — hChain doesn't use targetAR scoring,
  // it just builds a left-associative horizontal tree
  const imageTypes = items.map(item => toImageType(item, 5));
  return acToBoxTree(hChain(imageTypes));
}

/**
 * Process content for display with full pattern metadata
 *
 * Supports two layout modes:
 * 1. Pattern Detection (desktop default): Uses pattern registry to detect
 *    optimal layouts like main-stacked, 5-star vertical patterns, etc.
 * 2. Slot-Based (mobile/fallback): Simple slot-based chunking
 *
 * If collectionData is provided, creates a header row (cover image + metadata)
 * as the first row, before processing regular content.
 *
 * @param content - Array of content blocks to process (should NOT include header items)
 * @param componentWidth - Total available width for display
 * @param chunkSize - Number of normal-width items per row (default: 2)
 * @param options - Processing options (isMobile, collectionData, displayMode)
 * @returns Array of rows with pattern metadata and sized content blocks
 */
export function processContentForDisplay(
  content: AnyContentModel[],
  componentWidth: number,
  chunkSize: number = LAYOUT.defaultChunkSize,
  options?: ProcessContentOptions
): RowWithPatternAndSizes[] {
  const result: RowWithPatternAndSizes[] = [];

  // Create header row(s) first if collectionData is provided
  // On mobile, returns separate rows for cover image and metadata
  if (options?.collectionData) {
    const headerRows = createHeaderRow(options.collectionData, componentWidth, chunkSize, options?.isMobile);
    if (headerRows) {
      if (Array.isArray(headerRows)) {
        result.push(...headerRows);
      } else {
        result.push(headerRows);
      }
    }
  }

  // Unified pipeline: same algorithm, different rowWidth and gap
  const rowWidth = options?.isMobile ? LAYOUT.mobileSlotWidth : LAYOUT.desktopSlotWidth;
  const effectiveGap = options?.isMobile ? LAYOUT.mobileGridGap : LAYOUT.gridGap;
  const targetAR = options?.targetAR ?? 1.5;

  const rows = optimizeRows(buildRows(content, rowWidth, targetAR), rowWidth);

  const contentRows = rows.map(row => {
    const items = calculateSizesFromBoxTree(
      row.boxTree,
      componentWidth,
      effectiveGap,
      rowWidth
    );

    return {
      templateKey: row.templateKey,
      items,
      boxTree: row.boxTree,
    };
  });
  result.push(...contentRows);

  return result;
}

/**
 * Extract image dimensions from cover image with fallback to width/height properties
 */
function extractCollectionDimensions(coverImage?: ContentImageModel | null): {
  imageWidth?: number;
  imageHeight?: number;
} {
  return {
    imageWidth: coverImage?.imageWidth ?? coverImage?.width,
    imageHeight: coverImage?.imageHeight ?? coverImage?.height,
  };
}

/**
 * Clamp dimensions so the aspect ratio stays within [minParallaxAR, maxParallaxAR].
 * Prevents excessively tall OR wide cover images on parallax collection cards.
 * Crops equally via object-fit: cover + default center positioning.
 */
export function clampParallaxDimensions(
  width?: number,
  height?: number
): { imageWidth?: number; imageHeight?: number } {
  if (width && height) {
    const ar = width / height;
    if (ar < IMAGE.minParallaxAR) {
      return { imageWidth: width, imageHeight: Math.round(width / IMAGE.minParallaxAR) };
    }
    if (ar > IMAGE.maxParallaxAR) {
      return { imageWidth: width, imageHeight: Math.round(width / IMAGE.maxParallaxAR) };
    }
  }
  return { imageWidth: width, imageHeight: height };
}

/**
 * Convert collection to parallax image for unified rendering on public pages
 * @param col - Collection content model to convert
 * @returns Parallax image model with collection metadata
 */
export function convertCollectionContentToParallax(
  col: ContentCollectionModel
): ContentParallaxImageModel {
  const raw = extractCollectionDimensions(col.coverImage);
  const { imageWidth, imageHeight } = clampParallaxDimensions(raw.imageWidth, raw.imageHeight);

  return {
    contentType: 'IMAGE',
    enableParallax: true,
    id: col.id,
    title: col.title,
    slug: col.slug,
    collectionType: col.collectionType,
    description: col.description ?? null,
    imageUrl: col.coverImage?.imageUrl ?? '',
    overlayText: col.title || col.slug || '',
    imageWidth,
    imageHeight,
    width: imageWidth,
    height: imageHeight,
    orderIndex: col.orderIndex,
    visible: col.visible ?? true,
    createdAt: col.createdAt,
    updatedAt: col.updatedAt,
  };
}

/**
 * Convert collection to regular image for admin/manage page rendering
 * @param col - Collection content model to convert
 * @returns Image model with collection metadata
 */
export function convertCollectionContentToImage(col: ContentCollectionModel): ContentImageModel {
  const coverImage = col.coverImage;
  const { imageWidth, imageHeight } = extractCollectionDimensions(coverImage);

  return {
    contentType: 'IMAGE',
    id: col.id,
    title: col.title,
    description: col.description ?? null,
    imageUrl: coverImage?.imageUrl ?? '',
    imageUrlRaw: coverImage?.imageUrlRaw ?? null,
    imageWidth,
    imageHeight,
    width: imageWidth,
    height: imageHeight,
    orderIndex: col.orderIndex,
    visible: col.visible ?? true,
    createdAt: col.createdAt,
    updatedAt: col.updatedAt,
    iso: coverImage?.iso,
    author: coverImage?.author ?? null,
    rating: coverImage?.rating,
    lens: coverImage?.lens ?? null,
    blackAndWhite: coverImage?.blackAndWhite,
    isFilm: coverImage?.isFilm,
    shutterSpeed: coverImage?.shutterSpeed ?? null,
    rawFileName: coverImage?.rawFileName ?? null,
    camera: coverImage?.camera ?? null,
    focalLength: coverImage?.focalLength ?? null,
    location: coverImage?.location ?? null,
    createDate: coverImage?.createDate ?? null,
    fstop: coverImage?.fstop ?? null,
    alt: col.title || col.slug || '',
    aspectRatio: imageWidth && imageHeight ? imageWidth / imageHeight : undefined,
    filmType: coverImage?.filmType ?? null,
    filmFormat: coverImage?.filmFormat ?? null,
    tags: coverImage?.tags ?? [],
    people: coverImage?.people ?? [],
    collections: coverImage?.collections ?? [],
    overlayText: col.title || col.slug || '',
  };
}

/**
 * Check if content is visible in a specific collection
 * Checks both global visibility (block.visible) and collection-specific visibility for images
 * @param block - Content block to check
 * @param collectionId - Optional collection ID for checking collection-specific visibility
 * @returns true if content is visible, false otherwise
 */
export function isContentVisibleInCollection(
  block: AnyContentModel,
  collectionId?: number
): boolean {
  if (block.visible === false) return false;

  if (block.contentType === 'IMAGE' && collectionId) {
    const imageBlock = block as ContentImageModel;
    const entry = imageBlock.collections?.find(c => c.collectionId === collectionId);
    if (entry?.visible === false) return false;
  }

  return true;
}

/**
 * Filter out non-visible content blocks and check collection-specific visibility for images
 */
function filterVisibleBlocks(
  content: AnyContentModel[],
  filterVisible: boolean,
  collectionId?: number
): AnyContentModel[] {
  if (!filterVisible) return content;

  return content.filter(block => isContentVisibleInCollection(block, collectionId));
}

/**
 * Convert collection content blocks to parallax image blocks for unified rendering
 */
function transformCollectionBlocks(content: AnyContentModel[]): AnyContentModel[] {
  return content.map(block => {
    if (isContentCollection(block)) {
      const collectionBlock = block as ContentCollectionModel;
      return convertCollectionContentToParallax(collectionBlock);
    }
    return block;
  });
}

/**
 * Ensure parallax blocks have proper imageWidth/imageHeight dimensions with fallback
 */
function ensureParallaxDimensions(content: AnyContentModel[]): AnyContentModel[] {
  return content.map(block => {
    if ('enableParallax' in block && block.enableParallax && block.contentType === 'IMAGE') {
      const parallaxBlock = block as ContentParallaxImageModel;
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
}

/**
 * Sort content blocks by orderIndex in ascending order
 */
function sortContentByOrderIndex(content: AnyContentModel[]): AnyContentModel[] {
  return [...content].sort((a, b) => {
    return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
  });
}

/**
 * Sort content blocks by createdAt date in chronological order (oldest first)
 */
function sortContentByCreatedAt(content: AnyContentModel[]): AnyContentModel[] {
  return [...content].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateA - dateB;
  });
}

/**
 * Stable sort: visible content first, non-visible content last
 * Preserves relative order within visible and non-visible groups
 */
function sortNonVisibleToBottom(
  content: AnyContentModel[],
  collectionId?: number
): AnyContentModel[] {
  const visible: AnyContentModel[] = [];
  const nonVisible: AnyContentModel[] = [];

  for (const block of content) {
    const isVisible = isContentVisibleInCollection(block, collectionId);
    if (isVisible) {
      visible.push(block);
    } else {
      nonVisible.push(block);
    }
  }

  return [...visible, ...nonVisible];
}

/**
 * Reorder content to show images/text/gifs first, then collections
 */
function reorderImagesBeforeCollections(content: AnyContentModel[]): AnyContentModel[] {
  const nonCollections: AnyContentModel[] = [];
  const collections: AnyContentModel[] = [];

  for (const block of content) {
    if (block.contentType === 'COLLECTION') {
      collections.push(block);
    } else {
      nonCollections.push(block);
    }
  }

  return [...nonCollections, ...collections];
}

/**
 * Process content blocks through filtering, sorting, and transformation pipeline
 * Converts collections to parallax images and ensures proper dimensions
 * @param content - Array of content blocks to process
 * @param filterVisible - Whether to filter out non-visible blocks (default: true)
 * @param collectionId - Collection ID for checking image visibility
 * @param displayMode - Sort by 'CHRONOLOGICAL' or 'ORDERED' (default: ORDERED)
 * @returns Processed and sorted content blocks
 */
export function processContentBlocks(
  content: AnyContentModel[],
  filterVisible: boolean = true,
  collectionId?: number,
  displayMode?: 'CHRONOLOGICAL' | 'ORDERED' | 'FIXED'
): AnyContentModel[] {
  let processed = filterVisibleBlocks(content, filterVisible, collectionId);
  // Note: We now use block.orderIndex directly instead of collections[].orderIndex
  processed = ensureParallaxDimensions(processed);

  // Sort by orderIndex or createdAt first (before visibility sorting)
  processed =
    displayMode === 'CHRONOLOGICAL'
      ? sortContentByCreatedAt(processed)
      : sortContentByOrderIndex(processed);

  // When filterVisible is false (manage page), sort non-visible content to bottom
  // This happens after orderIndex/chronological sorting to preserve relative order within groups
  if (!filterVisible) {
    processed = sortNonVisibleToBottom(processed, collectionId);
  }

  processed = reorderImagesBeforeCollections(processed);
  processed = transformCollectionBlocks(processed);

  return processed;
}

// ===================== Collection Header Row Injection =====================

/**
 * Build metadata items array from collection fields
 */
function buildMetadataItems(collection: CollectionModel): TextBlockItem[] {
  const items: TextBlockItem[] = [];

  if (collection.collectionDate) {
    items.push({
      type: 'date',
      value: collection.collectionDate,
    });
  }

  if (collection.location) {
    items.push({
      type: 'location',
      value:
        typeof collection.location === 'string'
          ? collection.location
          : (collection.location as { name: string }).name,
    });
  }

  if (collection.description) {
    items.push({
      type: 'description',
      value: collection.description,
    });
  }

  // Add tags
  if (collection.tags && collection.tags.length > 0) {
    for (const tag of collection.tags) {
      items.push({
        type: 'text',
        value: tag,
        label: 'tag',
      });
    }
  }

  return items;
}

/**
 * Create metadata text block with same dimensions as cover image for equal row sizing
 */
function createMetadataTextBlock(
  items: TextBlockItem[],
  width?: number,
  height?: number
): ContentTextModel | null {
  if (items.length === 0 || !width || !height) {
    return null;
  }

  return {
    contentType: 'TEXT',
    id: -2,
    items,
    format: 'plain',
    formatType: 'plain',
    align: 'left',
    orderIndex: -1,
    visible: true,
    width,
    height,
  };
}

/**
 * Create parallax cover image block with title overlay
 */
function createCoverImageBlock(collection: CollectionModel): ContentParallaxImageModel {
  const coverImage = collection.coverImage!;
  const raw = extractCollectionDimensions(coverImage);
  const { imageWidth, imageHeight } = clampParallaxDimensions(raw.imageWidth, raw.imageHeight);

  return {
    contentType: 'IMAGE',
    enableParallax: true,
    id: -1,
    title: collection.title,
    imageUrl: coverImage.imageUrl,
    overlayText: collection.title,
    imageWidth,
    imageHeight,
    width: imageWidth,
    height: imageHeight,
    orderIndex: -2,
    visible: true,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
  };
}

/**
 * Create header row with cover image and metadata as a RowWithPatternAndSizes
 *
 * Creates a header row that will be prepended to regular content rows.
 * The header row contains:
 * - Cover image with title overlay (parallax-enabled)
 * - Metadata text block (date, location, description) - if metadata exists
 *
 * Uses height-constrained sizing to prevent vertical cover images from
 * creating excessively tall rows:
 * - Max row height is derived from componentWidth (headerRowHeightRatio)
 * - Cover width is calculated to achieve max height, then clamped to min/max ratios
 * - Vertical covers get narrower width (~30-33%), horizontal covers get ~50%
 *
 * Returns null if cover image missing or has no dimensions.
 * @param collection - Collection model with cover image and metadata
 * @param componentWidth - Total available width for the row
 * @param _chunkSize - Number of normal-width items per row (unused, kept for API compatibility)
 * @returns RowWithPatternAndSizes (or array on mobile) with header items, or null if no cover image
 */
export function createHeaderRow(
  collection: CollectionModel,
  componentWidth: number,
  _chunkSize: number = LAYOUT.defaultChunkSize,
  isMobile: boolean = false
): RowWithPatternAndSizes | RowWithPatternAndSizes[] | null {
  if (!collection.coverImage) {
    return null;
  }

  const coverBlock = createCoverImageBlock(collection);

  if (!coverBlock.imageWidth || !coverBlock.imageHeight) {
    return null;
  }

  const coverAspectRatio = coverBlock.imageWidth / coverBlock.imageHeight;

  // Add metadata block if it has content
  const metadataItems = buildMetadataItems(collection);
  const metadataBlock = createMetadataTextBlock(
    metadataItems,
    coverBlock.imageWidth,
    coverBlock.imageHeight
  );

  // Mobile: each header item is its own full-width row
  // Cover image is sized via calculateSizesFromBoxTree (respects aspect ratio)
  // Metadata text block only takes the height its content needs
  if (isMobile) {
    const rows: RowWithPatternAndSizes[] = [];

    // Cover image row — sized exactly like a single-item content row
    const coverTree: BoxTree = { type: 'leaf', content: coverBlock };
    const coverItems = calculateSizesFromBoxTree(
      coverTree,
      componentWidth,
      LAYOUT.mobileGridGap,
      LAYOUT.mobileSlotWidth
    );
    rows.push({ templateKey: 'header' as const, items: coverItems, boxTree: coverTree });

    // Metadata row — full width, auto height (rendered via text block)
    if (metadataBlock) {
      const metaTree: BoxTree = { type: 'leaf', content: metadataBlock };
      const metaItems: CalculatedContentSize[] = [
        { content: metadataBlock, width: componentWidth, height: 0 },
      ];
      rows.push({ templateKey: 'header' as const, items: metaItems, boxTree: metaTree });
    }

    return rows;
  }

  // Desktop: side-by-side layout with height-constrained sizing
  const maxRowHeight = componentWidth * LAYOUT.headerRowHeightRatio;
  const minCoverWidth = componentWidth * LAYOUT.headerCoverMinRatio;
  const maxCoverWidth = componentWidth * LAYOUT.headerCoverMaxRatio;

  // Calculate cover width needed to achieve maxRowHeight
  // height = width / aspectRatio, so width = height * aspectRatio
  let coverWidth = maxRowHeight * coverAspectRatio;

  // Clamp cover width between min and max ratios
  coverWidth = Math.max(minCoverWidth, Math.min(maxCoverWidth, coverWidth));

  // Calculate actual row height based on clamped cover width
  const rowHeight = coverWidth / coverAspectRatio;

  // Build calculated sizes starting with cover image
  const calculatedSizes: CalculatedContentSize[] = [
    { content: coverBlock, width: coverWidth, height: rowHeight },
  ];

  if (metadataBlock) {
    // Description gets remaining width, same height as cover
    const descWidth = componentWidth - coverWidth - LAYOUT.gridGap;
    calculatedSizes.push({ content: metadataBlock, width: descWidth, height: rowHeight });
  }

  // Create boxTree from the calculated items (cover image + metadata block if present)
  const boxTreeItems = calculatedSizes.map(item => item.content);

  return {
    templateKey: 'header' as const,
    items: calculatedSizes,
    boxTree: createSimpleHorizontalBoxTree(boxTreeItems),
  };
}
