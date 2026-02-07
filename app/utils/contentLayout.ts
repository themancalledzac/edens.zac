import { LAYOUT } from '@/app/constants';
import { type CollectionModel } from '@/app/types/Collection';
import {
  type AnyContentModel,
  type ContentCollectionModel,
  type ContentImageModel,
  type ContentParallaxImageModel,
  type ContentTextModel,
  type TextBlockItem,
} from '@/app/types/Content';
import { isStandaloneItem } from '@/app/utils/contentRatingUtils';
import {
  getContentDimensions,
  getSlotWidth,
  isContentCollection,
  isVerticalImage,
} from '@/app/utils/contentTypeGuards';
import { type BoxTree, buildRows, type CombinationPattern } from '@/app/utils/rowCombination';
import { calculateSizesFromBoxTree } from '@/app/utils/rowStructureAlgorithm';

/**
 * Simplified Layout utilities for Content system
 * Direct processing without complex normalization - works with proper Content types
 */

// ===================== Image Classification Helpers =====================

/**
 * Reorder lonely verticals followed by standalone items (5-star horizontals, panoramas)
 * A vertical is "lonely" if previous item can't pair with it (nothing or standalone item)
 */
function reorderLonelyVerticals(content: AnyContentModel[]): AnyContentModel[] {
  if (content.length < 2) return content;

  const result = [...content];
  let i = 0;

  while (i < result.length - 1) {
    const current = result[i];
    const next = result[i + 1];

    if (current && next && isVerticalImage(current) && isStandaloneItem(next)) {
      const prev = i > 0 ? result[i - 1] : undefined;
      // Lonely if nothing before, or previous is standalone (can't pair)
      const isLonely = !prev || isStandaloneItem(prev);

      if (isLonely) {
        // Swap: [V, 5H] → [5H, V]
        result[i] = next;
        result[i + 1] = current;
        i += 2;
        continue;
      }
    }
    i++;
  }

  return result;
}

// ===================== Chunking =====================

/**
 * Chunk ContentModels based on rating-aware slot system
 * Uses getSlotWidth from contentTypeGuards for consistent slot calculation
 * @param content - Array of content blocks to chunk into rows
 * @param chunkSize - Number of normal-width items per row (default: 2)
 * @returns Array of content rows
 */
export function chunkContent(
  content: AnyContentModel[],
  chunkSize: number = LAYOUT.defaultChunkSize
): AnyContentModel[][] {
  if (!content || content.length === 0) return [];

  // Enforce minimum chunk size to ensure halfSlot is at least 1
  const effectiveChunkSize = Math.max(chunkSize, LAYOUT.minChunkSize);

  // Reorder to handle lonely verticals followed by 5-star horizontals
  const reordered = reorderLonelyVerticals(content);

  const result: AnyContentModel[][] = [];
  let currentRow: AnyContentModel[] = [];
  let currentRowSlots: number = 0;

  for (let i = 0; i < reordered.length; i++) {
    const contentItem = reordered[i];
    if (!contentItem) continue;

    const prevItem = i > 0 ? reordered[i - 1] : undefined;
    const nextItem = i < reordered.length - 1 ? reordered[i + 1] : undefined;

    const slotWidth = getSlotWidth(contentItem, effectiveChunkSize, prevItem, nextItem);

    // Standalone items (slotWidth >= chunkSize) get their own row
    // Note: Pattern registry now handles standalone detection, but chunkContent
    // is still used for slot-based layout (mobile/fallback)
    if (slotWidth >= effectiveChunkSize) {
      if (currentRow.length > 0) {
        result.push([...currentRow]);
        currentRow = [];
        currentRowSlots = 0;
      }
      result.push([contentItem]);
      continue;
    }

    // Check if item fits in current row
    if (currentRowSlots + slotWidth <= effectiveChunkSize) {
      currentRow.push(contentItem);
      currentRowSlots += slotWidth;

      if (currentRowSlots === effectiveChunkSize) {
        result.push([...currentRow]);
        currentRow = [];
        currentRowSlots = 0;
      }
    } else {
      if (currentRow.length > 0) {
        result.push([...currentRow]);
      }
      currentRow = [contentItem];
      currentRowSlots = slotWidth;
    }
  }

  if (currentRow.length > 0) {
    result.push(currentRow);
  }

  return result;
}

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
  patternName: CombinationPattern | 'standard' | 'header';
  items: CalculatedContentSize[];
  boxTree: BoxTree;
}

/**
 * Calculate display sizes for row of content to match heights and sum to component width
 * Uses slot width for proportional space allocation:
 * - 3+ star images get chunkSize/2 slots (more visual space)
 * - Normal images get 1 slot
 * @param content - Array of content blocks in a single row
 * @param componentWidth - Total available width for the row
 * @param chunkSize - Number of normal-width items per row (default: 2)
 * @returns Array of content blocks with calculated display dimensions
 */
