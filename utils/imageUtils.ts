import {Image} from "@/types/Image";

export interface DisplayImage {
    image: Image;
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
    const isPanorama = (image.imageWidth / image.imageHeight) >= 2;
    const isVertical = image.imageHeight > image.imageWidth;

    return isHighRated && !isVertical || isPanorama;
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
export function chunkImages(images: Image[], chunkSize: number = 2): Image[][] {
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
export function calculateSingleImageSize(
    image: Image,
    availableWidth: number
): DisplayImage {
    const ratio = getAspectRatio(image);
    const height = availableWidth / ratio;

    return {
        image: undefined,
        ...image,
        width: availableWidth,
        height
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
        {image: firstImage, width: width1, height: commonHeight},
        {image: secondImage, width: width2, height: commonHeight}
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
    let result = [];
    let todo = [];

    for (const photo of photoArray) {
        const isHorizontal = photo?.imageWidth >= photo?.imageHeight;
        const isHighRated = photo?.rating === 5;
        if (isHighRated && !isHorizontal) { // TODO: Add an, `&& if vertical`
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
export function calculateImageSizes(images: any[], componentWidth: number): calculateImageSizesReturn[] {
    if (!images || images.length === 0) {
        return [];
    }

    if (images.length === 1) {
        // Handle the single image case
        const ratio = images[0].imageWidth / images[0].imageHeight;
        const height = componentWidth / ratio;
        // const width = ratio * height;

        return [{
            image: images[0],
            width: componentWidth,
            height: height
        }];
    } else {
        // Calculate the ratios for all images.
        const ratios = images.map(img => img.imageWidth / img.imageHeight);

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
                height: height
            }
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

interface swapImagesResponse {
    newImages: Image[] | null;
    newChunks: Image[][] | null;
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
            newChunks
        };
    }
    return null;
}