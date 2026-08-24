'use client';

import { createContext, useContext } from 'react';

import { type ReorderMove } from '@/app/types/Content';
import { type ViewableContent } from '@/app/types/Content';

/**
 * The render-constant slice of the content grid's props: the values that are identical for every
 * row, every box split and every leaf within a single render of the grid.
 *
 * It is declared here because it used to be declared three times — `ContentBlockWithFullScreenProps`,
 * `ContentComponentProps` and `BoxRendererProps` each carried its own copy of these sixteen
 * members, and each hop re-listed them in JSX. `ContentBlockWithFullScreen` and `Component` still
 * accept them as props, because their callers pass the members individually, but they forward the
 * set as a unit; `BoxRenderer` no longer accepts them at all and reads {@link useRenderer} instead.
 *
 * Per-row values are deliberately absent. `tree`, `sizes` and `priority` differ row to row
 * (`priority` is `rowIndex <= priorityRowIndex`), so they stay props on `BoxRenderer`.
 */
export interface SharedRendererProps {
  /** Enable full-screen image viewing on click. */
  enableFullScreenView?: boolean;
  onImageClick?: (imageId: number) => void;
  /** Selected image IDs for bulk editing. */
  selectedIds?: number[];
  /** ID of the current collection, for collection-specific visibility checks. */
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
  onImageLoadError?: (contentId: number) => void;
}

/**
 * What {@link BoxRenderer} reads out of the context: the shared props plus the three values
 * `Component` derives rather than receives — the fullscreen click handler handed down by
 * `ContentBlockWithFullScreen`, and the download capability and slug it computes from
 * `collectionData`.
 *
 * `onImageLoadError` here is `Component`'s wrapper, not the caller's raw handler: the wrapper
 * records the failed id so the public view can drop the image and reflow, then calls the caller's.
 */
export interface RendererContextValue extends SharedRendererProps {
  /** Accepts any viewable content (image, parallax image, or GIF/MP4 — normalized in renderer). */
  onFullScreenImageClick?: (image: ViewableContent) => void;
  /** Client gallery download capability, resolved from the viewer's role. */
  canDownload?: boolean;
  collectionSlug?: string;
}

/**
 * Empty default, so a `BoxRenderer` rendered without a provider behaves exactly as it did when
 * every one of these was an optional prop that nobody passed.
 */
const EMPTY_RENDERER_CONTEXT: RendererContextValue = Object.freeze({});

const RendererContext = createContext<RendererContextValue>(EMPTY_RENDERER_CONTEXT);

/**
 * `Component` builds a fresh value on every render rather than memoizing one, and that is the
 * right trade here: the only consumers are the `BoxRenderer` trees in `Component`'s own JSX, none
 * of which is wrapped in `memo`, so they re-render with the parent whatever the value's identity.
 * A `useMemo` would need all nineteen members in its dependency list to buy nothing. Wrap
 * `BoxRenderer` in `memo` and that changes — memoize the value in the same commit.
 */
export const RendererProvider = RendererContext.Provider;

/** The grid's render-constant props. Empty when read outside a provider. */
export function useRenderer(): RendererContextValue {
  return useContext(RendererContext);
}
