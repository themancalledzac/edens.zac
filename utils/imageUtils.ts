import {Image} from "@/types/Image";

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

/**
 * Calculates optimal sizes for images in a row based on their aspect ratios
 *
 * @param images Array of images (usually 1 or 2)
 * @param componentWidth Available width for the entire component
 * @returns Images with calculated width and height properties
 *
 */
export function calculateImageSizes(images: any[], componentWidth: number) {
    if (!images || images.length === 0) {
        return [];
    }

    if (images.length === 1) {
        // Handle the single image case
        const ratio = images[0].imageWidth / images[0].imageHeight;
        const height = componentWidth / ratio;
        // const width = ratio * height;

        return [{
            ...images[0],
            width: componentWidth,
            height: height
        }];
    } else {
        // Calculate the ratios using imageWidth and imageHeight from the input objects
        const ratio1 = images[0].imageWidth / images[0].imageHeight;
        const ratio2 = images[1].imageWidth / images[1].imageHeight;

        // Solve for the heights and widths
        const height = componentWidth / (ratio1 + ratio2);
        const width1 = ratio1 * height;
        const width2 = ratio2 * height;

        // Return the original objects with added calculated width and height
        return images.map((image, index) => {
            // Calculate new size based on the index
            const newSize = index === 0 ? {width: width1, height: height} : {width: width2, height: height};

            // Spread the original image object and merge with the new size
            return {...image, ...newSize};
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
export async function processImagesForDisplay(
    images: Image[],
    componentWidth: number,
    chunkSize: number = 2
) {
    // First chunk the images
    const chunks = await chunkImageArray(images, chunkSize);

    // Then calculate sizes for each chunk
    return chunks.map(chunk => calculateImageSizes(chunk, componentWidth));
}