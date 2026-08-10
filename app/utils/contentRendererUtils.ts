/**
 * Content Renderer Utilities
 *
 * Functions for normalizing content types to renderer props.
 * All content type checking and data extraction happens here,
 * so the renderer component doesn't need to know about content types.
 *
 * This is also where accessible naming is decided, for every surface that shows a photo:
 * {@link humanLabel} is the single answer to "did a person write this?". Nothing downstream
 * re-decides it, and nothing downstream invents a generic name that later code could mistake for
 * authored text — see the note on the `alt` field of the props these builders return.
 */

import { collectionPublicLabel } from '@/app/components/ui/Badge/Badge';
import { type AnyContentModel } from '@/app/types/Content';
import { type ContentRendererProps } from '@/app/types/ContentRenderer';
import { isCollectionCard } from '@/app/utils/contentRatingUtils';
import {
  isContentCollection,
  isContentImage,
  isGifContent,
  isTextContent,
  pickImageDimensions,
} from '@/app/utils/contentTypeGuards';
import { logger } from '@/app/utils/logger';

/**
 * Extracts image dimensions with fallback logic
 * Prioritizes imageWidth/imageHeight over width/height, with default fallback
 */
function extractImageDimensions(
  imageWidth?: number,
  width?: number,
  imageHeight?: number,
  height?: number,
  defaultDimension = 800
): { imageWidth: number; imageHeight: number } {
  const dims = pickImageDimensions({ imageWidth, width, imageHeight, height });
  return {
    imageWidth: dims.width ?? defaultDimension,
    imageHeight: dims.height ?? defaultDimension,
  };
}

/**
 * Media file extensions the backend keeps on the title it seeds from an upload. Covers the raw
 * files a camera writes beside the JPEG (`.cr2`, `.cr3`, `.nef`, `.arw`, `.orf`, `.rw2`, `.dng`,
 * `.raf`) as well as the delivery formats, because either can be the uploaded file.
 */
const MEDIA_EXTENSION =
  /\.(?:arw|avif|cr[23]|dng|gif|heics?|heif|jpe?g|mov|mp4|nef|orf|png|raf|rw2|tiff?|webp)$/i;

/**
 * A camera-issued filename stem at the START of a label: `DSC_4364`, `_DSC4364`, `IMG-2031`,
 * `DSCF1234`, `_MG_1234` (Canon), `GOPR0123`, `DJI_0001`, `PXL_20240712`, `P1010042` (Panasonic).
 *
 * Deliberately not anchored at the end. Someone who renames `IMG_2031` to `IMG_2031 sunset over
 * the bay` authored the second half, and {@link authoredText} keeps it rather than throwing the
 * whole label away.
 *
 * Every named prefix needs at least three digits immediately after it, and the bare `P` stem needs
 * six, so camera MODELS inside authored titles survive: `P90 rifle`, `P1000 zoom test`,
 * `DJI Phantom review`, `IMG Worldwide`.
 */
const CAMERA_STEM = /^_?(?:(?:dscf?|dji|gopr|imgp?|mg|pxl)[_-]?\d{3,}|p\d{6,})/i;

/** Six or more characters of nothing but digits and separators: `113994030006-2`, `20240712_141530`. */
const DIGITS_AND_SEPARATORS = /^\d[\d\s._-]{5,}$/;

/** Separator debris left in front of the authored half once a camera stem is stripped. */
const LEADING_SEPARATORS = /^[\s._-]+/;

/** Any letter in any script — what makes a leftover fragment worth announcing rather than noise. */
const CONTAINS_LETTER = /\p{L}/u;

/** Shortest leftover fragment worth announcing, in characters. Below this it is counter debris. */
const MIN_AUTHORED_LENGTH = 3;

/**
 * The part of one label a person actually wrote, trimmed — or undefined when a person wrote none
 * of it.
 *
 * The backend seeds an image's `title` from the uploaded filename, so most photos carry that and
 * nothing else. Announcing `DSC_4364.webp` to a screen reader is worse than announcing nothing,
 * and it is what every tabbable photo tile used to say.
 *
 * A value that still has its media extension is a filename end to end, so it is dropped whole. A
 * camera stem is only a prefix, so it is stripped and the remainder kept when it is substantive —
 * three or more characters with a letter among them, which discards counter debris
 * (`PXL_20240712_141530`) while keeping `IMG_2031 sunset over the bay`.
 *
 * The rules stay narrow so a real caption is never mistaken for a filename: the digit rule needs
 * six characters, which leaves short numeric titles like `1984` intact, and every camera stem
 * needs a counter immediately after the prefix, so `Image 2` and `Studio 54` survive.
 */
