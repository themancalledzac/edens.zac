/**
 * Pure helpers for {@link CollectionContentRenderer} — filter-dimension mapping and
 * click-eligibility derivation. Kept out of the component so the JSX stays thin and the logic is
 * unit-testable in isolation. No hooks, no JSX, no side effects. NaN-dimension recovery
 * (`resolveValidDimensions`) lives in `@/app/utils/contentRendererUtils` and is shared with the
 * generic content renderer.
 */

import { type CollectionInfoOptions } from '@/app/components/ContentCollection/CollectionFilterContext';
import { type ToolbarDimension } from '@/app/components/ui/FilterToolbar/FilterToolbar';
import { type ContentType, type ViewableContent } from '@/app/types/Content';
import { type ArrayFilterKey } from '@/app/types/GalleryFilter';

/**
 * Maps the collection page's CollectionInfoOptions (per-dimension `filterable`
 * + values) into the toolbar's `dimensions` config. Only filterable dimensions
 * with at least one value become dropdowns; lens names and lens-type chips are
 * surfaced as separate dropdowns (types carry display labels).
 */
export function toCollectionDimensions(
  options: CollectionInfoOptions
): Partial<Record<ArrayFilterKey, ToolbarDimension>> {
  const dims: Partial<Record<ArrayFilterKey, ToolbarDimension>> = {};
  if (options.people.filterable && options.people.values.length > 0) {
    dims.selectedPeople = { label: 'People', options: options.people.values };
  }
  if (options.tags.filterable && options.tags.values.length > 0) {
    dims.selectedTags = { label: 'Tags', options: options.tags.values };
  }
  if (options.cameras.filterable && options.cameras.values.length > 0) {
    dims.selectedCameras = { label: 'Camera', options: options.cameras.values };
  }
  if (options.locations.filterable && options.locations.values.length > 0) {
    dims.selectedLocations = { label: 'Location', options: options.locations.values };
  }
  if (
    (options.lenses.filterable && options.lenses.values.length > 0) ||
    (options.lensTypes.filterable && options.lensTypes.values.length > 0)
  ) {
    // Lens is surfaced as two dropdowns: NAMES and TYPES.
    dims.selectedLenses = {
      label: 'Lens',
      options: options.lenses.values,
    };
    if (options.lensTypes.values.length > 0) {
      dims.selectedLensTypes = {
        label: 'Lens type',
        options: options.lensTypes.values,
        optionLabels: { wide: 'Wide', normal: 'Normal', telephoto: 'Telephoto' },
      };
    }
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
}

/** Whether an item navigates via href (`isSlugNav`) and/or has a meaningful click action. */
export interface ClickEligibility {
  hasClickHandler: boolean;
  isSlugNav: boolean;
}

/**
 * Derive click eligibility for a content item. COLLECTION tiles navigate via href; IMAGE/GIF
 * fullscreen stays on `onClick`. TEXT and reorder mode produce no action; slug-only navigation
 * fires when `hasSlug` is set and no `onImageClick` is present; otherwise a handler exists when
 * `onImageClick` or fullscreen is configured.
 */
export function getClickEligibility(input: ClickEligibilityInput): ClickEligibility {
  const {
    contentType,
    isReorderMode,
    hasSlug,
    onImageClick,
    enableFullScreenView,
    onFullScreenImageClick,
  } = input;

  const isSlugNav = !!hasSlug && !onImageClick && !isReorderMode && contentType !== 'TEXT';

  const hasClickHandler =
    contentType !== 'TEXT' &&
    !isReorderMode &&
    ((hasSlug !== undefined && !onImageClick) ||
      !!onImageClick ||
      !!(enableFullScreenView && onFullScreenImageClick));

  return { hasClickHandler, isSlugNav };
}
