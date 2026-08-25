'use client';

import { createContext, useContext } from 'react';

import { type ReorderMove, type ViewableContent } from '@/app/types/Content';

/**
 * The render-constant props public callers pass to {@link ContentBlockWithFullScreen} and
 * {@link Component} by hand.
 *
 * Reorder, cover and selection props are not here: they live in {@link EditRendererProps}, which
 * `EditModeLayer` supplies through a provider.
 */
export interface SharedRendererProps {
  /** Enable full-screen image viewing on click. */
  enableFullScreenView?: boolean;
  onImageClick?: (imageId: number) => void;
  /** Selected image IDs for bulk editing. */
  selectedIds?: number[];
}

/**
 * The edit-only slice of the grid's render-constant props: supplied by `EditModeLayer` through
 * {@link RendererProvider}, never passed as props.
 *
 * `EditModeLayer` is the only caller that sets any of them, which is why they do not travel as
 * props through `ContentBlockWithFullScreen` and `Component`.
 *
 * They are deliberately NOT also accepted as props. Two open paths would let a member arrive two
 * ways, with precedence invisible at both the call site and the provider.
 */
export interface EditRendererProps {
  /**
   * ID of the current collection. Doubles as the manage-view discriminator: `Component` treats
   * its absence as the public view and drops failed images so the row reflows, and its presence
   * as manage, where a broken image must stay visible for an admin to open and delete.
   */
  currentCollectionId?: number;
  isSelectingCoverImage?: boolean;
  currentCoverImageId?: number;
  justClickedImageId?: number | null;
  /** Reorder mode props */
  isReorderMode?: boolean;
  reorderMoves?: ReorderMove[];
  pickedUpImageId?: number | null;
  reorderDisplayOrder?: number[];
  onArrowMove?: (contentId: number, direction: -1 | 1) => void;
  onPickUp?: (contentId: number) => void;
  onPlace?: (targetId: number) => void;
  onCancelImageMove?: (contentId: number) => void;
}

/**
 * What {@link BoxRenderer} reads out of the context: the props its callers pass, the edit slice
 * `EditModeLayer` provides, and the three values `Component` derives rather than receives — the
 * fullscreen click handler handed down by `ContentBlockWithFullScreen`, and the download
 * capability and slug it computes from `collectionData`.
 */
export interface RendererContextValue extends SharedRendererProps, EditRendererProps {
  /**
   * Records a failed image id so the public view can drop the image and let the row reflow.
   * `Component` sets it to its own handler; a leaf calls it from `<Image onError>`.
   */
  onImageLoadError?: (contentId: number) => void;
  /** Accepts any viewable content (image, parallax image, or GIF/MP4 — normalized in renderer). */
  onFullScreenImageClick?: (image: ViewableContent) => void;
  /** Client gallery download capability, resolved from the viewer's role. */
  canDownload?: boolean;
  collectionSlug?: string;
}

/**
 * Empty default, so a `BoxRenderer` or `Component` rendered without a provider behaves exactly as
 * it did when every one of these was an optional prop that nobody passed.
 */
const EMPTY_RENDERER_CONTEXT: RendererContextValue = Object.freeze({});

const RendererContext = createContext<RendererContextValue>(EMPTY_RENDERER_CONTEXT);

/**
 * Provided in two places, and the nesting is the point.
 *
 * `EditModeLayer` provides {@link EditRendererProps} above the grid. `Component` reads that value,
 * merges its own props and derived values over it, and re-provides the result for the
 * `BoxRenderer` tree below. So a `BoxRenderer` sees one flat value assembled from both, and
 * `Component` never imports anything from the edit directory to do it.
 *
 * `Component` builds a fresh value on every render rather than memoizing one, and that is the
 * right trade here: the only consumers are the `BoxRenderer` trees in `Component`'s own JSX, none
 * of which is wrapped in `memo`, so they re-render with the parent whatever the value's identity.
 * A `useMemo` would need every member in its dependency list to buy nothing. Wrap `BoxRenderer` in
 * `memo` and that changes — memoize the value in the same commit.
 */
export const RendererProvider = RendererContext.Provider;

/** The grid's render-constant props. Empty when read outside a provider. */
export function useRenderer(): RendererContextValue {
  return useContext(RendererContext);
}