export function calculateContentSizes(
  content: AnyContentModel[],
  componentWidth: number,
  chunkSize: number = LAYOUT.defaultChunkSize
): CalculatedContentSize[] {
  if (!content || content.length === 0) return [];

  // Enforce minimum chunk size
  const effectiveChunkSize = Math.max(chunkSize, LAYOUT.minChunkSize);

  if (content.length === 1) {
    const contentElement = content[0];
    if (!contentElement) return [];

    const { width, height } = getContentDimensions(contentElement);

    // Validate dimensions
    if (width <= 0 || height <= 0) {
      // Fallback to default aspect ratio
      return [
        {
          content: contentElement,
          width: componentWidth,
          height: componentWidth / 1.5, // Default 3:2 aspect ratio
        },
      ];
    }

    const ratio = width / Math.max(1, height);
    const displayHeight = componentWidth / ratio;

    // Validate calculated height
    if (!Number.isFinite(displayHeight) || displayHeight <= 0) {
      return [
        {
          content: contentElement,
          width: componentWidth,
          height: componentWidth / 1.5, // Fallback to default aspect ratio
        },
      ];
    }

    const result = [
      {
        content: contentElement,
        width: componentWidth,
        height: displayHeight,
      },
    ];
    return result;
  }

  // Calculate ratios for all content, using effective dimensions based on slot width
  // Higher slot widths (3+ star images) get proportionally more visual space
  // Note: Padding is INSIDE the div width due to box-sizing: border-box
  const ratios = content.map(contentItem => {
    const { width, height } = getContentDimensions(contentItem);
    const slotWidth = getSlotWidth(contentItem, effectiveChunkSize);

    // Validate dimensions
    if (width <= 0 || height <= 0) {
      return 1.5; // Default 3:2 aspect ratio
    }

    // Guard: If slotWidth is very large (>= chunkSize), it's likely a standalone item
    // Use original aspect ratio without scaling
    if (!Number.isFinite(slotWidth) || slotWidth <= 0 || slotWidth >= effectiveChunkSize) {
      return width / Math.max(1, height);
    }

    // Scale by slot width for proportional space allocation
    // Example: slot=2 means 2x visual space compared to slot=1
    const effectiveWidth = width * slotWidth;
    const effectiveHeight = height * slotWidth;

    return effectiveWidth / Math.max(1, effectiveHeight);
  });

  const ratioSum = ratios.reduce((sum, ratio) => {
    // Filter out invalid ratios (NaN, Infinity, or 0)
    if (!Number.isFinite(ratio) || ratio <= 0) return sum;
    return sum + ratio;
  }, 0);

  // Guard against division by zero
  if (ratioSum === 0 || !Number.isFinite(ratioSum)) {
    // Fallback: distribute width equally among all items
    const equalWidth = componentWidth / content.length;
    return content.map(contentItem => {
      const { width, height } = getContentDimensions(contentItem);
      const ratio = width / Math.max(1, height);
      const calculatedHeight = equalWidth / ratio;
      return {
        content: contentItem,
        width: equalWidth,
        height: calculatedHeight,
      };
    });
  }

  const commonHeight = componentWidth / ratioSum;

  // Validate commonHeight - if invalid, use equal width distribution fallback
  if (!Number.isFinite(commonHeight) || commonHeight <= 0) {
    // Use existing fallback logic - equal width distribution
    const equalWidth = componentWidth / content.length;
    return content.map(contentItem => {
      const { width, height } = getContentDimensions(contentItem);
      const ratio = width / Math.max(1, height);
      const calculatedHeight = equalWidth / ratio;

      // Validate calculated height
      if (!Number.isFinite(calculatedHeight) || calculatedHeight <= 0) {
        return {
          content: contentItem,
          width: equalWidth,
          height: equalWidth / 1.5, // Default 3:2 aspect ratio
        };
      }

      return {
        content: contentItem,
        width: equalWidth,
        height: calculatedHeight,
      };
    });
  }

  return content.map((contentItem, idx) => {
    const ratio = ratios[idx];
    if (!ratio || !Number.isFinite(ratio) || ratio <= 0) {
      return { content: contentItem, width: 0, height: 0 };
    }

    // Calculate width from effective ratio (gives 2-3x space for rated images)
    const calculatedWidth = ratio * commonHeight;

    // Calculate height to preserve the ORIGINAL aspect ratio (not effective)
    // We use the original dimensions, not the effective ones, for the final height
    const { width: originalWidth, height: originalHeight } = getContentDimensions(contentItem);

    // Validate original dimensions
    if (originalWidth <= 0 || originalHeight <= 0) {
      // Fallback: use calculated width with default aspect ratio
      return {
        content: contentItem,
        width: calculatedWidth,
        height: calculatedWidth / 1.5, // Default 3:2 aspect ratio
      };
    }

    const originalRatio = originalWidth / Math.max(1, originalHeight);
    const calculatedHeight = calculatedWidth / originalRatio;

    // Validate calculated dimensions
    if (
      !Number.isFinite(calculatedWidth) ||
      !Number.isFinite(calculatedHeight) ||
      calculatedWidth <= 0 ||
      calculatedHeight <= 0
    ) {
      return { content: contentItem, width: 0, height: 0 };
    }

    return {
      content: contentItem,
      width: calculatedWidth,
      height: calculatedHeight,
    };
  });
}