function authoredText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (MEDIA_EXTENSION.test(trimmed) || DIGITS_AND_SEPARATORS.test(trimmed)) return undefined;
  if (!CAMERA_STEM.test(trimmed)) return trimmed;

  const remainder = trimmed.replace(CAMERA_STEM, '').replace(LEADING_SEPARATORS, '').trim();
  return remainder.length >= MIN_AUTHORED_LENGTH && CONTAINS_LETTER.test(remainder)
    ? remainder
    : undefined;
}

/**
 * The first of `candidates` that reads as something a person wrote, trimmed and stripped of any
 * machine prefix — or undefined when none of them do.
 *
 * This is the ONE place that decides whether a string is a real human label. Every surface that
 * shows a photo goes through it: the grid via {@link normalizeContentToRendererProps}, which walks
 * a block's alt → title → caption chain, and the fullscreen viewer, which names its dialog and its
 * `<img>` from the same fields.
 *
 * Callers supply their own fallback rather than receiving a generic one from here, because what a
 * nameless element should say depends on what it does: a tile that opens the viewer announces the
 * action ("View photo"), while an `<img>` announces the subject ("Photo"). Returning `undefined`
 * rather than a stand-in is the point — a generic string baked in here would be indistinguishable
 * from authored text one layer down, which is exactly the bug this shape prevents.
 */
export function humanLabel(...candidates: (string | null | undefined)[]): string | undefined {
  for (const candidate of candidates) {
    const authored = authoredText(candidate);
    if (authored) return authored;
  }
  return undefined;
}

/**
 * Narrows a raw contentType string to the known content-type union.
 */
function normalizeContentType(contentType: string): 'IMAGE' | 'TEXT' | 'GIF' | 'COLLECTION' {
  return contentType as 'IMAGE' | 'TEXT' | 'GIF' | 'COLLECTION';
}

/**
 * Determines position className based on row position.
 *
 * @param totalInRow - Total number of items in the row
 * @param index - Current item's index in the row (0-based)
 * @param styles - Style module with position class names
 * @returns Position className (imageLeft/imageRight/imageSingle/imageMiddle)
 */
export function determinePositionClassName(
  totalInRow: number,
  index: number,
  styles: { imageSingle: string; imageLeft: string; imageRight: string; imageMiddle: string }
): string {
  if (totalInRow === 1) return styles.imageSingle || '';
  if (index === 0) return styles.imageLeft || '';
  if (index === totalInRow - 1) return styles.imageRight || '';
  return styles.imageMiddle || '';
}

/** The four dimension inputs subject to NaN recovery. */
export interface DimensionInput {
  width: number;
  height: number;
  imageWidth?: number;
  imageHeight?: number;
}

/** A width/height pair guaranteed finite after recovery. */
export interface ResolvedDimensions {
  width: number;
  height: number;
}

/**
 * Recover finite render dimensions when `width`/`height` arrive as NaN. Prefers the image's
 * intrinsic aspect ratio; falls back to a 1.5 aspect ratio against the finite dimension, then to a
 * 300×200 default. When both width and height are already finite this is a no-op passthrough.
 *
 * Shared by {@link normalizeContentToRendererProps} and CollectionContentRenderer; the diagnostic
 * NaN log (`logger.warn`/`logger.error`) stays at each call site.
 */
export function resolveValidDimensions({
  width,
  height,
  imageWidth,
  imageHeight,
}: DimensionInput): ResolvedDimensions {
  let validWidth = width;
  let validHeight = height;

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    if (imageWidth && imageHeight && imageWidth > 0 && imageHeight > 0) {
      if (!Number.isFinite(width) && Number.isFinite(height)) {
        validWidth = (height * imageWidth) / imageHeight;
      } else if (!Number.isFinite(height) && Number.isFinite(width)) {
        validHeight = (width * imageHeight) / imageWidth;
      } else {
        validWidth = 300;
        validHeight = 200;
      }
    } else {
      if (!Number.isFinite(width)) {
        validWidth = Number.isFinite(height) ? height * 1.5 : 300;
      }
      if (!Number.isFinite(height)) {
        validHeight = Number.isFinite(width) ? width / 1.5 : 200;
      }
      if (!Number.isFinite(validWidth) && !Number.isFinite(validHeight)) {
        validWidth = 300;
        validHeight = 200;
      }
    }
  }

  return { width: validWidth, height: validHeight };
}

