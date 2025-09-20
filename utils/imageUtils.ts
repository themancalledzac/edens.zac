import { type AnyContentBlock } from '@/types/ContentBlock';
import { type Image } from '@/types/Image';

export interface DisplayImage {
  image: Image;
  width: number;
  height: number;
}

interface Dimensions {
  width: number;
  height: number;
}

/**
 * Determines if an image should be displayed as a standalone item
 * based on rating and orientation.
 * We don't want vertical as it gets too crowded,
 * but we also need panoramas to Always be standalone.
 *
 * @returns Boolean if standalone image.
 */
export function isStandaloneImage(image: Image): boolean {
  if (!image) return false;

  const isHighRated = image.rating === 5;
  const isPanorama = image.imageWidth / image.imageHeight >= 2;
  const isVertical = image.imageHeight > image.imageWidth;

  return (isHighRated && !isVertical) || isPanorama;
}

/**
 * Helper function to verify an image source is valid
 * @param src
 */
export const isValidSource = src => {
  return src && src !== '';
};

/**
 * Calculate Optimal Dimensions
 *
 * Helper function to return image width and height based on available space and image aspect ratio
 * @param aspectRatio - Width divided by height of the image
 * @param availableSpace - Available space dimensions
 * @returns Calculated optimal dimensions
 */
