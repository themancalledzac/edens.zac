/**
 * Shared filter state for gallery pages (location, tag, search, etc.)
 * Designed to be reused across any image gallery view.
 */
export interface GalleryFilterState {
  dateSortDirection: 'asc' | 'desc' | 'off';
  highlyRatedOnly: boolean;
  /** 'film' = film only, 'digital' = digital only, 'off' = no filter */
  filmFilter: 'film' | 'digital' | 'off';
  selectedCollectionIds: number[];
  selectedTags: string[];
  selectedPeople: string[];
}

export const INITIAL_GALLERY_FILTER_STATE: GalleryFilterState = {
  dateSortDirection: 'off',
  highlyRatedOnly: false,
  filmFilter: 'off',
  selectedCollectionIds: [],
  selectedTags: [],
  selectedPeople: [],
};
