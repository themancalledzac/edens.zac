import { DENSITY_ROW_WIDTH_MULTIPLIER, LAYOUT } from '@/app/constants';
import { type CollectionModel } from '@/app/types/Collection';
import {
  type AnyContentModel,
  type ContentCollectionModel,
  type ContentImageModel,
  type ContentParallaxImageModel,
  type ContentTextModel,
  type TextBlockItem,
} from '@/app/types/Content';
import { getMeanWidthCost } from '@/app/utils/contentRatingUtils';
import { isContentCollection } from '@/app/utils/contentTypeGuards';
import { formatDateRange } from '@/app/utils/formatDateRange';
import {
  buildParallaxCard,
  clampParallaxDimensions,
  extractCollectionDimensions,
} from '@/app/utils/parallaxCard';
import {
  acToBoxTree,
  type BoxTree,
  buildRows,
  hChain,
  toImageType,
} from '@/app/utils/rowCombination';
import { calculateSizesFromBoxTree } from '@/app/utils/rowStructureAlgorithm';

/**
 * Simplified Layout utilities for Content system
 * Direct processing without complex normalization - works with proper Content types
 */

/**
 * Sentinel content id carried by the synthetic header cover block (see `createCoverImageBlock`).
 * It is not a content-table row, so consumers must single it out before treating it as real
 * content — the renderer pins the cover affordances to it, and the manage grid's click handler
 * excludes it from being its own cover candidate.
 */
export const COVER_IMAGE_CONTENT_ID = -1;

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
  rowType: 'content' | 'header';
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
  /** Target aspect ratio for AR-aware tree structure selection (default 1.5) */
  targetAR?: number;
  /**
   * Mobile-scale density (1-5) that drives the row-width budget on mobile.
   * Supplied by the collection page so its density slider takes effect on touch
   * viewports. When omitted, mobile pins to {@link LAYOUT.mobileSlotWidth} as
   * before, so other callers keep their existing single-column-ish layout.
   */
  mobileChunkSize?: number;
  /**
   * Build the header's metadata block even when the collection has no metadata text.
   *
   * That block is not merely "the date and description" — it is the header's secondary column,
   * and it is where {@link FilterToolbar} and the client-gallery download row mount. Gating it on
   * metadata items alone silently drops the filter bar from any collection that happens to carry
   * none, which is what left `/user` (no date, no locations, no siblings) with a bare cover and no
   * bar at all. Callers that will mount controls into the rail set this; callers that only ever
   * show text leave it off, so a plain metadata-less collection still renders a full-width cover.
   */
  forceHeaderRail?: boolean;
  /**
   * Mean width-cost of this collection's UNFILTERED content, used to hold photos-per-row steady
   * while a filter is active.
   *
   * Width-cost scales with rating, so a filter that changes the rating mix — "Highly Rated" most
   * sharply — changes how many items fit the fixed row budget, and every photo visibly resizes even
   * though the density control never moved. Scaling the budget by
   * `mean(filtered) / widthCostBaseline` cancels exactly that shift while leaving RELATIVE sizing
   * inside a row untouched: a 5★ still outweighs a 3★ beside it.
   *
   * Omit it (or pass the unfiltered mean itself) and the factor is 1, so an unfiltered layout is
   * bit-for-bit what it was before this option existed.
   */
  widthCostBaseline?: number;
}

/**
 * Build a horizontal BoxTree from content items using the shared hChain helper.
 *
 * @remarks hChain builds a left-associative horizontal tree without AR scoring,
 * so this is purely a structural conversion of the items into a flat row.
 */
function createSimpleHorizontalBoxTree(items: AnyContentModel[]): BoxTree {
  if (items.length === 0) {
    throw new Error('Cannot create BoxTree from empty items array');
  }
  const imageTypes = items.map(item => toImageType(item));
  return acToBoxTree(hChain(imageTypes));
}

