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
