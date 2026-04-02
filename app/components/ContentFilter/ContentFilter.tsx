'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState, useTransition } from 'react';

import { type AnyContentModel } from '@/app/types/Content';
import {
  type ContentFilterCriteria,
  extractFilterOptions,
  filterContent,
  parseFilterFromParams,
  serializeFilterToParams,
} from '@/app/utils/contentFilter';

import styles from './ContentFilter.module.scss';

interface ContentFilterProps {
  /** Full content array (before filtering) */
  content: AnyContentModel[];
  /** Callback with filtered content whenever filters change */
  onFilterChange: (filtered: AnyContentModel[]) => void;
  /** Variant: 'inline' for collection header, 'bar' for search page */
  variant?: 'inline' | 'bar';
  /** Whether to show the text search input */
  showTextSearch?: boolean;
  /** Whether to show date range inputs */
  showDateRange?: boolean;
}

/**
 * Content Filter Component
 *
 * Client-side filter panel for content arrays. Reads filter state from URL
 * search params and writes changes back to URL for shareability/bookmarkability.
 *
 * Two variants:
 * - 'inline': Collapsible panel in collection header (toggle button + dropdown)
 * - 'bar': Always-visible filter bar for the search page
 *
 * @param content - Full unfiltered content array
 * @param onFilterChange - Called with filtered results whenever criteria change
 * @param variant - Display variant ('inline' or 'bar')
 * @param showTextSearch - Whether to show text search input
 * @param showDateRange - Whether to show date range filter
 */