/**
 * Process content for display, returning sized rows ready to render.
 *
 * Runs the single row-composition algorithm: {@link buildRows} greedily fills
 * each row to the per-viewport width-cost budget, then composes its BoxTree via
 * {@link buildAtomic}. The only mobile/desktop difference is the row-width budget
 * (desktop derives it from the density chunkSize × {@link DENSITY_ROW_WIDTH_MULTIPLIER};
 * mobile derives it from the 1-5 mobileChunkSize when supplied, else pins to a
 * narrow slot width) — there is no separate pattern-detection or slot-based mode.
 *
 * If collectionData is provided, creates a header row (cover image + metadata)
 * as the first row, before processing regular content.
 *
 * Content arrives already ordered. {@link processContentBlocks} applies the collection's
 * `displayMode` sort, the collection page then applies its Date chip on top, and row packing
 * below is order-preserving. This function must not re-sort: a second pass here would undo both
 * that chip and the manage grid's hidden-content-to-the-bottom ordering.
 *
 * `componentWidth` and the resolved gap are handed to {@link buildRows} as well as to the
 * sizer. Row composition is otherwise unitless, and stays so for photographs; the pixels
 * matter only to content that declares a {@link Content.minWidth} (admin panels), where
 * membership has to be decided against a real width. This is the one production call site
 * that supplies them.
 *
 * @param content - Array of content blocks to process (should NOT include header items)
 * @param componentWidth - Total available width for display
 * @param chunkSize - Number of normal-width items per row (default: 2)
 * @param options - Processing options (isMobile, collectionData, targetAR, …)
 * @returns Array of rows with structural key and sized content blocks
 */
export function processContentForDisplay(
  content: AnyContentModel[],
  componentWidth: number,
  chunkSize: number = LAYOUT.defaultChunkSize,
  options?: ProcessContentOptions
): RowWithPatternAndSizes[] {
  const result: RowWithPatternAndSizes[] = [];

  if (options?.collectionData) {
    const headerRows = createHeaderRow(
      options.collectionData,
      componentWidth,
      chunkSize,
      options?.isMobile,
      options?.forceHeaderRail
    );
    if (headerRows) {
      if (Array.isArray(headerRows)) {
        result.push(...headerRows);
      } else {
        result.push(headerRows);
      }
    }
  }

  const baseRowWidth = options?.isMobile
    ? options?.mobileChunkSize !== undefined
      ? Math.round(options.mobileChunkSize * DENSITY_ROW_WIDTH_MULTIPLIER)
      : LAYOUT.mobileSlotWidth
    : Math.round(chunkSize * DENSITY_ROW_WIDTH_MULTIPLIER);

  // See ProcessContentOptions.widthCostBaseline: keeps a filtered view at the same photos-per-row
  // as the unfiltered collection. Both means must be > 0 for the ratio to mean anything.
  const baseline = options?.widthCostBaseline ?? 0;
  const currentMeanCost = baseline > 0 ? getMeanWidthCost(content) : 0;
  const rowWidth =
    baseline > 0 && currentMeanCost > 0
      ? Math.round(baseRowWidth * (currentMeanCost / baseline))
      : baseRowWidth;
  const effectiveGap = options?.isMobile ? LAYOUT.mobileGridGap : LAYOUT.gridGap;
  const targetAR = options?.targetAR ?? 1.5;

  const rows = buildRows(content, rowWidth, targetAR, { componentWidth, gap: effectiveGap });

  const contentRows = rows.map(row => {
    const items = calculateSizesFromBoxTree(row.boxTree, componentWidth, effectiveGap);

    return {
      rowType: 'content' as const,
      items,
      boxTree: row.boxTree,
    };
  });
  result.push(...contentRows);

  return result;
}

export { clampParallaxDimensions };

/**
 * Convert collection to parallax image for unified rendering on public pages. Kind
 * (`isClient`/`isBlog`) and tags are carried through so the public card badge survives
 * the conversion.
 *
 * No-cover collection cards default to a 1:1 placeholder (1000×1000) so the layout
 * algorithm packs them uniformly alongside cards with real cover images.
 *
 * Synthetic PARENT collections (e.g. /all-collections) carry null content-table IDs
 * because they aren't backed by content rows; the id falls back to the referenced
 * collection's ID so downstream Map lookups (sizesMap, row keys) stay unique.
 *
 * `rating` is carried so the Order control can sequence collection tiles by rating; the card
 * is otherwise rating-agnostic (layout prominence comes from the cover image's own dimensions).
 *
 * `allowLayoutDimensions` is what preserves this path's historical use of
 * `pickImageDimensions` - it accepts the layout `width`/`height` fields as a fallback, which
 * the other three card call sites do not.
 */
