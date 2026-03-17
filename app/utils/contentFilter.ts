/**
 * Content Filter Utilities
 *
 * Pure functions for filtering content arrays based on various criteria.
 * Works with any AnyContentModel[] array — used by both collection page filters
 * and the search page.
 *
 * All filter state is designed to be stored in URL search params for shareability.
 */

import { type AnyContentModel, type ContentImageModel } from '@/app/types/Content';

/**
 * Filter criteria for content arrays.
 * Each field is optional — only provided fields are applied.
 * Maps directly to URL search params.
 */
export interface ContentFilterCriteria {
  /** Minimum star rating (1-5) */
  minRating?: number;
  /** People names to include (OR logic — matches if image has ANY of these) */
  people?: string[];
  /** Location names to include (OR logic) */
  locations?: string[];
  /** Tag names to include (OR logic) */
  tags?: string[];
  /** Camera names to include (OR logic) */
  cameras?: string[];
  /** Free-text search (matches title, caption, tags, people, location) */
  query?: string;
  /** Date range start (ISO string, inclusive) */
  dateFrom?: string;
  /** Date range end (ISO string, inclusive) */
  dateTo?: string;
}

/**
 * Type guard: checks if a content model is an image (IMAGE type with image metadata)
 */
function isImageContent(content: AnyContentModel): content is ContentImageModel {
  return content.contentType === 'IMAGE';
}

/**
 * Check if a string matches a query (case-insensitive substring match)
 */
function matchesQuery(value: string | null | undefined, query: string): boolean {
  if (!value) return false;
  return value.toLowerCase().includes(query.toLowerCase());
}

/**
 * Check if an image matches a free-text query.
 * Searches across title, caption, description, tags, people, location, and camera.
 */
function imageMatchesQuery(image: ContentImageModel, query: string): boolean {
  if (matchesQuery(image.title, query)) return true;
  if (matchesQuery(image.caption, query)) return true;
  if (matchesQuery(image.description, query)) return true;
  if (matchesQuery(image.alt, query)) return true;

  // Check location
  if (image.location && matchesQuery(image.location.name, query)) return true;

  // Check camera
  if (image.camera && matchesQuery(image.camera.name, query)) return true;

  // Check tags
  if (image.tags?.some(tag => matchesQuery(tag.name, query))) return true;

  // Check people
  if (image.people?.some(person => matchesQuery(person.name, query))) return true;

  return false;
}

/**
 * Check if a date string falls within a date range.
 */
function isWithinDateRange(
  dateValue: string | null | undefined,
  dateFrom: string | undefined,
  dateTo: string | undefined
): boolean {
  if (!dateValue) return false;
  const date = new Date(dateValue);

  if (dateFrom) {
    const from = new Date(dateFrom);
    if (date < from) return false;
  }
  if (dateTo) {
    const to = new Date(dateTo);
    // Include the entire end date by comparing to end of day
    to.setHours(23, 59, 59, 999);
    if (date > to) return false;
  }
  return true;
}

/**
 * Apply filter criteria to a content array.
 *
 * Non-image content types are excluded when any image-specific filter is active
 * (rating, people, location, tags, camera, query, date range).
 *
 * @param content - Array of content to filter
 * @param criteria - Filter criteria to apply
 * @returns Filtered content array
 */
export function filterContent(
  content: AnyContentModel[],
  criteria: ContentFilterCriteria
): AnyContentModel[] {
  const hasActiveFilters =
    criteria.minRating !== undefined ||
    (criteria.people && criteria.people.length > 0) ||
    (criteria.locations && criteria.locations.length > 0) ||
    (criteria.tags && criteria.tags.length > 0) ||
    (criteria.cameras && criteria.cameras.length > 0) ||
    (criteria.query !== undefined && criteria.query.trim().length > 0) ||
    criteria.dateFrom !== undefined ||
    criteria.dateTo !== undefined;

  if (!hasActiveFilters) return content;

  return content.filter(item => {
    // Non-image content is excluded when image-specific filters are active
    if (!isImageContent(item)) return false;

    // Rating filter
    if (criteria.minRating !== undefined) {
      const rating = item.rating ?? 0;
      if (rating < criteria.minRating) return false;
    }

    // People filter (OR logic)
    if (criteria.people && criteria.people.length > 0) {
      const imagePersonNames = item.people?.map(p => p.name.toLowerCase()) ?? [];
      const matchesPerson = criteria.people.some(name =>
        imagePersonNames.includes(name.toLowerCase())
      );
      if (!matchesPerson) return false;
    }

    // Location filter (OR logic)
    if (criteria.locations && criteria.locations.length > 0) {
      const imageLocation = item.location?.name?.toLowerCase() ?? '';
      const matchesLocation = criteria.locations.some(
        loc => loc.toLowerCase() === imageLocation
      );
      if (!matchesLocation) return false;
    }

    // Tags filter (OR logic)
    if (criteria.tags && criteria.tags.length > 0) {
      const imageTagNames = item.tags?.map(t => t.name.toLowerCase()) ?? [];
      const matchesTag = criteria.tags.some(tag =>
        imageTagNames.includes(tag.toLowerCase())
      );
      if (!matchesTag) return false;
    }

    // Camera filter (OR logic)
    if (criteria.cameras && criteria.cameras.length > 0) {
      const imageCameraName = item.camera?.name?.toLowerCase() ?? '';
      const matchesCamera = criteria.cameras.some(
        cam => cam.toLowerCase() === imageCameraName
      );
      if (!matchesCamera) return false;
    }

    // Free-text query
    if (criteria.query && criteria.query.trim().length > 0 && !imageMatchesQuery(item, criteria.query.trim())) {
      return false;
    }

    // Date range
    if ((criteria.dateFrom || criteria.dateTo) && !isWithinDateRange(item.captureDate, criteria.dateFrom, criteria.dateTo)) {
      return false;
    }

    return true;
  });
}

