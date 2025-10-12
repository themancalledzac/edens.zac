import { type AnyContentBlock } from '@/app/types/ContentBlock';
import { getBlockDimensions, hasImage, isImageBlock } from '@/app/utils/contentBlockTypeGuards';

/**
 * Simplified Layout utilities for ContentBlock system
 * Direct processing without complex normalization - works with proper ContentBlock types
 */

/**
 * Chunk ContentBlocks based on standalone rules (panorama, high-rated horizontals)
 */
export function chunkContentBlocks(
  blocks: AnyContentBlock[],
  chunkSize: number = 2
): AnyContentBlock[][] {
  if (!blocks || blocks.length === 0) return [];

  const result: AnyContentBlock[][] = [];
  let currentChunk: AnyContentBlock[] = [];

  for (const block of blocks) {
    // Check if this block should be standalone
    if (shouldBeStandalone(block)) {
      // Finish current chunk if it has content
      if (currentChunk.length > 0) {
        result.push([...currentChunk]);
        currentChunk = [];
      }
      // Add as standalone
      result.push([block]);
      continue;
    }

    // Add to current chunk
    currentChunk.push(block);
    if (currentChunk.length === chunkSize) {
      result.push([...currentChunk]);
      currentChunk = [];
    }
  }

  // Add remaining blocks if any
  if (currentChunk.length > 0) {
    result.push(currentChunk);
  }

  return result;
}

/**
 * Determine if a ContentBlock should be rendered standalone
 */
export function shouldBeStandalone(block: AnyContentBlock): boolean {
  if (!hasImage(block)) return false;

  const { width, height } = getBlockDimensions(block);
  const ratio = width / Math.max(1, height);
  const isPanorama = ratio >= 2;
  const isVertical = height > width;

  // Check for high rating (5-star) if it's an image block
  const isHighRated = isImageBlock(block) && block.rating === 5;

  return isPanorama || (isHighRated && !isVertical);
}

// ===================== ContentBlock sizing =====================

export interface CalculatedContentBlockSize {
  block: AnyContentBlock;
  width: number;
  height: number;
}

/**
 * Calculate display sizes for a row of ContentBlocks so their heights match
 * and their widths sum to the component width
 * TODO: Image width have not been updated to our new '--page-max-width: 1300px;', meaning two images next to each other are not taking up the full width. they are based on the 'old' width
 */
export function calculateContentBlockSizes(
  blocks: AnyContentBlock[],
  componentWidth: number
): CalculatedContentBlockSize[] {
  if (!blocks || blocks.length === 0) return [];

  if (blocks.length === 1) {
    const block = blocks[0];
    if (!block) return [];

    const { width, height } = getBlockDimensions(block);
    const ratio = width / Math.max(1, height);
    const displayHeight = componentWidth / ratio;

    return [{
      block,
      width: componentWidth,
      height: displayHeight,
    }];
  }

  // Calculate ratios for all blocks
  const ratios = blocks.map(block => {
    const { width, height } = getBlockDimensions(block);
    return width / Math.max(1, height);
  });

  const ratioSum = ratios.reduce((sum, ratio) => sum + ratio, 0);
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
 * Complete pipeline: chunk ContentBlocks then calculate sizes for each chunk
 */
export function processContentBlocksForDisplay(
  blocks: AnyContentBlock[],
  componentWidth: number,
  chunkSize: number = 2
): CalculatedContentBlockSize[][] {
  const chunks = chunkContentBlocks(blocks, chunkSize);
  return chunks.map(chunk => calculateContentBlockSizes(chunk, componentWidth));
}