/**
 * Options for content display processing
 */
export interface ProcessContentOptions {
  /** Whether the viewport is mobile (disables pattern detection) */
  isMobile?: boolean;
  /** Enable pattern detection for advanced layouts (default: true on desktop) */
  enablePatternDetection?: boolean;
  /** Collection model for creating header row (cover image + metadata) */
  collectionData?: CollectionModel;
}

/**
 * Create a simple horizontal BoxTree from a list of content items.
 * Used for mobile/simple layouts where all items are arranged horizontally.
 */
function createSimpleHorizontalBoxTree(items: AnyContentModel[]): BoxTree {
  if (items.length === 0) {
    throw new Error('Cannot create BoxTree from empty items array');
  }

  if (items.length === 1) {
    return { type: 'leaf', content: items[0]! };
  }

  // For 2 items: simple horizontal pair
  if (items.length === 2) {
    return {
      type: 'combined',
      direction: 'horizontal',
      children: [
        { type: 'leaf', content: items[0]! },
        { type: 'leaf', content: items[1]! },
      ],
    };
  }

  // For 3+ items: build left-associative tree (((a | b) | c) | d)
  let tree: BoxTree = {
    type: 'combined',
    direction: 'horizontal',
    children: [
      { type: 'leaf', content: items[0]! },
      { type: 'leaf', content: items[1]! },
    ],
  };

  for (let i = 2; i < items.length; i++) {
    tree = {
      type: 'combined',
      direction: 'horizontal',
      children: [tree, { type: 'leaf', content: items[i]! }],
    };
  }

  return tree;
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
 * @param options - Processing options (isMobile, enablePatternDetection, collectionData)
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

  // Determine if pattern detection should be used
  // Default: enabled on desktop, disabled on mobile
  const usePatternDetection = options?.enablePatternDetection ?? !options?.isMobile;

  // Mobile or pattern detection disabled → use simple slot-based system
  if (options?.isMobile || !usePatternDetection) {
    // On mobile, override chunkSize to mobileSlotWidth (2) so items are
    // grouped correctly for a narrow viewport instead of using desktop's 4-slot width
    const effectiveChunkSize = options?.isMobile ? LAYOUT.mobileSlotWidth : chunkSize;
    const effectiveGap = options?.isMobile ? LAYOUT.mobileGridGap : LAYOUT.gridGap;
    const chunks = chunkContent(content, effectiveChunkSize);
    const contentRows = chunks.map(chunk => {
      const boxTree = createSimpleHorizontalBoxTree(chunk);
      const items = calculateSizesFromBoxTree(
        boxTree,
        componentWidth,
        effectiveGap,
        effectiveChunkSize
      );
      return {
        patternName: 'standard' as const,
        items,
        boxTree,
      };
    });
    result.push(...contentRows);

    return result;
  }

  // Desktop with pattern detection
  const rowWidth = LAYOUT.desktopSlotWidth;

  // Use buildRows() for pattern-based layout
  const rows = buildRows(content, rowWidth);

  const contentRows = rows.map(row => {
    // Use BoxTree-based size calculation (generic, follows tree structure)
    const items = calculateSizesFromBoxTree(
      row.boxTree,
      componentWidth,
      LAYOUT.gridGap,
      rowWidth // Pass chunkSize for slot width scaling
    );

    return {
      patternName: row.patternName,
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
 * Convert collection to parallax image for unified rendering on public pages
 * @param col - Collection content model to convert
 * @returns Parallax image model with collection metadata
 */
export function convertCollectionContentToParallax(
  col: ContentCollectionModel
): ContentParallaxImageModel {
  const { imageWidth, imageHeight } = extractCollectionDimensions(col.coverImage);

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
  displayMode?: 'CHRONOLOGICAL' | 'ORDERED'
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
  const { imageWidth, imageHeight } = extractCollectionDimensions(coverImage);

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
    rows.push({ patternName: 'header' as const, items: coverItems, boxTree: coverTree });

    // Metadata row — full width, auto height (rendered via text block)
    if (metadataBlock) {
      const metaTree: BoxTree = { type: 'leaf', content: metadataBlock };
      const metaItems: CalculatedContentSize[] = [
        { content: metadataBlock, width: componentWidth, height: 0 },
      ];
      rows.push({ patternName: 'header' as const, items: metaItems, boxTree: metaTree });
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
    const descWidth = componentWidth - coverWidth;
    calculatedSizes.push({ content: metadataBlock, width: descWidth, height: rowHeight });
  }

  // Create boxTree from the calculated items (cover image + metadata block if present)
  const boxTreeItems = calculatedSizes.map(item => item.content);

  return {
    patternName: 'header' as const,
    items: calculatedSizes,
    boxTree: createSimpleHorizontalBoxTree(boxTreeItems),
  };
}
