import { type AnyContentModel } from '@/app/types/Content';
import { getContentDimensions, hasImage, isContentImage } from '@/app/utils/contentTypeGuards';

/**
 * Simplified Layout utilities for Content system
 * Direct processing without complex normalization - works with proper Content types
 */

/**
 * Chunk ContentModels based on standalone rules (panorama, high-rated horizontals)
 */
export function chunkContent(
  content: AnyContentModel[],
  chunkSize: number = 2
): AnyContentModel[][] {
  if (!content || content.length === 0) return [];

  const result: AnyContentModel[][] = [];
  let currentChunk: AnyContentModel[] = [];

  for (const contentItem of content) {
    // Check if this contentItem should be standalone
    if (shouldBeStandalone(contentItem)) {
      // Finish current chunk if it has content
      if (currentChunk.length > 0) {
        result.push([...currentChunk]);
        currentChunk = [];
      }
      // Add as standalone
      result.push([contentItem]);
      continue;
    }

    // Add to current chunk
    currentChunk.push(contentItem);
    if (currentChunk.length === chunkSize) {
      result.push([...currentChunk]);
      currentChunk = [];
    }
  }

  // Add remaining content if any
  if (currentChunk.length > 0) {
    result.push(currentChunk);
  }

  return result;
}

/**
 * Determine if a Content should be rendered standalone
 */
export function shouldBeStandalone(contentItem: AnyContentModel): boolean {
  if (!hasImage(contentItem)) return false;

  const { width, height } = getContentDimensions(contentItem);
  const ratio = width / Math.max(1, height);
  const isPanorama = ratio >= 2;
  const isVertical = height > width;

  // Check for high rating (5-star) if it's an image contentItem
  const isHighRated = isContentImage(contentItem) && contentItem.rating === 5;

  return isPanorama || (isHighRated && !isVertical);
}

// ===================== Content sizing =====================

export interface CalculatedContentSize {
  content: AnyContentModel;
  width: number;
  height: number;
}

/**
 * Calculate display sizes for a row of ContentModels so their heights match
 * and their widths sum to the component width
 * TODO: Image width have not been updated to our new '--page-max-width: 1300px;', meaning two images next to each other are not taking up the full width. they are based on the 'old' width
 */
export function calculateContentSizes(
  content: AnyContentModel[],
  componentWidth: number
): CalculatedContentSize[] {
  if (!content || content.length === 0) return [];

  if (content.length === 1) {
    const contentElement = content[0];
    if (!contentElement) return [];

    const { width, height } = getContentDimensions(contentElement);
    const ratio = width / Math.max(1, height);
    const displayHeight = componentWidth / ratio;

    return [{
      content: contentElement,
      width: componentWidth,
      height: displayHeight,
    }];
  }

  // Calculate ratios for all content
  const ratios = content.map(contentItem => {
    const { width, height } = getContentDimensions(contentItem);
    return width / Math.max(1, height);
  });

  const ratioSum = ratios.reduce((sum, ratio) => sum + ratio, 0);
  const commonHeight = componentWidth / ratioSum;

  return content.map((contentItem, idx) => {
    const ratio = ratios[idx];
    if (!ratio) return { content: contentItem, width: 0, height: 0 };

    return {
      content: contentItem,
      width: ratio * commonHeight,
      height: commonHeight,
    };
  });
}

/**
 * Complete pipeline: chunk ContentModels then calculate sizes for each chunk
 */
export function processContentForDisplay(
  content: AnyContentModel[],
  componentWidth: number,
  chunkSize: number = 2
): CalculatedContentSize[][] {
  const chunks = chunkContent(content, chunkSize);
  return chunks.map(chunk => calculateContentSizes(chunk, componentWidth));
}