export function convertCollectionContentToParallax(
  col: ContentCollectionModel
): ContentParallaxImageModel {
  return buildParallaxCard({
    id: col.id ?? col.referencedCollectionId,
    collectionId: col.referencedCollectionId,
    title: col.title,
    slug: col.slug,
    collectionDate: col.collectionDate,
    rating: col.rating ?? undefined,
    isClient: col.isClient,
    isBlog: col.isBlog,
    tags: col.tags,
    description: col.description ?? null,
    coverImage: col.coverImage,
    orderIndex: col.orderIndex,
    visible: col.visible ?? true,
    createdAt: col.createdAt,
    updatedAt: col.updatedAt,
    squareFallback: true,
    allowLayoutDimensions: true,
  });
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
 * Whether a block has renderable content — false for an IMAGE with a blank imageUrl. Kept separate
 * from {@link isContentVisibleInCollection} (a visibility concern) so the public filter drops these
 * while manage keeps them in their orderIndex position.
 */
export function hasRenderableContent(block: AnyContentModel): boolean {
  if (block.contentType === 'IMAGE') {
    const imageBlock = block as ContentImageModel;
    if (!imageBlock.imageUrl || imageBlock.imageUrl.trim() === '') return false;
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

  return content.filter(
    block => isContentVisibleInCollection(block, collectionId) && hasRenderableContent(block)
  );
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
 * Process content blocks through filtering, sorting, and transformation pipeline.
 * Converts collections to parallax images and ensures proper dimensions.
 *
 * Ordering uses `block.orderIndex` directly (not `collections[].orderIndex`) and is honoured
 * VERBATIM across content types: a child-collection card sits wherever the admin put it, mixed
 * in among images. (The former `reorderImagesBeforeCollections` pass sank every collection block
 * to the tail; it encoded the "a parent holds only child collections" invariant and was removed
 * with it. Row packing downstream is order-preserving, so this is the only ordering authority.)
 *
 * When `filterVisible` is false (manage page), non-visible content is sorted to
 * the bottom after the primary orderIndex/chronological sort to preserve relative
 * order within visible and non-visible groups.
 *
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
  processed = ensureParallaxDimensions(processed);

  processed =
    displayMode === 'CHRONOLOGICAL'
      ? sortContentByCreatedAt(processed)
      : sortContentByOrderIndex(processed);

  if (!filterVisible) {
    processed = sortNonVisibleToBottom(processed, collectionId);
  }

  processed = transformCollectionBlocks(processed);

  return processed;
}

/**
 * Build metadata items array from collection fields (date, location, description, tags, and
 * related collections — both siblings and parents).
 */
function buildMetadataItems(collection: CollectionModel): TextBlockItem[] {
  const items: TextBlockItem[] = [];

  if (collection.collectionDate) {
    items.push({
      type: 'date',
      value: formatDateRange(collection.collectionDate, collection.collectionEndDate),
    });
  }

  if (collection.locations && collection.locations.length > 0) {
    for (const loc of collection.locations) {
      const locationItem: TextBlockItem = { type: 'location', value: loc.name };
      if (loc.slug) {
        locationItem.slug = loc.slug;
      }
      items.push(locationItem);
    }
  }

  if (collection.description) {
    items.push({
      type: 'description',
      value: collection.description,
    });
  }

  // "Related" collections: curated siblings (peers) followed by the parent collections this
  // one belongs to. Both share the CollectionListModel shape and render identically — a cover
  // card when coverImageUrl is present (shipped by the backend), a plain text link otherwise.
  // Dedup by slug so a collection that is both a sibling and a parent isn't listed — or
  // React-keyed — twice; siblings win the slot since they come first.
  const relatedCollections = [...(collection.siblings ?? []), ...(collection.parents ?? [])];
  const seenRelatedSlugs = new Set<string>();
  for (const related of relatedCollections) {
    if (!related.slug || seenRelatedSlugs.has(related.slug)) continue;
    seenRelatedSlugs.add(related.slug);
    const relatedItem: TextBlockItem = {
      type: 'collection',
      value: related.name,
      slug: `/${related.slug}`,
    };
    if (related.coverImageUrl) {
      relatedItem.coverImageUrl = related.coverImageUrl;
    }
    items.push(relatedItem);
  }

  return items;
}

/**
 * Sentinel content id carried by the header's metadata text block. Like
 * {@link COVER_IMAGE_CONTENT_ID} it is not a content-table row.
 */
const HEADER_TEXT_CONTENT_ID = -2;

/**
 * The header's metadata text block. Both header shapes render the same block and differ only in
 * how it is sized: beside a cover it takes the cover's dimensions, and on the cover-less and
 * mobile paths it spans `componentWidth` at auto height (0).
 */
function buildHeaderTextBlock(
  items: TextBlockItem[],
  width: number,
  height: number
): ContentTextModel {
  return {
    contentType: 'TEXT',
    id: HEADER_TEXT_CONTENT_ID,
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
 * Create metadata text block with same dimensions as cover image for equal row sizing.
 *
 * `forceRail` builds the block with zero items — see {@link ProcessContentOptions.forceHeaderRail}.
 * The block is the header's secondary column and the mount point for the filter toolbar and the
 * download row, so a page that shows those needs it whether or not it has metadata text.
 */
function createMetadataTextBlock(
  items: TextBlockItem[],
  width?: number,
  height?: number,
  forceRail: boolean = false
): ContentTextModel | null {
  if ((items.length === 0 && !forceRail) || !width || !height) {
    return null;
  }

  return buildHeaderTextBlock(items, width, height);
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
    id: COVER_IMAGE_CONTENT_ID,
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
    locations: [],
  };
}

/**
 * Build a single full-width, text-only header row (no cover image).
 *
 * Backs the cover-less `/user` intro: a user with a description but no tagged image still gets a
 * header. The metadata text block renders at full width with auto height (height 0), mirroring the
 * mobile metadata row. Returns null when there are no metadata items to show.
 */
function createTextOnlyHeaderRow(
  metadataItems: TextBlockItem[],
  componentWidth: number,
  forceRail: boolean = false
): RowWithPatternAndSizes | null {
  if (metadataItems.length === 0 && !forceRail) {
    return null;
  }

  const textBlock = buildHeaderTextBlock(metadataItems, componentWidth, 0);

  return {
    rowType: 'header',
    items: [{ content: textBlock, width: componentWidth, height: 0 }],
    boxTree: { type: 'leaf', content: textBlock },
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
  isMobile: boolean = false,
  forceRail: boolean = false
): RowWithPatternAndSizes | RowWithPatternAndSizes[] | null {
  // Metadata is independent of the cover; compute it up front so a cover-less collection
  // (e.g. the /user page for a user who isn't tagged in any image yet) can still render a
  // description-only intro instead of no header at all.
  const metadataItems = buildMetadataItems(collection);

  // No cover image: render a text-only intro from the metadata, or nothing if there's none.
  if (!collection.coverImage) {
    return createTextOnlyHeaderRow(metadataItems, componentWidth, forceRail);
  }

  const coverBlock = createCoverImageBlock(collection);

  if (!coverBlock.imageWidth || !coverBlock.imageHeight) {
    return null;
  }

  const coverAspectRatio = coverBlock.imageWidth / coverBlock.imageHeight;

  // Add metadata block if it has content, or if the caller mounts controls into the rail.
  const metadataBlock = createMetadataTextBlock(
    metadataItems,
    coverBlock.imageWidth,
    coverBlock.imageHeight,
    forceRail
  );

  // Mobile: each header item is its own full-width row
  // Cover image is sized via calculateSizesFromBoxTree (respects aspect ratio)
  // Metadata text block only takes the height its content needs
  if (isMobile) {
    const rows: RowWithPatternAndSizes[] = [];

    // Cover image row — sized exactly like a single-item content row
    const coverTree: BoxTree = { type: 'leaf', content: coverBlock };
    const coverItems = calculateSizesFromBoxTree(coverTree, componentWidth, LAYOUT.mobileGridGap);
    rows.push({ rowType: 'header' as const, items: coverItems, boxTree: coverTree });

    // Metadata row — full width, auto height (rendered via text block)
    if (metadataBlock) {
      const metaTree: BoxTree = { type: 'leaf', content: metadataBlock };
      const metaItems: CalculatedContentSize[] = [
        { content: metadataBlock, width: componentWidth, height: 0 },
      ];
      rows.push({ rowType: 'header' as const, items: metaItems, boxTree: metaTree });
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
    rowType: 'header' as const,
    items: calculatedSizes,
    boxTree: createSimpleHorizontalBoxTree(boxTreeItems),
  };
}
