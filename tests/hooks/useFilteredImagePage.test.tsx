/**
 * Tests for useFilteredImagePage: seeded state, URL sync on change, non-image retention,
 * date sorting and the zeroed-counts fallback.
 */
import { act, renderHook } from '@testing-library/react';

import { useFilteredImagePage } from '@/app/hooks/useFilteredImagePage';
import { type ViewableContent } from '@/app/types/Content';
import { type FilterState, INITIAL_FILTER_STATE } from '@/app/types/GalleryFilter';
import { type ContentFilterCriteria } from '@/app/utils/contentFilter';
import { logger } from '@/app/utils/logger';

const syncToUrlMock = jest.fn();
const initialCriteria: ContentFilterCriteria = { tags: ['sunset'] };

let failCounts = false;

jest.mock('@/app/utils/contentFilter', () => {
  const actual = jest.requireActual('@/app/utils/contentFilter');
  return {
    ...actual,
    computeFilterCounts: (...args: unknown[]) => {
      if (failCounts) throw new Error('boom');
      return actual.computeFilterCounts(...args);
    },
  };
});

jest.mock('@/app/hooks/useFilterUrlState', () => ({
  useFilterUrlState: () => ({ initialCriteria, syncToUrl: syncToUrlMock }),
}));

function image(id: number, captureDate: string, tag: string): ViewableContent {
  return {
    id,
    contentType: 'IMAGE',
    captureDate,
    tags: [{ id, name: tag }],
  } as unknown as ViewableContent;
}

const textBlock = { id: 99, contentType: 'TEXT' } as unknown as ViewableContent;

const images: ViewableContent[] = [
  image(1, '2020-01-01', 'sunset'),
  image(2, '2022-01-01', 'sunset'),
  image(3, '2021-01-01', 'city'),
  textBlock,
];

const seedState = (initial: ContentFilterCriteria): FilterState => ({
  ...INITIAL_FILTER_STATE,
  selectedTags: initial.tags ?? [],
});
const buildCriteria = (state: FilterState): ContentFilterCriteria => ({
  tags: state.selectedTags,
});

describe('useFilteredImagePage', () => {
  beforeEach(() => {
    syncToUrlMock.mockClear();
  });

  it('seeds the filter state from the URL criteria', () => {
    const { result } = renderHook(() => useFilteredImagePage(images, buildCriteria, seedState));
    expect(result.current.filterState.selectedTags).toEqual(['sunset']);
  });

  it('syncs buildCriteria(next) to the URL on a filter change', () => {
    const { result } = renderHook(() => useFilteredImagePage(images, buildCriteria, seedState));
    act(() => {
      result.current.handleFilterChange({ selectedTags: ['city'] });
    });
    expect(syncToUrlMock).toHaveBeenCalledWith({ tags: ['city'] });
    expect(result.current.filterState.selectedTags).toEqual(['city']);
  });

  it('keeps non-image items in filteredContent when no criteria excludes them', () => {
    const { result } = renderHook(() => useFilteredImagePage(images, buildCriteria, seedState));
    act(() => {
      result.current.handleFilterChange({ selectedTags: [] });
    });
    expect(result.current.filteredContent).toContain(textBlock);
    expect(result.current.filteredContent).toHaveLength(4);
  });

  it('sorts by date unless the direction is off', () => {
    const { result } = renderHook(() => useFilteredImagePage(images, buildCriteria, seedState));
    act(() => {
      result.current.handleFilterChange({ selectedTags: [], dateSortDirection: 'desc' });
    });
    const ids = result.current.filteredContent.map(item => item.id);
    expect(ids.slice(0, 3)).toEqual([2, 3, 1]);
    act(() => {
      result.current.handleFilterChange({ dateSortDirection: 'off' });
    });
    expect(result.current.filteredContent.map(item => item.id)).toEqual([1, 2, 3, 99]);
  });

  it('computes visibility and counts from the images only', () => {
    const { result } = renderHook(() => useFilteredImagePage(images, buildCriteria, seedState));
    expect(result.current.visibility.tags).toBe(true);
    expect(result.current.availableOptions.tags).toEqual(
      expect.arrayContaining(['sunset', 'city'])
    );
    expect(result.current.filterCounts.tags).toBeDefined();
  });

  it('returns zeroed counts and logs when computeFilterCounts throws', () => {
    failCounts = true;
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useFilteredImagePage(images, buildCriteria, seedState));
    expect(result.current.filterCounts).toEqual({
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
    });
    expect(errorSpy).toHaveBeenCalled();
    failCounts = false;
    errorSpy.mockRestore();
  });
});
