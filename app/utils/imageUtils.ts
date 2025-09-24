import { type AnyContentBlock } from '@/app/types/ContentBlock';

/**
 * ContentBlock-oriented normalization and layout helpers
 */
export type NormalizedContentBlock = {
  id: number | string;
  imageUrlWeb: string | null; // null indicates non-image blocks
  contentWidth: number;
  contentHeight: number;
  rating?: number;
  // Keep loose shape compatibility by holding the original block
  [key: string]: unknown;
};

/**
 * Normalize a ContentBlock to a consistent render shape for layout sizing.
 * - IMAGE/GIF: carry through url and dimensions
 * - TEXT/CODE: synthesize dimensions using default 2:3 aspect and base width
 */
export function normalizeContentBlock(
  block: AnyContentBlock,
  options?: { defaultAspect?: number; baseWidth?: number; defaultRating?: number }
): NormalizedContentBlock {
  const defaultAspect = options?.defaultAspect ?? 2 / 3; // width/height
  const baseWidth = options?.baseWidth ?? 1000;
  const defaultRating = options?.defaultRating ?? 3;

  const type = (block as AnyContentBlock).type ?? (block as AnyContentBlock).blockType;

  if (type === 'IMAGE' || type === 'GIF') {
    const urlRaw = (block as AnyContentBlock).imageUrlWeb ?? (block as AnyContentBlock).webUrl ?? (block as AnyContentBlock).url ?? (block as AnyContentBlock).src ?? null;
    const url: string | null = typeof urlRaw === 'string' ? urlRaw : null;
    const width = (block as AnyContentBlock).contentWidth ?? (block as AnyContentBlock).width ?? (block as AnyContentBlock).imageWidth ?? 0;
    const height = (block as AnyContentBlock).contentHeight ?? (block as AnyContentBlock).height ?? (block as AnyContentBlock).imageHeight ?? 0;
    const ratingRaw = (block as AnyContentBlock).rating ?? defaultRating;
    const rating = typeof ratingRaw === 'number' ? ratingRaw : defaultRating;

    // If missing dimensions, fall back to default aspect to avoid next/image issues later.
    const finalWidth = typeof width === 'number' && width > 0 ? width : baseWidth;
    const finalHeight = typeof height === 'number' && height > 0 ? height : Math.round(finalWidth / defaultAspect);

    return {
      id: (block as AnyContentBlock).id ?? `${type}-${Math.random().toString(36).slice(2)}`,
      imageUrlWeb: url,
      contentWidth: finalWidth,
      contentHeight: finalHeight,
      rating,
      originalBlock: block,
    };
  }

  // TEXT/CODE or unknown block types -> synthesize, but respect provided dimensions
  const ratingRaw = (block as AnyContentBlock).rating ?? defaultRating;
  const rating = typeof ratingRaw === 'number' ? ratingRaw : defaultRating;
  const providedWidth = (block as AnyContentBlock).contentWidth ?? (block as AnyContentBlock).width;
  const providedHeight = (block as AnyContentBlock).contentHeight ?? (block as AnyContentBlock).height;

  const width = typeof providedWidth === 'number' && providedWidth > 0 ? providedWidth : baseWidth;
  const height = typeof providedHeight === 'number' && providedHeight > 0 ? providedHeight : Math.round(width / defaultAspect);

  return {
    id: (block as AnyContentBlock).id ?? `${type ?? 'BLOCK'}-${Math.random().toString(36).slice(2)}`,
    imageUrlWeb: null, // signifies non-image; renderer can branch
    contentWidth: width,
    contentHeight: height,
    rating,
    originalBlock: block,
  };
}

/**
 * Chunk arbitrary content blocks (after normalization) using the same standalone logic
 * for image items. Non-image items will never be treated as panoramas; only rating-based
 * standalone applies if desired.
 */
export function chunkContentBlocks(
  blocks: AnyContentBlock[] | NormalizedContentBlock[] | undefined,
  chunkSize: number = 2
): NormalizedContentBlock[][] {
  if (!blocks || blocks.length === 0) return [];

  // Normalize to NormalizedContentBlock
  const items: NormalizedContentBlock[] = (blocks as (AnyContentBlock | NormalizedContentBlock)[]).map(b =>
    (b as Partial<NormalizedContentBlock>).contentWidth !== undefined && (b as Partial<NormalizedContentBlock>).contentHeight !== undefined && 'imageUrlWeb' in (b as Partial<NormalizedContentBlock>)
      ? (b as NormalizedContentBlock)
      : normalizeContentBlock(b as AnyContentBlock)
  );

  const result: NormalizedContentBlock[][] = [];
  let currentChunk: NormalizedContentBlock[] = [];

  for (const item of items) {
    // Only treat as standalone if it's an image with panorama or 5-star horizontal
    const isImage = !!item.imageUrlWeb;
    const ratio = item.contentWidth / Math.max(1, item.contentHeight);
    const isPanorama = isImage && ratio >= 2;
    const isVertical = item.contentHeight > item.contentWidth;
    const isHighRated = (item.rating ?? 0) === 5;

    if (isImage && ((isHighRated && !isVertical) || isPanorama)) {
      if (currentChunk.length > 0) {
        result.push([...currentChunk]);
        currentChunk = [];
      }
      result.push([item]);
      continue;
    }

    currentChunk.push(item);
    if (currentChunk.length === chunkSize) {
      result.push([...currentChunk]);
      currentChunk = [];
    }
  }

  if (currentChunk.length > 0) {
    result.push(currentChunk);
  }

  return result;
}

// ===================== ContentBlock sizing =====================
export interface CalculatedContentBlockSize {
  block: NormalizedContentBlock;
  width: number;
  height: number;
}

/**
 * Calculates sizes for a row of normalized content blocks so their heights match
 * and their widths sum to the component width.
 */
export function calculateContentBlockSizes(
  blocks: NormalizedContentBlock[],
  componentWidth: number
): CalculatedContentBlockSize[] {
  if (!blocks || blocks.length === 0) return [];

  if (blocks.length === 1) {
    const firstBlock = blocks[0];
    if (!firstBlock) return [];

    const ratio = firstBlock.contentWidth / Math.max(1, firstBlock.contentHeight);
    const height = componentWidth / ratio;
    return [
      {
        block: firstBlock,
        width: componentWidth,
        height,
      },
    ];
  }

  const ratios = blocks.map(b => b.contentWidth / Math.max(1, b.contentHeight));
  const ratioSum = ratios.reduce((sum, r) => sum + r, 0);
  const commonHeight = componentWidth / ratioSum;

  return blocks.map((block, idx) => {
    const ratio = ratios[idx];
    if (!ratio) return { block, width: 0, height: 0 };

    return {
      block,
      width: ratio * commonHeight,
      height: commonHeight,
    };
  });
}

/**
 * Unified pipeline for ContentBlocks: chunk then size.
 */
export function processContentBlocksForDisplay(
  blocks: AnyContentBlock[] | NormalizedContentBlock[],
  componentWidth: number,
  chunkSize: number = 2
): CalculatedContentBlockSize[][] {
  const chunks = chunkContentBlocks(blocks, chunkSize);
  return chunks.map(chunk => calculateContentBlockSizes(chunk, componentWidth));
}