/**
 * Normalizes any content type to ContentRendererProps
 * Handles all content type checking and data extraction
 *
 * The `alt` it returns is authored text or the empty string — never a generic stand-in. This used
 * to fall back to `'Image'`/`'Collection'`/`'GIF'`, which the renderer then could not tell apart
 * from a photo a person had genuinely titled "Image", so a tile with no authored text anywhere
 * announced "Image, button" instead of its action. Emptiness is the signal; each consumer picks
 * the wording that fits what its element does.
 *
 * @param content - Any content model to normalize
 * @param calculatedWidth - Pre-calculated display width
 * @param calculatedHeight - Pre-calculated display height
 * @param positionClassName - Position class (imageLeft/imageRight/etc)
 * @param isMobile - Whether on mobile device
 * @returns Normalized props for ContentRenderer
 */
export function normalizeContentToRendererProps(
  content: AnyContentModel,
  calculatedWidth: number,
  calculatedHeight: number,
  positionClassName: string,
  isMobile: boolean
): ContentRendererProps {
  if (
    (!Number.isFinite(calculatedWidth) || !Number.isFinite(calculatedHeight)) &&
    process.env.NODE_ENV === 'development'
  ) {
    logger.warn(
      'normalizeContentToRendererProps',
      `Non-finite dimensions for content ${content.id} (${content.contentType}): width=${calculatedWidth}, height=${calculatedHeight}`
    );
  }

  let imageWidth: number | undefined;
  let imageHeight: number | undefined;

  if (isContentImage(content)) {
    imageWidth = content.imageWidth ?? content.width;
    imageHeight = content.imageHeight ?? content.height;
  } else if (isContentCollection(content)) {
    imageWidth = content.coverImage?.imageWidth ?? content.coverImage?.width;
    imageHeight = content.coverImage?.imageHeight ?? content.coverImage?.height;
  } else if (isGifContent(content)) {
    imageWidth = content.width;
    imageHeight = content.height;
  }

  const { width: validWidth, height: validHeight } = resolveValidDimensions({
    width: calculatedWidth,
    height: calculatedHeight,
    imageWidth,
    imageHeight,
  });

  const baseProps: ContentRendererProps = {
    contentId: content.id,
    className: positionClassName,
    width: Math.round(validWidth),
    height: Math.round(validHeight),
    isMobile,
    imageUrl: '',
    imageWidth: 800,
    imageHeight: 800,
    alt: '',
    enableParallax: false,
    isCollection: false,
    contentType: normalizeContentType(content.contentType),
  };

  if (isContentCollection(content)) {
    const coverImage = content.coverImage;
    const dimensions = extractImageDimensions(
      coverImage?.imageWidth,
      coverImage?.width,
      coverImage?.imageHeight,
      coverImage?.height
    );

    return {
      ...baseProps,
      imageUrl: coverImage?.imageUrl ?? '',
      imageWidth: dimensions.imageWidth,
      imageHeight: dimensions.imageHeight,
      alt: humanLabel(content.title, content.slug) ?? '',
      overlayText: content.title,
      cardTypeBadge: collectionPublicLabel(content) ?? undefined,
      enableParallax: true,
      hasSlug: content.slug,
      isCollection: true,
      followCollectionId: content.referencedCollectionId,
      contentType: 'COLLECTION',
    };
  }

  if (isContentImage(content) && 'enableParallax' in content && content.enableParallax) {
    const dimensions = extractImageDimensions(
      content.imageWidth,
      content.width,
      content.imageHeight,
      content.height
    );

    return {
      ...baseProps,
      imageUrl: content.imageUrl,
      imageWidth: dimensions.imageWidth,
      imageHeight: dimensions.imageHeight,
      alt: humanLabel(content.alt, content.title, content.caption) ?? '',
      overlayText: content.overlayText,
      // Only collection cards (parallax blocks converted from a collection, so they carry
      // a slug) get a badge — a plain parallax IMAGE's own tags must never surface as a
      // card label. Shares {@link isCollectionCard}'s discriminant rather than restating
      // it, so the badge and the layout rating can never disagree about what a card is.
      cardTypeBadge: isCollectionCard(content)
        ? (collectionPublicLabel(content) ?? undefined)
        : undefined,
      enableParallax: true,
      hasSlug: 'slug' in content ? content.slug : undefined,
      isCollection: false,
      followCollectionId: 'collectionId' in content ? content.collectionId : undefined,
      contentType: 'IMAGE',
    };
  }

  if (isContentImage(content)) {
    const dimensions = extractImageDimensions(
      content.imageWidth,
      content.width,
      content.imageHeight,
      content.height
    );

    return {
      ...baseProps,
      imageUrl: content.imageUrl,
      imageWidth: dimensions.imageWidth,
      imageHeight: dimensions.imageHeight,
      alt: humanLabel(content.alt, content.title, content.caption) ?? '',
      overlayText: content.overlayText,
      enableParallax: false,
      isCollection: false,
      contentType: 'IMAGE',
    };
  }

  if (isGifContent(content)) {
    const dimensions = extractImageDimensions(undefined, content.width, undefined, content.height);

    return {
      ...baseProps,
      imageUrl: content.gifUrlWeb ?? content.gifUrl,
      imageWidth: dimensions.imageWidth,
      imageHeight: dimensions.imageHeight,
      alt: humanLabel(content.alt, content.title, content.caption) ?? '',
      overlayText: content.overlayText,
      enableParallax: false,
      isCollection: false,
      contentType: 'GIF',
      isGif: true,
      thumbnailUrl: content.thumbnailUrl,
    };
  }

  if (isTextContent(content)) {
    return {
      ...baseProps,
      imageUrl: '',
      imageWidth: content.width ?? 800,
      imageHeight: content.height ?? 200,
      alt: '',
      enableParallax: false,
      isCollection: false,
      contentType: 'TEXT',
      textItems: content.items,
    };
  }

  return baseProps;
}