export default function ContentFilter({
  content,
  onFilterChange,
  variant = 'inline',
  showTextSearch = false,
  showDateRange = false,
}: ContentFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [isOpen, setIsOpen] = useState(variant === 'bar');

  const criteria = useMemo(() => parseFilterFromParams(searchParams), [searchParams]);

  const options = useMemo(() => extractFilterOptions(content), [content]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (criteria.minRating !== undefined) count++;
    if (criteria.people && criteria.people.length > 0) count++;
    if (criteria.locations && criteria.locations.length > 0) count++;
    if (criteria.tags && criteria.tags.length > 0) count++;
    if (criteria.cameras && criteria.cameras.length > 0) count++;
    if (criteria.query) count++;
    if (criteria.dateFrom || criteria.dateTo) count++;
    return count;
  }, [criteria]);

  /** Updates URL params and notifies parent with filtered results. */
  const updateFilter = useCallback(
    (newCriteria: ContentFilterCriteria) => {
      const params = serializeFilterToParams(newCriteria);
      const paramString = params.toString();
      const newUrl = paramString ? `${pathname}?${paramString}` : pathname;

      startTransition(() => {
        router.replace(newUrl, { scroll: false });
      });

      const filtered = filterContent(content, newCriteria);
      onFilterChange(filtered);
    },
    [content, onFilterChange, pathname, router]
  );

  /** Toggles a value in a multi-value filter (people, locations, tags, cameras). */
  const toggleArrayFilter = useCallback(
    (key: 'people' | 'locations' | 'tags' | 'cameras', value: string) => {
      const current = criteria[key] ?? [];
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      updateFilter({ ...criteria, [key]: next.length > 0 ? next : undefined });
    },
    [criteria, updateFilter]
  );

  const setRating = useCallback(
    (rating: number | undefined) => {
      updateFilter({ ...criteria, minRating: rating });
    },
    [criteria, updateFilter]
  );

  const setQuery = useCallback(
    (query: string) => {
      updateFilter({ ...criteria, query: query || undefined });
    },
    [criteria, updateFilter]
  );

  const setDateRange = useCallback(
    (from: string | undefined, to: string | undefined) => {
      updateFilter({ ...criteria, dateFrom: from, dateTo: to });
    },
    [criteria, updateFilter]
  );

  const clearFilters = useCallback(() => {
    updateFilter({});
  }, [updateFilter]);

  const hasFilterableContent =
    options.ratings.length > 0 ||
    options.people.length > 0 ||
    options.locations.length > 1 ||
    options.tags.length > 0 ||
    options.cameras.length > 1;

  if (!hasFilterableContent && !showTextSearch) return null;

  const filterPanel = (
    <div className={`${styles.filterPanel} ${variant === 'bar' ? styles.filterPanelBar : ''}`}>
      {showTextSearch && (
        <div className={styles.filterSection}>
          <div className={styles.searchInputWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search images..."
              value={criteria.query ?? ''}
              onChange={e => setQuery(e.target.value)}
              className={styles.searchInput}
            />
            {criteria.query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className={styles.clearInputButton}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {options.ratings.length > 0 && (
        <div className={styles.filterSection}>
          <span className={styles.filterLabel}>Min Rating</span>
          <div className={styles.filterChips}>
            {[5, 4, 3, 2, 1].map(star => (
              <button
                key={star}
                type="button"
                className={`${styles.chip} ${criteria.minRating === star ? styles.chipActive : ''}`}
                onClick={() => setRating(criteria.minRating === star ? undefined : star)}
              >
                {star}+
              </button>
            ))}
          </div>
        </div>
      )}

      {options.people.length > 0 && (
        <div className={styles.filterSection}>
          <span className={styles.filterLabel}>People</span>
          <div className={styles.filterChips}>
            {options.people.map(person => (
              <button
                key={person}
                type="button"
                className={`${styles.chip} ${criteria.people?.includes(person) ? styles.chipActive : ''}`}
                onClick={() => toggleArrayFilter('people', person)}
              >
                {person}
              </button>
            ))}
          </div>
        </div>
      )}

      {options.locations.length > 1 && (
        <div className={styles.filterSection}>
          <span className={styles.filterLabel}>Location</span>
          <div className={styles.filterChips}>
            {options.locations.map(location => (
              <button
                key={location}
                type="button"
                className={`${styles.chip} ${criteria.locations?.includes(location) ? styles.chipActive : ''}`}
                onClick={() => toggleArrayFilter('locations', location)}
              >
                {location}
              </button>
            ))}
          </div>
        </div>
      )}

      {options.tags.length > 0 && (
        <div className={styles.filterSection}>
          <span className={styles.filterLabel}>Tags</span>
          <div className={styles.filterChips}>
            {options.tags.map(tag => (
              <button
                key={tag}
                type="button"
                className={`${styles.chip} ${criteria.tags?.includes(tag) ? styles.chipActive : ''}`}
                onClick={() => toggleArrayFilter('tags', tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {options.cameras.length > 1 && (
        <div className={styles.filterSection}>
          <span className={styles.filterLabel}>Camera</span>
          <div className={styles.filterChips}>
            {options.cameras.map(camera => (
              <button
                key={camera}
                type="button"
                className={`${styles.chip} ${criteria.cameras?.includes(camera) ? styles.chipActive : ''}`}
                onClick={() => toggleArrayFilter('cameras', camera)}
              >
                {camera}
              </button>
            ))}
          </div>
        </div>
      )}

      {showDateRange && (
        <div className={styles.filterSection}>
          <span className={styles.filterLabel}>Date Range</span>
          <div className={styles.dateRangeInputs}>
            <input
              type="date"
              value={criteria.dateFrom ?? ''}
              onChange={e => setDateRange(e.target.value || undefined, criteria.dateTo)}
              className={styles.dateInput}
              aria-label="Date from"
            />
            <span className={styles.dateSeparator}>to</span>
            <input
              type="date"
              value={criteria.dateTo ?? ''}
              onChange={e => setDateRange(criteria.dateFrom, e.target.value || undefined)}
              className={styles.dateInput}
              aria-label="Date to"
            />
          </div>
        </div>
      )}

      {activeFilterCount > 0 && (
        <div className={styles.filterActions}>
          <button type="button" onClick={clearFilters} className={styles.clearButton}>
            Clear all filters
          </button>
          {isPending && <span className={styles.pendingIndicator}>Updating...</span>}
        </div>
      )}
    </div>
  );

  if (variant === 'bar') {
    return <div className={styles.filterContainer}>{filterPanel}</div>;
  }

  return (
    <div className={styles.filterContainer}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={styles.filterToggle}
        aria-expanded={isOpen}
        aria-controls="content-filter-panel"
      >
        <SlidersHorizontal size={16} />
        <span>Filter</span>
        {activeFilterCount > 0 && <span className={styles.filterBadge}>{activeFilterCount}</span>}
      </button>
      {isOpen && (
        <div id="content-filter-panel" className={styles.filterDropdown}>
          {filterPanel}
        </div>
      )}
    </div>
  );
}