/**
 * Extract unique filter options from a content array.
 * Used to populate filter dropdowns with available values.
 *
 * @param content - Array of content to extract options from
 * @returns Object with arrays of unique values for each filter dimension
 */
export function extractFilterOptions(content: AnyContentModel[]): {
  ratings: number[];
  people: string[];
  locations: string[];
  tags: string[];
  cameras: string[];
} {
  const ratingsSet = new Set<number>();
  const peopleSet = new Set<string>();
  const locationsSet = new Set<string>();
  const tagsSet = new Set<string>();
  const camerasSet = new Set<string>();

  for (const item of content) {
    if (!isImageContent(item)) continue;

    if (item.rating !== undefined && item.rating !== null) {
      ratingsSet.add(item.rating);
    }

    for (const p of item.people ?? []) peopleSet.add(p.name);

    if (item.location?.name) {
      locationsSet.add(item.location.name);
    }

    for (const t of item.tags ?? []) tagsSet.add(t.name);

    if (item.camera?.name) {
      camerasSet.add(item.camera.name);
    }
  }

  return {
    ratings: Array.from(ratingsSet).sort((a, b) => b - a),
    people: Array.from(peopleSet).sort(),
    locations: Array.from(locationsSet).sort(),
    tags: Array.from(tagsSet).sort(),
    cameras: Array.from(camerasSet).sort(),
  };
}

/**
 * Parse filter criteria from URL search params.
 *
 * @param searchParams - URL search params (from useSearchParams or page props)
 * @returns Parsed filter criteria
 */
export function parseFilterFromParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): ContentFilterCriteria {
  const criteria: ContentFilterCriteria = {};

  const get = (key: string): string | undefined => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) ?? undefined;
    }
    const val = searchParams[key];
    return Array.isArray(val) ? val[0] : val;
  };

  const getAll = (key: string): string[] => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.getAll(key);
    }
    const val = searchParams[key];
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
  };

  const rating = get('rating');
  if (rating) {
    const parsed = Number.parseInt(rating, 10);
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 5) {
      criteria.minRating = parsed;
    }
  }

  const people = getAll('people');
  if (people.length > 0) criteria.people = people;

  const locations = getAll('location');
  if (locations.length > 0) criteria.locations = locations;

  const tags = getAll('tag');
  if (tags.length > 0) criteria.tags = tags;

  const cameras = getAll('camera');
  if (cameras.length > 0) criteria.cameras = cameras;

  const query = get('q');
  if (query) criteria.query = query;

  const dateFrom = get('from');
  if (dateFrom) criteria.dateFrom = dateFrom;

  const dateTo = get('to');
  if (dateTo) criteria.dateTo = dateTo;

  return criteria;
}

/**
 * Serialize filter criteria to URL search params string.
 * Only includes non-empty values.
 *
 * @param criteria - Filter criteria to serialize
 * @returns URLSearchParams object
 */
export function serializeFilterToParams(criteria: ContentFilterCriteria): URLSearchParams {
  const params = new URLSearchParams();

  if (criteria.minRating !== undefined) {
    params.set('rating', String(criteria.minRating));
  }

  for (const p of criteria.people ?? []) params.append('people', p);
  for (const l of criteria.locations ?? []) params.append('location', l);
  for (const t of criteria.tags ?? []) params.append('tag', t);
  for (const c of criteria.cameras ?? []) params.append('camera', c);

  if (criteria.query) params.set('q', criteria.query);
  if (criteria.dateFrom) params.set('from', criteria.dateFrom);
  if (criteria.dateTo) params.set('to', criteria.dateTo);

  return params;
}
