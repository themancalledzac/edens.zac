import { useCallback, useMemo, useState } from 'react';

import { type ViewableContent } from '@/app/types/Content';
import { type FilterState } from '@/app/types/GalleryFilter';
import {
  applyActiveOverride,
  computeFilterCounts,
  computeFilterVisibility,
  type ContentFilterCriteria,
  extractFilterOptions,
  filterContent,
  type FilterCounts,
  type FilterVisibility,
  isImageContent,
} from '@/app/utils/contentFilter';
import { logger } from '@/app/utils/logger';
import { sortByDate } from '@/app/utils/sortByDate';

import { useFilterUrlState } from './useFilterUrlState';

const EMPTY_COUNTS: FilterCounts = {
  highlyRated: 0,
  film: 0,
  digital: 0,
  collections: {},
  tags: {},
  people: {},
  cameras: {},
  lenses: {},
  filmTypes: {},
  locations: {},
};

interface FilteredImagePage {
  filterState: FilterState;
  handleFilterChange: (update: Partial<FilterState>) => void;
  availableOptions: ReturnType<typeof extractFilterOptions>;
  visibility: FilterVisibility;
  filterCounts: FilterCounts;
  filteredContent: ViewableContent[];
}

/**
 * Filter state, URL sync and derived data shared by the image-corpus pages (search, location).
 *
 * Seeds state from the URL via `seedState`, and writes every change back with
 * `syncToUrl(buildCriteria(next))` inside the setState updater so the live filter and the URL are
 * built by one function. Visibility is computed from the image items only, but `filteredContent`
 * keeps non-image items; a caller that wants images alone narrows it. `dateSortDirection` has no
 * URL key and stays local. A throwing `computeFilterCounts` is logged and replaced by zeroed counts.
 */
export function useFilteredImagePage(
  images: ViewableContent[],
  buildCriteria: (state: FilterState) => ContentFilterCriteria,
  seedState: (initial: ContentFilterCriteria) => FilterState
): FilteredImagePage {
  const { initialCriteria, syncToUrl } = useFilterUrlState();

  const [filterState, setFilterState] = useState<FilterState>(() => seedState(initialCriteria));

  const availableOptions = useMemo(() => extractFilterOptions(images), [images]);

  const baseVisibility = useMemo(
    () => computeFilterVisibility(images.filter(isImageContent)),
    [images]
  );
  const visibility = useMemo(
    () => applyActiveOverride(baseVisibility, filterState),
    [baseVisibility, filterState]
  );

  const criteria = useMemo(() => buildCriteria(filterState), [buildCriteria, filterState]);

  const filteredContent = useMemo(() => {
    const filtered = filterContent(images, criteria) as ViewableContent[];
    if (filterState.dateSortDirection === 'off') return filtered;
    return sortByDate(filtered, filterState.dateSortDirection);
  }, [images, criteria, filterState.dateSortDirection]);

  const filterCounts = useMemo(() => {
    try {
      return computeFilterCounts(images, criteria, availableOptions);
    } catch (error) {
      logger.error('useFilteredImagePage', 'Failed to compute filter counts', error);
      return EMPTY_COUNTS;
    }
  }, [images, criteria, availableOptions]);

  const handleFilterChange = useCallback(
    (update: Partial<FilterState>) => {
      setFilterState(prev => {
        const next = { ...prev, ...update };
        syncToUrl(buildCriteria(next));
        return next;
      });
    },
    [syncToUrl, buildCriteria]
  );

  return {
    filterState,
    handleFilterChange,
    availableOptions,
    visibility,
    filterCounts,
    filteredContent,
  };
}
