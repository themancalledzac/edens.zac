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
  people?: readonly string[];
  /** Location names to include (OR logic) */
  locations?: readonly string[];
  /** Tag names to include (OR logic) */
  tags?: readonly string[];
  /** Camera names to include (OR logic) */
  cameras?: readonly string[];
  /** Free-text search (matches title, caption, tags, people, location) */
  query?: string;
  /** Date range start (ISO string, inclusive) */
  dateFrom?: string;
  /** Date range end (ISO string, inclusive) */
  dateTo?: string;
  /** Filter to film images only */
  isFilm?: boolean;
  /** Filter to black & white images only */
  blackAndWhite?: boolean;
  /** Collection IDs to include (OR logic — matches if image belongs to ANY of these) */
  collectionIds?: readonly number[];
}

/**
 * Type guard: checks if a content model is an image (IMAGE type with image metadata)
 */
export function isImageContent(content: AnyContentModel): content is ContentImageModel {
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
    // Include the entire end date by comparing to end of day (UTC)
    to.setUTCHours(23, 59, 59, 999);
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
    criteria.dateTo !== undefined ||
    criteria.isFilm !== undefined ||
    criteria.blackAndWhite !== undefined ||
    (criteria.collectionIds && criteria.collectionIds.length > 0);

  if (!hasActiveFilters) return content;

  return content.filter(item => {
    if (!isImageContent(item)) return false;

    if (criteria.minRating !== undefined) {
      const rating = item.rating ?? 0;
      if (rating < criteria.minRating) return false;
    }

    if (criteria.people && criteria.people.length > 0) {
      const imagePersonNames = item.people?.map(p => p.name.toLowerCase()) ?? [];
      const matchesPerson = criteria.people.some(name =>
        imagePersonNames.includes(name.toLowerCase())
      );
      if (!matchesPerson) return false;
    }

    if (criteria.locations && criteria.locations.length > 0) {
      const imageLocation = item.location?.name?.toLowerCase() ?? '';
      const matchesLocation = criteria.locations.some(
        loc => loc.toLowerCase() === imageLocation
      );
      if (!matchesLocation) return false;
    }

    if (criteria.tags && criteria.tags.length > 0) {
      const imageTagNames = item.tags?.map(t => t.name.toLowerCase()) ?? [];
      const matchesTag = criteria.tags.some(tag =>
        imageTagNames.includes(tag.toLowerCase())
      );
      if (!matchesTag) return false;
    }

    if (criteria.cameras && criteria.cameras.length > 0) {
      const imageCameraName = item.camera?.name?.toLowerCase() ?? '';
      const matchesCamera = criteria.cameras.some(
        cam => cam.toLowerCase() === imageCameraName
      );
      if (!matchesCamera) return false;
    }

    if (criteria.query && criteria.query.trim().length > 0 && !imageMatchesQuery(item, criteria.query.trim())) {
      return false;
    }

    if ((criteria.dateFrom || criteria.dateTo) && !isWithinDateRange(item.captureDate, criteria.dateFrom, criteria.dateTo)) {
      return false;
    }

    if (criteria.isFilm !== undefined && (item.isFilm ?? false) !== criteria.isFilm) {
      return false;
    }

    if (criteria.blackAndWhite !== undefined && (item.blackAndWhite ?? false) !== criteria.blackAndWhite) {
      return false;
    }

    if (criteria.collectionIds && criteria.collectionIds.length > 0) {
      const imageCollectionIds = item.collections?.map(c => c.collectionId) ?? [];
      const matchesCollection = criteria.collectionIds.some(id =>
        imageCollectionIds.includes(id)
      );
      if (!matchesCollection) return false;
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
export interface ContentFilterOptions {
  ratings: number[];
  people: string[];
  locations: string[];
  tags: string[];
  cameras: string[];
  collections: Array<{ id: number; name: string }>;
  hasFilm: boolean;
  hasDigital: boolean;
  hasBW: boolean;
  hasColor: boolean;
}

export function extractFilterOptions(content: AnyContentModel[]): ContentFilterOptions {
  const ratingsSet = new Set<number>();
  const peopleSet = new Set<string>();
  const locationsSet = new Set<string>();
  const tagFrequency = new Map<string, number>();
  const camerasSet = new Set<string>();
  const collectionsMap = new Map<number, string>();
  let hasFilm = false;
  let hasDigital = false;
  let hasBW = false;
  let hasColor = false;

  for (const item of content) {
    if (!isImageContent(item)) continue;

    if (item.rating !== undefined && item.rating !== null) {
      ratingsSet.add(item.rating);
    }

    for (const p of item.people ?? []) peopleSet.add(p.name);

    if (item.location?.name) {
      locationsSet.add(item.location.name);
    }

    for (const t of item.tags ?? []) {
      tagFrequency.set(t.name, (tagFrequency.get(t.name) ?? 0) + 1);
    }

    if (item.camera?.name) {
      camerasSet.add(item.camera.name);
    }

    for (const c of item.collections ?? []) {
      if (c.collectionId && c.name) {
        collectionsMap.set(c.collectionId, c.name);
      }
    }

    if (item.isFilm) hasFilm = true;
    else hasDigital = true;

    if (item.blackAndWhite) hasBW = true;
    else hasColor = true;
  }

  return {
    ratings: Array.from(ratingsSet).sort((a, b) => b - a),
    people: Array.from(peopleSet).sort(),
    locations: Array.from(locationsSet).sort(),
    tags: Array.from(tagFrequency.entries())
      .sort(([nameA, freqA], [nameB, freqB]) => freqB - freqA || nameA.localeCompare(nameB))
      .slice(0, 10)
      .map(([name]) => name),
    cameras: Array.from(camerasSet).sort(),
    collections: Array.from(collectionsMap, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    ),
    hasFilm,
    hasDigital,
    hasBW,
    hasColor,
  };
}

/**
 * Per-option image counts for filter chips, computed contextually.
 * Each count represents: "how many images match if I select only this option
 * in this dimension, while keeping all other active filters?"
 */
export interface FilterCounts {
  highlyRated: number;
  film: number;
  digital: number;
  collections: Record<number, number>;
  tags: Record<string, number>;
  people: Record<string, number>;
}

/**
 * Compute contextual filter counts for each filterable option.
 *
 * For each dimension, strips that dimension from the current criteria, then
 * counts how many images would match with that specific value applied.
 * This answers: "if I toggle this chip, how many results will I see?"
 *
 * Uses one filterContent call per dimension (5 passes total, not N×M), so each
 * count reflects the intersection of all other active filters while ignoring its
 * own dimension.
 *
 * @param content - Full unfiltered content array
 * @param criteria - Currently active filter criteria
 * @param availableOptions - All available options (from extractFilterOptions)
 * @returns Counts per option across all filter dimensions
 */
export function computeFilterCounts(
  content: AnyContentModel[],
  criteria: ContentFilterCriteria,
  availableOptions: ContentFilterOptions,
): FilterCounts {
  const { minRating: _mr, ...withoutRating } = criteria;
  const { isFilm: _if, ...withoutFilm } = criteria;
  const { collectionIds: _cids, ...withoutCollections } = criteria;
  const { tags: _tags, ...withoutTags } = criteria;
  const { people: _people, ...withoutPeople } = criteria;

  const baseWithoutRating = filterContent(content, withoutRating);
  const baseWithoutFilm = filterContent(content, withoutFilm);
  const baseWithoutCollections = filterContent(content, withoutCollections);
  const baseWithoutTags = filterContent(content, withoutTags);
  const baseWithoutPeople = filterContent(content, withoutPeople);

  let highlyRated = 0;
  for (const item of baseWithoutRating) {
    if (isImageContent(item) && (item.rating ?? 0) >= 4) highlyRated++;
  }

  let film = 0;
  let digital = 0;
  for (const item of baseWithoutFilm) {
    if (!isImageContent(item)) continue;
    if (item.isFilm) film++;
    else digital++;
  }

  const collections: Record<number, number> = {};
  for (const col of availableOptions.collections) collections[col.id] = 0;
  for (const item of baseWithoutCollections) {
    if (!isImageContent(item)) continue;
    for (const c of item.collections ?? []) {
      if (c.collectionId in collections) collections[c.collectionId] = (collections[c.collectionId] ?? 0) + 1;
    }
  }

  const tags: Record<string, number> = {};
  for (const tag of availableOptions.tags) tags[tag] = 0;
  for (const item of baseWithoutTags) {
    if (!isImageContent(item)) continue;
    for (const t of item.tags ?? []) {
      if (t.name in tags) tags[t.name] = (tags[t.name] ?? 0) + 1;
    }
  }

  const people: Record<string, number> = {};
  for (const person of availableOptions.people) people[person] = 0;
  for (const item of baseWithoutPeople) {
    if (!isImageContent(item)) continue;
    for (const p of item.people ?? []) {
      if (p.name in people) people[p.name] = (people[p.name] ?? 0) + 1;
    }
  }

  return { highlyRated, film, digital, collections, tags, people };
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

  const isFilm = get('isFilm');
  if (isFilm === 'true') criteria.isFilm = true;
  else if (isFilm === 'false') criteria.isFilm = false;

  const bw = get('bw');
  if (bw === 'true') criteria.blackAndWhite = true;
  else if (bw === 'false') criteria.blackAndWhite = false;

  const collectionIds = getAll('collection')
    .map(v => Number.parseInt(v, 10))
    .filter(n => !Number.isNaN(n));
  if (collectionIds.length > 0) criteria.collectionIds = collectionIds;

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

  if (criteria.isFilm !== undefined) params.set('isFilm', String(criteria.isFilm));
  if (criteria.blackAndWhite !== undefined) params.set('bw', String(criteria.blackAndWhite));
  for (const id of criteria.collectionIds ?? []) params.append('collection', String(id));

  return params;
}