export function calculateOptimalDimensions(
  aspectRatio: number,
  availableSpace: Dimensions
): Dimensions {
  // First try fitting by height ( good for vertical images )
  let height = availableSpace.height;
  let width = height * aspectRatio;

  // If width exceeds available width, fit by width instead
  if (width > availableSpace.width) {
    width = availableSpace.width;
    height = width / aspectRatio;
  }
  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Gets the aspect ratio of an image
 */
export function getAspectRatio(image: Image): number {
  return image.imageWidth / image.imageHeight;
}

export function sortImagesByPriority(images: Image[]): Image[] {
  /**
   * Sorts images by rating and other criteria for optimal display
   * This needs to be used as a: 'for all 5 star, go first'. oOtherwise, we use the regular order.
   * This means we don't plan on reorganizing much more than a few 'top' images.
   */
  return [...images].sort((a, b) => {
    // First sort by rating (highest first)
    if ((b.rating || 0) !== (a.rating || 0)) {
      return (b.rating || 0) - (a.rating || 0);
    }

    // Then prioritize vertical images for variety
    const aIsVertical = a.imageHeight > a.imageWidth;
    const bIsVertical = b.imageHeight > b.imageWidth;
    if (aIsVertical !== bIsVertical) {
      return aIsVertical ? -1 : 1;
    }

    // Default to original order
    return 0;
  });
}

/**
 * Chunks an array of images into groups for display
 *
 * @param images Array of images to chunk
 * @param chunkSize Default size of chunks (usually 2)
 * @returns Array of image arrays (chunks)
 */
export function chunkImages(images: Image[] | undefined, chunkSize: number = 2): Image[][] {
  if (!images || images.length === 0) return [];

  // TODO: We only sort Images if order is not a priority. Thinking abstract catalogs, not a day of images.
  //  - This means we need to have some sort of KVP that determines a catalog being order based or priority based.
  // Clone the array to avoid mutating the original
  // const sortedImages = sortImagesByPriority([...images]);

  const result: Image[][] = [];
  let currentChunk: Image[] = [];

  for (const image of images) {
    // for (const image of sortedImages) {
    // Standalone images get their own chunk
    if (isStandaloneImage(image)) {
      // If we have a partial chunk, add it to the result first
      if (currentChunk.length > 0) {
        result.push([...currentChunk]);
        currentChunk = [];
      }

      // Add the standalone image as its own chunk
      result.push([image]);
      continue;
    }

    // Add to current chunk
    currentChunk.push(image);

    // When chunk is full, add it to results and start a new chunk
    if (currentChunk.length === chunkSize) {
      result.push([...currentChunk]);
      currentChunk = [];
    }
  }

  // Add any remaining images
  if (currentChunk.length > 0) {
    result.push(currentChunk);
  }

  return result;
}

/**
 * Calculates optimal sizes for a single image to fit available width
 */
export function calculateSingleImageSize(image: Image, availableWidth: number): DisplayImage {
  const ratio = getAspectRatio(image);
  const height = availableWidth / ratio;

  return {
    image,
    width: availableWidth,
    height,
  };
}

/**
 * Calculates optimal sizes for a pair of images to fit available width
 * while maintaining their aspect ratios
 */
export function calculatePairImageSizes(
  firstImage: Image,
  secondImage: Image,
  availableWidth: number,
  gapWidth: number = 0
): [DisplayImage, DisplayImage] {
  const ratio1 = getAspectRatio(firstImage);
  const ratio2 = getAspectRatio(secondImage);

  // Adjust available width for the gap between images
  const adjustedWidth = availableWidth - gapWidth;

  // Calculate the common height that will divide the available width
  // according to the aspect ratios of both images
  const commonHeight = adjustedWidth / (ratio1 + ratio2);

  // Calculate widths based on the common height
  const width1 = ratio1 * commonHeight;
  const width2 = ratio2 * commonHeight;

  return [
    { image: firstImage, width: width1, height: commonHeight },
    { image: secondImage, width: width2, height: commonHeight },
  ];
}

/**
 * Calculates sizes for a chunk of images (1 or 2)
 */
export function calculateChunkSizes(
  imageChunk: Image[],
  availableWidth: number,
  gapWidth: number = 0
): DisplayImage[] {
  if (!imageChunk || imageChunk.length === 0) {
    return [];
  }

  if (imageChunk.length === 1) {
    return [calculateSingleImageSize(imageChunk[0], availableWidth)];
  }

  // For pairs of images
  const [first, second] = calculatePairImageSizes(
    imageChunk[0],
    imageChunk[1],
    availableWidth,
    gapWidth
  );

  return [first, second];
}

/**
 * Processes an array of images into display-ready chunks with calculated dimensions
 */
export function processImagesForDisplay(
  images: Image[],
  availableWidth: number,
  chunkSize: number = 2,
  gapWidth: number = 0
): DisplayImage[][] {
  // First chunk the images
  const chunks = chunkImages(images, chunkSize);

  // Then calculate sizes for each chunk
  return chunks.map(chunk => calculateChunkSizes(chunk, availableWidth, gapWidth));
}

/**
 * Chunks an array of Cards ('photo' | 'text'| 'gif' | 'etc') into pairs
 * based on their rating and orientation.
 * Highest-rated (5-star) horizontal images get their own row
 * Other images are paired into a layout.
 *
 * @param photoArray Array of images to chunk
 * @param chunkSize Default size of chunks (usually 2)
 * @returns Array of Image arrays (chunks)
 */
export async function chunkImageArray(photoArray: Image[], chunkSize: number = 2) {
  const result = [];
  let todo = [];

  for (const photo of photoArray) {
    const isHorizontal = photo?.imageWidth >= photo?.imageHeight;
    const isHighRated = photo?.rating === 5;
    if (isHighRated && !isHorizontal) {
      // TODO: Add an, `&& if vertical`
      // If it's a 5-star image, add it immediately as a single-image pair.
      result.push([photo]);
    } else {
      // Add current image to the waiting list.
      todo.push(photo);
      // If we have enough images for a pair, add them to the result.
      if (todo.length === chunkSize) {
        result.push([...todo]); // Use spread operator to clone the array
        todo = []; // Clear the todo list
      }
    }
  }

  // If there's an image left over that didn't form a pair, add it to the result.
  if (todo.length > 0) {
    result.push(todo);
  }

  return result;
}

export interface calculateImageSizesReturn {
  image: Image;
  width: number;
  height: number;
}

/**
 * Calculates optimal sizes for images in a row based on their aspect ratios
 *
 * @param images Array of images (usually 1 or 2)
 * @param componentWidth Available width for the entire component
 * @returns Images with calculated width and height properties
 *
 */
export function calculateImageSizes(
  images: any[],
  componentWidth: number
): calculateImageSizesReturn[] {
  if (!images || images.length === 0) {
    return [];
  }

  if (images.length === 1) {
    // Handle the single image case
    const ratio = images[0].imageWidth / Math.max(1, images[0].imageHeight);
    const height = componentWidth / ratio;
    // const width = ratio * height;

    return [
      {
        image: images[0],
        width: componentWidth,
        height: height,
      },
    ];
  } else {
    // Calculate the ratios for all images.
    const ratios = images.map(img => img.imageWidth / Math.max(1, img.imageHeight));

    // Calculate the sum of all ratios
    const ratioSum = ratios.reduce((sum, ratio) => sum + ratio, 0);

    // Determine the common height
    const height = componentWidth / ratioSum;

    // Return the original objects with added calculated width and height
    // Calculate width for each image based on its ratio and the common height
    return images.map((image, index) => {
      // Calculate new size based on the index
      const width = ratios[index] * height;

      return {
        image: image,
        width: width,
        height: height,
      };
    });
  }
}

/**
 * Unified function to process images for display in grid layouts
 * Combines chunking and sizing in one operation
 *
 * @param images Array of images to process
 * @param componentWidth Available width for component
 * @param chunkSize Default chunk size (usually 2)
 * @returns Array of image chunks with calculated dimensions
 */
export async function processImagesForDisplayOld(
  images: Image[],
  componentWidth: number,
  chunkSize: number = 2
) {
  // First chunk the images
  const chunks = await chunkImageArray(images, chunkSize);

  // Then calculate sizes for each chunk
  return chunks.map(chunk => calculateImageSizes(chunk, componentWidth));
}

/**
 * ContentBlock-oriented normalization and layout helpers (non-breaking additions)
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
 * Returns aspect ratio for a content block. For text/code and other non-image blocks,
 * we use the default 2:3 (portrait) ratio per requirements.
 */
export function getContentBlockAspectRatio(block: AnyContentBlock | NormalizedContentBlock): number {
  // If already normalized
  const maybeNormalized = block as Partial<NormalizedContentBlock>;
  if (typeof maybeNormalized.contentWidth === 'number' && typeof maybeNormalized.contentHeight === 'number') {
    const w = maybeNormalized.contentWidth as number;
    const h = maybeNormalized.contentHeight as number;
    if (w > 0 && h > 0) return w / h;
  }

  const b = block as any;
  const w = b?.contentWidth ?? b?.width ?? b?.imageWidth;
  const h = b?.contentHeight ?? b?.height ?? b?.imageHeight;
  if (typeof w === 'number' && typeof h === 'number' && w > 0 && h > 0) {
    return w / h;
  }
  // Default for non-image or missing dims: 2:3
  return 2 / 3;
}

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

  const type = (block as any).type ?? (block as any).blockType;

  if (type === 'IMAGE' || type === 'GIF') {
    const url =
      (block as any).imageUrlWeb ?? (block as any).webUrl ?? (block as any).url ?? (block as any).src ?? null;
    const width = (block as any).contentWidth ?? (block as any).width ?? (block as any).imageWidth ?? 0;
    const height = (block as any).contentHeight ?? (block as any).height ?? (block as any).imageHeight ?? 0;
    const rating = (block as any).rating ?? defaultRating;

    // If missing dimensions, fall back to default aspect to avoid next/image issues later.
    const finalWidth = typeof width === 'number' && width > 0 ? width : baseWidth;
    const finalHeight = typeof height === 'number' && height > 0 ? height : Math.round(finalWidth / defaultAspect);

    return {
      id: (block as any).id ?? `${type}-${Math.random().toString(36).slice(2)}`,
      imageUrlWeb: url,
      contentWidth: finalWidth,
      contentHeight: finalHeight,
      rating,
      originalBlock: block,
    };
  }

  // TEXT/CODE or unknown block types -> synthesize
  const rating = (block as any).rating ?? defaultRating;
  const width = baseWidth;
  const height = Math.round(width / defaultAspect);
  return {
    id: (block as any).id ?? `${type ?? 'BLOCK'}-${Math.random().toString(36).slice(2)}`,
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
  const items: NormalizedContentBlock[] = (blocks as any[]).map(b =>
    (b as any).contentWidth !== undefined && (b as any).contentHeight !== undefined && 'imageUrlWeb' in (b as any)
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

export const swapImages = (images: Image[], id1: number, id2: number) => {
  const newImages = [...images];
  const index1 = newImages.findIndex(img => img.id === id1);
  const index2 = newImages.findIndex(img => img.id === id2);

  if (index1 >= 0 && index2 >= 0) {
    // swap images
    [newImages[index1], newImages[index2]] = [newImages[index2], newImages[index1]];
    // updateChunks
    const newChunks = chunkImages(newImages, 3);

    return {
      newImages,
      newChunks,
    };
  }
  return null;
};


// ===================== ContentBlock sizing (new) =====================
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
    const ratio = blocks[0].contentWidth / Math.max(1, blocks[0].contentHeight);
    const height = componentWidth / ratio;
    return [
      {
        block: blocks[0],
        width: componentWidth,
        height,
      },
    ];
  }

  const ratios = blocks.map(b => b.contentWidth / Math.max(1, b.contentHeight));
  const ratioSum = ratios.reduce((sum, r) => sum + r, 0);
  const commonHeight = componentWidth / ratioSum;

  return blocks.map((block, idx) => ({
    block,
    width: ratios[idx] * commonHeight,
    height: commonHeight,
  }));
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
