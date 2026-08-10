/**
 * Pure helpers for {@link CollectionContentRenderer} — keyboard activation, filter-dimension
 * mapping and click-eligibility derivation. Kept out of the component so the JSX stays thin and
 * the logic is unit-testable in isolation. No hooks, no JSX, no side effects.
 *
 * Accessible naming is NOT here: `humanLabel` lives in `@/app/utils/contentRendererUtils` beside
 * the normalizer that produces the fields it filters, so the grid and the fullscreen viewer share
 * one answer to "did a person write this?". NaN-dimension recovery (`resolveValidDimensions`)
 * lives there too, for the same reason.
 */

import { type KeyboardEvent } from 'react';

import { type CollectionInfoOptions } from '@/app/components/ContentCollection/CollectionFilterContext';
import { type ToolbarDimension } from '@/app/components/ui/FilterToolbar/FilterToolbar';
import { type ContentType, type ViewableContent } from '@/app/types/Content';
import { type ArrayFilterKey } from '@/app/types/GalleryFilter';
import { dayLabels } from '@/app/utils/collectionDates';

export interface ActivatableProps {
  onClick?: () => void;
  role?: 'button';
  tabIndex?: 0;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
}

/**
 * Make a plain element behave like a button for pointer AND keyboard users.
 *
 * A content tile cannot be a real `<button>` — it wraps a `next/image` and carries the overlay
 * chrome — and the slug-navigating variant is already a real `<a>` via `Tile`. What is left is
 * the tile that opens the fullscreen viewer, which has no href to navigate to.
 *
 * Returns nothing when `active` is false, so a tile with no action stays inert rather than
 * advertising a button role it cannot honour.
 *
 * This existed inline in three places in the renderer, and the one that mattered most — the real
 * image tile, as opposed to its two placeholder fallbacks — was the one that had been missed, so
 * the entire photo grid was mouse-only.
 *
 * A held key still calls `preventDefault` on every repeat (Space must not scroll the page for as
 * long as it is down) but activates only once. That is deliberately STRICTER than a native
 * `<button>`, which does re-fire on a held Enter — only Space is single-shot there, and only
 * because it activates on keyup. Nothing a tile does (open the viewer, select an image) is worth
 * repeating at the keyboard's auto-repeat rate. Today's `onActivate`s are idempotent, so nothing
 * observable changed; the guard is here because this is a shared primitive and the next handler
 * wired to it may not be.
 */
export function activatableProps(active: boolean, onActivate: () => void): ActivatableProps {
  if (!active) return {};
  return {
    onClick: onActivate,
    role: 'button',
    tabIndex: 0,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      if (event.repeat) return;
      onActivate();
    },
  };
}

/**
 * Maps the collection page's CollectionInfoOptions (per-dimension `filterable`
 * + values) into the toolbar's `dimensions` config. Only filterable dimensions
 * with at least one value become dropdowns.
 *
 * Tags are deliberately absent: they are private background metadata on collections and are not
 * a public filter dimension here. Location and taxonomy pages still surface their own tag filter.
 */
export function toCollectionDimensions(
  options: CollectionInfoOptions
): Partial<Record<ArrayFilterKey, ToolbarDimension>> {
  const dims: Partial<Record<ArrayFilterKey, ToolbarDimension>> = {};
  if (options.dates.filterable && options.dates.values.length > 0) {
    dims.selectedDates = {
      label: 'Date',
      options: options.dates.values,
      optionLabels: dayLabels(options.dates.values),
    };
  }
  if (options.people.filterable && options.people.values.length > 0) {
    dims.selectedPeople = { label: 'People', options: options.people.values };
  }
  if (options.cameras.filterable && options.cameras.values.length > 0) {
    dims.selectedCameras = { label: 'Camera', options: options.cameras.values };
  }
  if (options.locations.filterable && options.locations.values.length > 0) {
    dims.selectedLocations = { label: 'Location', options: options.locations.values };
  }
  if (options.lenses.filterable && options.lenses.values.length > 0) {
    dims.selectedLenses = { label: 'Lens', options: options.lenses.values };
  }
  return dims;
}

/** Inputs that decide whether/how a content item responds to a click. */
export interface ClickEligibilityInput {
  contentType: ContentType;
  isReorderMode: boolean;
  /** The item's slug (route segment), or undefined when it does not navigate. */
  hasSlug: string | undefined;
  onImageClick?: (imageId: number) => void;
  enableFullScreenView?: boolean;
  onFullScreenImageClick?: (image: ViewableContent) => void;
  /**
   * Set only on the manage path (EditModeLayer threads the collection id down); the public
   * grid, TaxonomyPage, and LocationPage leave it undefined. Used here as the manage/public
   * discriminant — see {@link getClickEligibility}.
   */
  currentCollectionId?: number;
}

/** Whether an item navigates via href (`isSlugNav`) and/or has a meaningful click action. */
export interface ClickEligibility {
  hasClickHandler: boolean;
  isSlugNav: boolean;
}

/**
 * Derive click eligibility for a content item. Slug-bearing items (collection cards — the only
 * blocks that carry a slug) navigate via href, and on the PUBLIC surface that navigation WINS
 * over `onImageClick`: client-gallery select mode sets `onImageClick` grid-wide, and without
 * this a child card would silently become a download target carrying its content-table id
 * instead of a link.
 *
 * The manage grid (EditModeLayer) also sets `onImageClick` grid-wide, but there the handler is
 * the router: it pushes `manageHref(childSlug)` so an admin drilling into a child collection
 * STAYS in manage mode, and it is also what makes a card click a no-op while a cover image or a
 * capture-date source is being picked. `currentCollectionId` is the manage/public discriminant
 * (only EditModeLayer threads it down), so on that surface the handler keeps winning.
 *
 * IMAGE/GIF fullscreen stays on `onClick`. TEXT and reorder mode produce no action.
 */
export function getClickEligibility(input: ClickEligibilityInput): ClickEligibility {
  const {
    contentType,
    isReorderMode,
    hasSlug,
    onImageClick,
    enableFullScreenView,
    onFullScreenImageClick,
    currentCollectionId,
  } = input;

  const isManage = currentCollectionId != null;

  const isSlugNav =
    !!hasSlug && !isReorderMode && contentType !== 'TEXT' && !(isManage && !!onImageClick);

  const hasClickHandler =
    contentType !== 'TEXT' &&
    !isReorderMode &&
    (hasSlug !== undefined || !!onImageClick || !!(enableFullScreenView && onFullScreenImageClick));

  return { hasClickHandler, isSlugNav };
}
