/**
 * Shared filter state for gallery pages (location, tag, search, etc.)
 * Designed to be reused across any image gallery view.
 */
export interface GalleryFilterState {
  dateSortDirection: 'asc' | 'desc' | 'off';
  highlyRatedOnly: boolean;
  /** 'film' = film only, 'digital' = digital only, 'off' = no filter */
  filmFilter: 'film' | 'digital' | 'off';
  readonly selectedCollectionIds: readonly number[];
  readonly selectedTags: readonly string[];
  readonly selectedPeople: readonly string[];
}

export const INITIAL_GALLERY_FILTER_STATE: GalleryFilterState = Object.freeze({
  dateSortDirection: 'off' as const,
  highlyRatedOnly: false,
  filmFilter: 'off' as const,
  selectedCollectionIds: Object.freeze([] as readonly number[]),
  selectedTags: Object.freeze([] as readonly string[]),
  selectedPeople: Object.freeze([] as readonly string[]),
});

/**
 * Filter state for collection detail pages.
 * Simpler than GalleryFilterState — no date sort or film filter.
 * AND logic within and across categories.
 */
export interface CollectionFilterState {
  readonly selectedTags: readonly string[];
  readonly selectedPeople: readonly string[];
  readonly selectedCameras: readonly string[];
  readonly selectedLenses: readonly string[];
  highlyRatedOnly: boolean;
  dateSortDirection: 'asc' | 'desc' | 'off';
  focalLengthRange: readonly [number, number] | null;
}

export const INITIAL_COLLECTION_FILTER_STATE: CollectionFilterState = Object.freeze({
  selectedTags: Object.freeze([] as readonly string[]),
  selectedPeople: Object.freeze([] as readonly string[]),
  selectedCameras: Object.freeze([] as readonly string[]),
  selectedLenses: Object.freeze([] as readonly string[]),
  highlyRatedOnly: false,
  dateSortDirection: 'off' as const,
  focalLengthRange: null,
});
