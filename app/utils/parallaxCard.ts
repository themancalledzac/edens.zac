import { IMAGE } from '@/app/constants';
import { type ContentImageModel, type ContentParallaxImageModel } from '@/app/types/Content';
import { type ContentTagModel } from '@/app/types/Metadata';
import { pickImageDimensions } from '@/app/utils/contentTypeGuards';

/**
 * Side of the square placeholder used when a card has no usable cover dimensions.
 * A 1:1 box makes no-cover cards pack uniformly alongside cards with real covers.
 */
const SQUARE_FALLBACK_SIDE = 1000;

/**
 * Clamp dimensions so the aspect ratio stays within [minParallaxAR, maxParallaxAR].
 * Prevents excessively tall OR wide cover images on parallax collection cards.
 * Crops equally via object-fit: cover + default center positioning.
 *
 * Lives here rather than in `contentLayout.ts` so `buildParallaxCard` can use it without
 * the two modules importing each other. `contentLayout` re-exports it, which is why its
 * existing callers and tests are unchanged.
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
 * Read a cover's dimensions, accepting the layout `width`/`height` fields as a fallback
 * for `imageWidth`/`imageHeight`. See {@link ParallaxCardOptions.allowLayoutDimensions}
 * for why that fallback is opt-in rather than the default.
 */
export function extractCollectionDimensions(coverImage?: ContentImageModel | null): {
  imageWidth?: number;
  imageHeight?: number;
} {
  const { width, height } = pickImageDimensions(coverImage);
  return { imageWidth: width, imageHeight: height };
}

/**
 * Everything that varies between the collection-card call sites. Each field that used to
 * differ silently between the four hand-rolled builders is now a named option with the
 * same default the call site had before.
 */
export interface ParallaxCardOptions {
  id: number;
  slug: string;
  title?: string;
  /**
   * Omit for synthetic sentinel tiles (Me, All Collections). The follow toggle keys on
   * this being set, so leaving it undefined is what keeps those tiles unfollowable.
   */
  collectionId?: number;
  coverImage?: ContentImageModel | null;
  description?: string | null;
  alt?: string;
  /** Defaults to true. Callers with their own visibility model map it to a boolean first. */
  visible?: boolean;
  orderIndex?: number;
  tags?: ContentTagModel[];
  rating?: number;
  isClient?: boolean;
  isBlog?: boolean;
  collectionDate?: string;
  createdAt?: string;
  updatedAt?: string;
  /**
   * Substitute a 1000x1000 square when the cover yields no dimensions, so no-cover cards
   * pack uniformly. Only the public collection-card path wants this; the sentinel tiles
   * and the list-view cards deliberately leave the dimensions undefined.
   */
  squareFallback?: boolean;
  /**
   * Accept the layout `width`/`height` fields when `imageWidth`/`imageHeight` are absent.
   *
   * Opt-in because the four builders genuinely disagreed here: the public collection-card
   * path read dimensions through `pickImageDimensions` (`imageWidth ?? width`), while the
   * other three read `imageWidth`/`imageHeight` only. Backend cover payloads carry the
   * `image*` fields and the layout `width`/`height` are set later by the layout pipeline,
   * so the two agree in practice - but "in practice" is not "provably", and this refactor
   * is meant to be a no-op.
   */
  allowLayoutDimensions?: boolean;
}

/**
 * Build the parallax collection-card shape shared by the public grid, the list views and
 * the two synthetic home tiles.
 *
 * `overlayText` is always `title || slug || ''`, which is what all four call sites computed
 * (the sentinel tiles pass their label as `title`, so it falls out the same).
 *
 * Unset optional fields are present with value `undefined` rather than absent. Nothing
 * downstream inspects key presence - JSON drops undefined, the follow toggle compares
 * `collectionId === undefined`, and the renderer reads values - so this is not observable.
 */
export function buildParallaxCard(options: ParallaxCardOptions): ContentParallaxImageModel {
  const {
    id,
    slug,
    title,
    collectionId,
    coverImage,
    description = null,
    alt,
    visible = true,
    orderIndex = 0,
    tags,
    rating,
    isClient,
    isBlog,
    collectionDate,
    createdAt,
    updatedAt,
    squareFallback = false,
    allowLayoutDimensions = false,
  } = options;

  const raw = allowLayoutDimensions
    ? extractCollectionDimensions(coverImage)
    : { imageWidth: coverImage?.imageWidth, imageHeight: coverImage?.imageHeight };

  const { imageWidth, imageHeight } = squareFallback
    ? clampParallaxDimensions(
        raw.imageWidth ?? SQUARE_FALLBACK_SIDE,
        raw.imageHeight ?? SQUARE_FALLBACK_SIDE
      )
    : clampParallaxDimensions(raw.imageWidth, raw.imageHeight);

  return {
    contentType: 'IMAGE',
    enableParallax: true,
    id,
    collectionId,
    title,
    slug,
    collectionDate,
    rating,
    isClient,
    isBlog,
    tags,
    description,
    imageUrl: coverImage?.imageUrl ?? '',
    overlayText: title || slug || '',
    alt,
    imageWidth,
    imageHeight,
    width: imageWidth,
    height: imageHeight,
    orderIndex,
    visible,
    createdAt,
    updatedAt,
    locations: [],
  };
}