/**
 * Build wrapper className string for content renderer.
 * Combines position class with conditional classes based on state.
 *
 * @param positionClassName - Position class (imageLeft/imageRight/imageSingle/imageMiddle).
 *   Must be first in the class list so CSS specificity resolves correctly.
 * @param styles - Style module with class names
 * @param options - Configuration options
 * @returns Combined className string
 */
export function buildWrapperClassName(
  positionClassName: string,
  styles: Record<string, string>,
  options: {
    includeDragContainer?: boolean;
    enableParallax?: boolean;
    isMobile?: boolean;
    hasClickHandler?: boolean;
    isSelected?: boolean;
  } = {}
): string {
  const {
    includeDragContainer = false,
    enableParallax = false,
    isMobile = false,
    hasClickHandler = false,
    isSelected = false,
  } = options;

  return [
    positionClassName,
    includeDragContainer ? styles.dragContainer : '',
    enableParallax ? styles.parallaxContainer : '',
    enableParallax ? styles.overlayContainer : '',
    isMobile ? styles.mobile : '',
    hasClickHandler ? styles.clickable : styles.default,
    isSelected ? styles.selected : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Build simplified wrapper className for parallax images.
 * Only includes essential classes (position, mobile, dragging, selected).
 * Excludes redundant classes that are handled by inline styles.
 *
 * @param positionClassName - Position class (imageLeft/imageRight/imageSingle/imageMiddle).
 *   Must be first in the class list so CSS specificity resolves correctly.
 * @param styles - Style module with class names
 * @param options - Configuration options
 * @returns Combined className string
 */
export function buildParallaxWrapperClassName(
  positionClassName: string,
  styles: Record<string, string>,
  options: {
    isMobile?: boolean;
    isSelected?: boolean;
  } = {}
): string {
  const { isMobile = false, isSelected = false } = options;

  return [positionClassName, isMobile ? styles.mobile : '', isSelected ? styles.selected : '']
    .filter(Boolean)
    .join(' ');
}

/**
 * Determines full renderer props including position and normalized content data.
 * Combines position class determination with content normalization in one call.
 *
 * @param item - Processed content item with calculated dimensions
 * @param totalInRow - Total number of items in the row
 * @param index - Current item's index in the row (0-based)
 * @param isMobile - Whether on mobile device
 * @param styles - Style module with position class names
 * @returns Complete ContentRendererProps ready for rendering
 */
export function determineContentRendererProps(
  item: { content: AnyContentModel; width: number; height: number },
  totalInRow: number,
  index: number,
  isMobile: boolean,
  styles: { imageSingle: string; imageLeft: string; imageRight: string; imageMiddle: string }
): ContentRendererProps {
  if (
    (!Number.isFinite(item.width) || !Number.isFinite(item.height)) &&
    process.env.NODE_ENV === 'development'
  ) {
    logger.warn(
      'determineContentRendererProps',
      `Non-finite dimensions for content ${item.content.id} (${item.content.contentType}): width=${item.width}, height=${item.height}, row=${index}/${totalInRow}`
    );
  }

  const positionClassName = determinePositionClassName(totalInRow, index, styles);

  return normalizeContentToRendererProps(
    item.content,
    item.width,
    item.height,
    positionClassName,
    isMobile
  );
}
