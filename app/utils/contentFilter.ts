/**
 * Content Filter Utilities
 *
 * Pure functions for filtering content arrays based on various criteria.
 * Works with any AnyContentModel[] array — used by both collection page filters
 * and the search page.
 *
 * All filter state is designed to be stored in URL search params for shareability.
 */

import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import {
  type AnyContentModel,
  type ContentCollectionModel,
  type ContentGifModel,
  type ContentImageModel,
} from '@/app/types/Content';
import { type FilmFilter, type FilterState } from '@/app/types/GalleryFilter';
import { captureDayKey, distinctDays } from '@/app/utils/collectionDates';
import { isCollectionCard } from '@/app/utils/contentRatingUtils';
import { isGifContent } from '@/app/utils/contentTypeGuards';

/**
 * Filter criteria for content arrays.
 * Each field is optional — only provided fields are applied.
 * Maps directly to URL search params.
 */
export interface ContentFilterCriteria {
  /** Minimum star rating (1-5) */
  minRating?: number;
  /** People names to include */
  people?: readonly string[];
  /** Location names to include (OR logic) */
  locations?: readonly string[];
  /** Tag names to include */
  tags?: readonly string[];
  /** Camera names to include */
  cameras?: readonly string[];
  /** Lens names to include */
  lenses?: readonly string[];
  /** Free-text search (matches title, caption, tags, people, location) */
  query?: string;
  /** Date range start (ISO string, inclusive) */
  dateFrom?: string;
  /** Date range end (ISO string, inclusive) */
  dateTo?: string;
  /** Calendar days ('YYYY-MM-DD') to include (OR logic - matches if captured on ANY of these) */
  dates?: readonly string[];
  /** Filter to film images only */
  isFilm?: boolean;
  /** Filter to black & white images only */
  blackAndWhite?: boolean;
  /** Collection IDs to include (OR logic — matches if image belongs to ANY of these) */
  collectionIds?: readonly number[];
  /** Match mode for tags: 'AND' requires all, 'OR' requires any (default: 'OR') */
  tagMatchMode?: 'AND' | 'OR';
  /** Match mode for people: 'AND' requires all, 'OR' requires any (default: 'OR') */
  peopleMatchMode?: 'AND' | 'OR';
  /** Match mode for cameras: 'AND' requires all, 'OR' requires any (default: 'OR') */
  cameraMatchMode?: 'AND' | 'OR';
  /** Match mode for lenses: 'AND' requires all, 'OR' requires any (default: 'OR') */
  lensMatchMode?: 'AND' | 'OR';
}

/**
 * Type guard: checks if a content model is an image (IMAGE type with image metadata)
 */
export function isImageContent(content: AnyContentModel): content is ContentImageModel {
  return content.contentType === 'IMAGE';
}

/**
 * Type guard: checks if a content model is a collection reference (COLLECTION type).
 * Local helper so contentFilter doesn't depend on contentTypeGuards (avoids cycle).
 */
function isCollectionRef(content: AnyContentModel): content is ContentCollectionModel {
  return content.contentType === 'COLLECTION';
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

  // Check locations
  if (image.locations?.some(loc => matchesQuery(loc.name, query))) return true;

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
    (criteria.lenses && criteria.lenses.length > 0) ||
    (criteria.query !== undefined && criteria.query.trim().length > 0) ||
    criteria.dateFrom !== undefined ||
    criteria.dateTo !== undefined ||
    (criteria.dates && criteria.dates.length > 0) ||
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
      const matcher = criteria.peopleMatchMode === 'AND' ? 'every' : 'some';
      const matchesPerson = criteria.people[matcher](name =>
        imagePersonNames.includes(name.toLowerCase())
      );
      if (!matchesPerson) return false;
    }

    if (criteria.locations && criteria.locations.length > 0) {
      const imageLocationNames = item.locations?.map(l => l.name.toLowerCase()) ?? [];
      const matchesLocation = criteria.locations.some(loc =>
        imageLocationNames.includes(loc.toLowerCase())
      );
      if (!matchesLocation) return false;
    }

    if (criteria.tags && criteria.tags.length > 0) {
      const imageTagNames = item.tags?.map(t => t.name.toLowerCase()) ?? [];
      const matcher = criteria.tagMatchMode === 'AND' ? 'every' : 'some';
      const matchesTag = criteria.tags[matcher](tag => imageTagNames.includes(tag.toLowerCase()));
      if (!matchesTag) return false;
    }

    if (criteria.cameras && criteria.cameras.length > 0) {
      const imageCameraName = item.camera?.name?.toLowerCase() ?? '';
      const matcher = criteria.cameraMatchMode === 'AND' ? 'every' : 'some';
      const matchesCamera = criteria.cameras[matcher](cam => cam.toLowerCase() === imageCameraName);
      if (!matchesCamera) return false;
    }

    if (criteria.lenses && criteria.lenses.length > 0) {
      const imageLensName = item.lens?.name?.toLowerCase() ?? '';
      const matcher = criteria.lensMatchMode === 'AND' ? 'every' : 'some';
      const matchesLens = criteria.lenses[matcher](lens => lens.toLowerCase() === imageLensName);
      if (!matchesLens) return false;
    }

    if (
      criteria.query &&
      criteria.query.trim().length > 0 &&
      !imageMatchesQuery(item, criteria.query.trim())
    ) {
      return false;
    }

    if (
      (criteria.dateFrom || criteria.dateTo) &&
      !isWithinDateRange(item.captureDate, criteria.dateFrom, criteria.dateTo)
    ) {
      return false;
    }

    if (criteria.dates && criteria.dates.length > 0) {
      const day = captureDayKey(item.captureDate);
      if (!day || !criteria.dates.includes(day)) return false;
    }

    if (criteria.isFilm !== undefined && (item.isFilm ?? false) !== criteria.isFilm) {
      return false;
    }

    if (
      criteria.blackAndWhite !== undefined &&
      (item.blackAndWhite ?? false) !== criteria.blackAndWhite
    ) {
      return false;
    }

    if (criteria.collectionIds && criteria.collectionIds.length > 0) {
      const imageCollectionIds = item.collections?.map(c => c.collectionId) ?? [];
      const matchesCollection = criteria.collectionIds.some(id => imageCollectionIds.includes(id));
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
  lenses: string[];
  collections: Array<{ id: number; name: string }>;
  hasFilm: boolean;
  hasDigital: boolean;
  hasBW: boolean;
  hasColor: boolean;
}

/**
 * @param content - Array of content to extract options from
 * @param tagExclusionRatio - Exclude tags appearing on >= this ratio of images (0-1). Default: no exclusion.
 */
export function extractFilterOptions(
  content: AnyContentModel[],
  tagExclusionRatio?: number
): ContentFilterOptions {
  const ratingsSet = new Set<number>();
  const peopleSet = new Set<string>();
  const locationsSet = new Set<string>();
  const tagFrequency = new Map<string, number>();
  const camerasSet = new Set<string>();
  const lensesSet = new Set<string>();
  const collectionsMap = new Map<number, string>();
  let hasFilm = false;
  let hasDigital = false;
  let hasBW = false;
  let hasColor = false;

  for (const item of content) {
    if (isCollectionRef(item)) {
      // Aggregate filter dimensions from collection refs when the backend
      // populates them (forward-compat: today the fields may be undefined).
      // This is what makes the filter bar populate on synthetic PARENT pages
      // (e.g. /all-collections, /all-blog) where every block is a collection.
      for (const p of item.people ?? []) peopleSet.add(p.name);
      for (const loc of item.locations ?? []) {
        if (loc.name) locationsSet.add(loc.name);
      }
      for (const t of item.tags ?? []) {
        tagFrequency.set(t.name, (tagFrequency.get(t.name) ?? 0) + 1);
      }
      continue;
    }

    if (!isImageContent(item)) continue;

    if (item.rating !== undefined && item.rating !== null) {
      ratingsSet.add(item.rating);
    }

    for (const p of item.people ?? []) peopleSet.add(p.name);

    for (const loc of item.locations ?? []) {
      if (loc.name) locationsSet.add(loc.name);
    }

    for (const t of item.tags ?? []) {
      tagFrequency.set(t.name, (tagFrequency.get(t.name) ?? 0) + 1);
    }

    if (item.camera?.name) {
      camerasSet.add(item.camera.name);
    }

    if (item.lens?.name) {
      lensesSet.add(item.lens.name);
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

  const imageCount = content.filter(isImageContent).length;
  const exclusionThreshold =
    tagExclusionRatio !== undefined && imageCount > 0 ? imageCount * tagExclusionRatio : Infinity;

  return {
    ratings: Array.from(ratingsSet).sort((a, b) => b - a),
    people: Array.from(peopleSet).sort(),
    locations: Array.from(locationsSet).sort(),
    tags: Array.from(tagFrequency.entries())
      .filter(([, freq]) => freq < exclusionThreshold)
      .sort(([nameA, freqA], [nameB, freqB]) => freqB - freqA || nameA.localeCompare(nameB))
      .slice(0, 10)
      .map(([name]) => name),
    cameras: Array.from(camerasSet).sort(),
    lenses: Array.from(lensesSet).sort(),
    collections: Array.from(collectionsMap, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    ),
    hasFilm,
    hasDigital,
    hasBW,
    hasColor,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// The single filter-visibility gate — {@link canFilter}
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Whether a dimension can meaningfully filter the given items.
 *
 * @param items - The full, unfiltered item set. Visibility MUST be derived from
 *   the full set, never a filtered subset, or a control could vanish mid-interaction.
 * @param valuesOf - The dimension's projection: the value(s) an item contributes.
 */
export function canFilter<T>(
  items: readonly T[],
  valuesOf: (item: T) => readonly string[]
): boolean {
  const total = items.length;
  if (total < 2) return false;
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const value of new Set(valuesOf(item))) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  for (const count of counts.values()) {
    if (count < total) return true;
  }
  return false;
}

/** Per-dimension verdict from the single gate ({@link canFilter}). */
export interface FilterVisibility {
  dateSort: boolean;
  highlyRated: boolean;
  film: boolean;
  tags: boolean;
  people: boolean;
  cameras: boolean;
  lenses: boolean;
  locations: boolean;
}

/**
 * Run the single gate across every image-derived dimension once. Visibility is
 * computed from the FULL image set so controls don't appear/disappear as filters
 * are applied. The projections here are the canonical home for "what value(s)
 * does an image contribute to dimension X".
 */
export function computeFilterVisibility(images: ContentImageModel[]): FilterVisibility {
  return {
    dateSort: canFilter(images, img => (img.captureDate ? [img.captureDate] : [])),
    highlyRated: canFilter(images, img => [(img.rating ?? 0) >= 4 ? 'hi' : 'lo']),
    film: canFilter(images, img => [img.isFilm ? 'film' : 'digital']),
    tags: canFilter(images, img => (img.tags ?? []).map(t => t.name)),
    people: canFilter(images, img => (img.people ?? []).map(p => p.name)),
    cameras: canFilter(images, img => (img.camera?.name ? [img.camera.name] : [])),
    lenses: canFilter(images, img => (img.lens?.name ? [img.lens.name] : [])),
    locations: canFilter(images, img => (img.locations ?? []).map(l => l.name)),
  };
}

/**
 * OR "this filter is currently active" onto a {@link FilterVisibility} verdict so
 * a control is never hidden while it is the active filter — e.g. a `?isFilm=` /
 * `?rating=` deep-link onto a page where the dimension is otherwise trivial.
 * Without this the only way to clear such a filter would be the bulk reset.
 */
export function applyActiveOverride(
  visibility: FilterVisibility,
  filterState: FilterState
): FilterVisibility {
  // dateSort and film are included here (unlike hasAnyActiveFilter, which scopes
  // to content-reducing collection filters) because this is a visibility concern:
  // if a control's filter is active, keep the control on screen so it can be cleared.
  return {
    dateSort: visibility.dateSort || filterState.dateSortDirection !== 'off',
    highlyRated: visibility.highlyRated || filterState.highlyRatedOnly,
    film: visibility.film || filterState.filmFilter !== 'off',
    tags: visibility.tags || filterState.selectedTags.length > 0,
    people: visibility.people || filterState.selectedPeople.length > 0,
    cameras: visibility.cameras || filterState.selectedCameras.length > 0,
    lenses: visibility.lenses || filterState.selectedLenses.length > 0,
    locations: visibility.locations || filterState.selectedLocations.length > 0,
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
  cameras: Record<string, number>;
  lenses: Record<string, number>;
  locations: Record<string, number>;
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
  availableOptions: ContentFilterOptions
): FilterCounts {
  const { minRating: _mr, ...withoutRating } = criteria;
  const { isFilm: _if, ...withoutFilm } = criteria;
  const { collectionIds: _cids, ...withoutCollections } = criteria;
  const { tags: _tags, tagMatchMode: _tm, ...withoutTags } = criteria;
  const { people: _people, peopleMatchMode: _pm, ...withoutPeople } = criteria;
  const { cameras: _cameras, cameraMatchMode: _cm, ...withoutCameras } = criteria;
  const { lenses: _lenses, lensMatchMode: _lm, ...withoutLenses } = criteria;
  const { locations: _locations, ...withoutLocations } = criteria;

  const baseWithoutRating = filterContent(content, withoutRating);
  const baseWithoutFilm = filterContent(content, withoutFilm);
  const baseWithoutCollections = filterContent(content, withoutCollections);
  const baseWithoutTags = filterContent(content, withoutTags);
  const baseWithoutPeople = filterContent(content, withoutPeople);
  const baseWithoutCameras = filterContent(content, withoutCameras);
  const baseWithoutLenses = filterContent(content, withoutLenses);
  const baseWithoutLocations = filterContent(content, withoutLocations);

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
      if (c.collectionId in collections)
        collections[c.collectionId] = (collections[c.collectionId] ?? 0) + 1;
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

  const cameras: Record<string, number> = {};
  for (const cam of availableOptions.cameras) cameras[cam] = 0;
  for (const item of baseWithoutCameras) {
    if (!isImageContent(item)) continue;
    if (item.camera?.name && item.camera.name in cameras) {
      cameras[item.camera.name] = (cameras[item.camera.name] ?? 0) + 1;
    }
  }

  const lenses: Record<string, number> = {};
  for (const lens of availableOptions.lenses) lenses[lens] = 0;
  for (const item of baseWithoutLenses) {
    if (!isImageContent(item)) continue;
    if (item.lens?.name && item.lens.name in lenses) {
      lenses[item.lens.name] = (lenses[item.lens.name] ?? 0) + 1;
    }
  }

  const locations: Record<string, number> = {};
  for (const loc of availableOptions.locations) locations[loc] = 0;
  for (const item of baseWithoutLocations) {
    if (!isImageContent(item)) continue;
    for (const l of item.locations ?? []) {
      if (l.name in locations) locations[l.name] = (locations[l.name] ?? 0) + 1;
    }
  }

  return { highlyRated, film, digital, collections, tags, people, cameras, lenses, locations };
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

  const dates = getAll('date');
  if (dates.length > 0) criteria.dates = dates;

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
  for (const d of criteria.dates ?? []) params.append('date', d);

  if (criteria.query) params.set('q', criteria.query);
  if (criteria.dateFrom) params.set('from', criteria.dateFrom);
  if (criteria.dateTo) params.set('to', criteria.dateTo);

  if (criteria.isFilm !== undefined) params.set('isFilm', String(criteria.isFilm));
  if (criteria.blackAndWhite !== undefined) params.set('bw', String(criteria.blackAndWhite));
  for (const id of criteria.collectionIds ?? []) params.append('collection', String(id));

  return params;
}

// ─────────────────────────────────────────────────────────────────────────────
// Collection-page filter derivations
//
// Pure helpers consolidated here (rather than forked into a co-located
// *Utils.ts) because they belong to the same filter domain as the functions
// above and share its fixtures/tests. Used by CollectionPageClient (and the
// location/taxonomy pages) so those components read as hooks → helpers → JSX.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A collection needs at least this many images before the per-day date filter is worth showing.
 * Paired with a 2-distinct-day minimum: below this size, splitting by day slices the grid into
 * fragments smaller than a single screen.
 */
export const MIN_IMAGES_FOR_DATE_FILTER = 30;

/** Per-dimension data for the collection filter bar: values + whether it renders as a dropdown. */
export interface FilterDimension<T = string> {
  values: readonly T[];
  filterable: boolean;
}

/**
 * Filter dimensions specific to collection pages — structurally compatible with
 * `CollectionInfoOptions` minus `showHighlyRated`.
 */
export interface CollectionFilterDimensions {
  tags: FilterDimension;
  people: FilterDimension;
  cameras: FilterDimension;
  lenses: FilterDimension;
  locations: FilterDimension;
  dates: FilterDimension;
}

/**
 * Extract filter options specific to collection pages.
 *
 * Returns per-dimension data with a `filterable` flag. When a dimension has a
 * single value and the dimension's policy allows info-mode (cameras / lenses /
 * locations need 2+ values), `filterable` is false so the bar renders it as an
 * inline info chip instead of a dropdown.
 *
 * @param images - Image content to aggregate dimensions from
 * @param collectionRefs - Collection refs (synthetic PARENT pages aggregate from these too)
 * @param datedGifs - GIF/MP4 blocks that carry a captureDate. Contribute ONLY to the `dates`
 *   dimension: a GIF carries no camera or lens, and although ContentGifModel does declare
 *   rating/tags/people/locations, those dimensions have always been sourced from images alone
 *   and this parameter does not change that. See {@link isDateable}, which
 *   already treats dated GIFs as chronologically participating. Without this, a day whose
 *   content is entirely GIFs would have no chip and become unreachable.
 */
export function extractCollectionFilterOptions(
  images: ContentImageModel[],
  collectionRefs: ContentCollectionModel[] = [],
  datedGifs: ContentGifModel[] = []
): CollectionFilterDimensions {
  // Pass images + refs together so extractFilterOptions can aggregate filter
  // dimensions from collection refs too. This is what populates the filter bar
  // on synthetic PARENT pages whose `content` is 100% collection refs and 0
  // images (e.g. /all-collections, /all-blog).
  const combined = [...images, ...collectionRefs];
  const baseOptions = extractFilterOptions(combined, 0.9);

  // Distinct capture days, ascending. See the `dates` gate below for the visibility rule.
  // Dated GIFs contribute their day here only -- MIN_IMAGES_FOR_DATE_FILTER below still counts
  // `images.length` alone, never `images.length + datedGifs.length`.
  const dates = distinctDays([
    ...images.map(img => img.captureDate),
    ...datedGifs.map(gif => gif.captureDate),
  ]);

  // cameras/lenses/locations: need 2+ distinct values AND canFilter (length>=2 alone
  // would wrongly mark a dimension filterable when all values blanket every item).
  return {
    tags: {
      values: baseOptions.tags,
      filterable: canFilter(combined, item => (item.tags ?? []).map(t => t.name)),
    },
    people: {
      values: baseOptions.people,
      filterable: canFilter(combined, item => (item.people ?? []).map(p => p.name)),
    },
    cameras: {
      values: baseOptions.cameras,
      filterable:
        canFilter(images, img => (img.camera?.name ? [img.camera.name] : [])) &&
        baseOptions.cameras.length >= 2,
    },
    lenses: {
      values: baseOptions.lenses,
      filterable:
        canFilter(images, img => (img.lens?.name ? [img.lens.name] : [])) &&
        baseOptions.lenses.length >= 2,
    },
    locations: {
      values: baseOptions.locations,
      filterable:
        canFilter(combined, item => (item.locations ?? []).map(l => l.name)) &&
        baseOptions.locations.length >= 2,
    },
    dates: {
      values: dates,
      // Exactly two conditions: 2+ distinct capture days, and enough images that splitting
      // by day is worthwhile. `canFilter` is intentionally NOT part of this gate: a capture
      // day is single-valued per image, so whenever `dates.length >= 2` at least two distinct
      // days are present and no single day's count can equal the total -- canFilter would
      // already be guaranteed true here, making it redundant.
      filterable: dates.length >= 2 && images.length >= MIN_IMAGES_FOR_DATE_FILTER,
    },
  };
}

/**
 * Build filter criteria from a collection page's filter state — all-AND match
 * mode. Single source of truth for both the live filter and the URL sync (the
 * `lenses` key has no URL param, so it is silently dropped by
 * {@link serializeFilterToParams}).
 */
export function buildCollectionCriteria(filterState: FilterState): ContentFilterCriteria {
  return {
    ...(filterState.highlyRatedOnly ? { minRating: 4 } : {}),
    ...(filterState.selectedTags.length > 0
      ? { tags: filterState.selectedTags, tagMatchMode: 'AND' as const }
      : {}),
    ...(filterState.selectedPeople.length > 0
      ? { people: filterState.selectedPeople, peopleMatchMode: 'AND' as const }
      : {}),
    ...(filterState.selectedCameras.length > 0
      ? { cameras: filterState.selectedCameras, cameraMatchMode: 'AND' as const }
      : {}),
    ...(filterState.selectedLenses.length > 0
      ? { lenses: filterState.selectedLenses, lensMatchMode: 'AND' as const }
      : {}),
    ...(filterState.selectedLocations.length > 0
      ? { locations: filterState.selectedLocations }
      : {}),
    ...(filterState.selectedDates.length > 0 ? { dates: filterState.selectedDates } : {}),
  };
}

/**
 * Whether any collection-page filter is active.
 */
export function hasAnyActiveFilter(filterState: FilterState): boolean {
  return (
    filterState.highlyRatedOnly ||
    filterState.selectedTags.length > 0 ||
    filterState.selectedPeople.length > 0 ||
    filterState.selectedCameras.length > 0 ||
    filterState.selectedLenses.length > 0 ||
    filterState.selectedLocations.length > 0 ||
    filterState.selectedDates.length > 0
  );
}

/**
 * Whether a COLLECTION-ref block satisfies the collection-applicable criteria.
 *
 * A collection tile carries only the dimensions the backend aggregates onto it
 * (tags/people/locations) — it has no camera/lens/film/date of its own. Image-only
 * criteria are therefore NOT applied here (they never hide a collection tile), so
 * toggling e.g. a film filter on a mixed page leaves collection tiles in place.
 * Since D7 the toolbar surfaces the camera/lens/lens-type dimensions on any page
 * with at least one image, including collection-dominant ones, so this pass-through
 * is what keeps those chips from wiping the page's navigation.
 *
 * `rating` is the same story in practice: the backend's collection-ref DTO does not
 * serialize one, so an UNRATED tile is passed through rather than treated as rating 0.
 * Otherwise "Highly Rated" (minRating 4) on a mixed page would delete every child card
 * and strip the page of its only route into the sub-collections. A tile that DOES carry
 * an explicit rating is still held to `minRating`.
 *
 * @param ref - The collection-ref block
 * @param criteria - Filter criteria (from {@link buildCollectionCriteria})
 */
export function collectionRefMatchesCriteria(
  ref: ContentCollectionModel,
  criteria: ContentFilterCriteria
): boolean {
  if (criteria.minRating !== undefined && ref.rating != null && ref.rating < criteria.minRating) {
    return false;
  }

  if (criteria.tags && criteria.tags.length > 0) {
    const tagNames = ref.tags?.map(t => t.name.toLowerCase()) ?? [];
    const matcher = criteria.tagMatchMode === 'AND' ? 'every' : 'some';
    if (!criteria.tags[matcher](tag => tagNames.includes(tag.toLowerCase()))) return false;
  }

  if (criteria.people && criteria.people.length > 0) {
    const personNames = ref.people?.map(p => p.name.toLowerCase()) ?? [];
    const matcher = criteria.peopleMatchMode === 'AND' ? 'every' : 'some';
    if (!criteria.people[matcher](name => personNames.includes(name.toLowerCase()))) return false;
  }

  if (criteria.locations && criteria.locations.length > 0) {
    const locationNames = ref.locations?.map(l => l.name.toLowerCase()) ?? [];
    if (!criteria.locations.some(loc => locationNames.includes(loc.toLowerCase()))) return false;
  }

  return true;
}

/**
 * Apply the collection page's filters to its content.
 *
 * Filters only images by `criteria`, and filters COLLECTION-ref tiles by their own
 * tags/people/locations/rating (see {@link collectionRefMatchesCriteria}) so tag
 * filtering works on collection-dominant pages like /all-collections. Any other
 * non-image block passes through unchanged.
 *
 * @param allContent - The full content array (images + non-image blocks)
 * @param allImages - The image subset of `allContent`
 * @param criteria - Filter criteria (from {@link buildCollectionCriteria})
 */
export function applyCollectionFilters(
  allContent: AnyContentModel[],
  allImages: ContentImageModel[],
  criteria: ContentFilterCriteria
): AnyContentModel[] {
  const filtered = filterContent(allImages, criteria).filter(isImageContent);

  const filteredImageIds = new Set(filtered.map(img => img.id));
  return allContent.filter(item => {
    if (isImageContent(item)) return filteredImageIds.has(item.id);
    if (isCollectionRef(item)) return collectionRefMatchesCriteria(item, criteria);
    // A dated GIF/MP4 participates in the `dates` criterion the same way {@link isDateable}
    // already lets it participate in chronological sort. An undated GIF keeps passing through
    // unconditionally -- there is no day to match against. This is an intentional asymmetry
    // with undated IMAGES, which DO drop out once a day is selected (see filterContent above).
    if (isGifContent(item) && item.captureDate && criteria.dates && criteria.dates.length > 0) {
      const day = captureDayKey(item.captureDate);
      return day !== null && criteria.dates.includes(day);
    }
    // Other non-image blocks (text, panels, undated GIFs) are structural -- never filtered out.
    return true;
  });
}

/**
 * Whether the payload carries collection visibility at all.
 *
 * The backend only recently started serializing `visibility` onto synthetic collection blocks, so
 * this gates the admin Hidden toggle on real data rather than on the deploy order of the two
 * repos: until the field arrives the chip stays hidden instead of rendering as a dead control,
 * and it appears on its own the moment the backend ships.
 */
export function hasVisibilityData(content: readonly AnyContentModel[]): boolean {
  return content.some(item => isCollectionRef(item) && item.visibility !== undefined);
}

/**
 * How many collection tiles are non-public — every tile with a known visibility that is not
 * `LISTED`. Badges the Hidden chip, so the number must match exactly what switching the chip off
 * removes (see {@link applyVisibilityScope}), not just the `HIDDEN` subset.
 */
export function countNonListedCollections(content: readonly AnyContentModel[]): number {
  return content.filter(
    item =>
      isCollectionRef(item) &&
      item.visibility !== undefined &&
      item.visibility !== CollectionVisibility.LISTED
  ).length;
}

/**
 * Narrow content to the viewer's chosen visibility scope. With `showHidden` on (the default) the
 * content passes through untouched; turning it off keeps only `LISTED` collection tiles,
 * previewing the list the way the general audience sees it.
 *
 * `LISTED` is the whole of the general-audience scope — it mirrors the backend's anonymous branch
 * in `SyntheticCollectionResolver#findAllCollectionsForCurrentViewer`. Both `UNLISTED` (reachable
 * by direct slug, never in a public list) and `HIDDEN` (dev-only) are absent from a public list,
 * so previewing that view has to drop both.
 *
 * Tiles whose `visibility` is undefined are KEPT: an unknown label means the payload predates the
 * backend enrichment, and guessing "not listed" would blank the page. The chip is gated on
 * {@link hasVisibilityData} for the same reason.
 *
 * Purely SUBTRACTIVE. It is a visibility scope rather than a filter, so it runs upstream of the
 * filter pipeline rather than riding in {@link ContentFilterCriteria}: criteria only apply when
 * {@link hasAnyActiveFilter} is true, and this must govern the layout baseline and the filter
 * dimensions too.
 *
 * This is a VIEW control, never an access control — the backend already refuses to send a
 * non-admin anything outside their scope, and nothing here can widen what arrived.
 */
export function applyVisibilityScope<T extends AnyContentModel>(
  content: T[],
  showHidden: boolean
): T[] {
  if (showHidden) return content;
  return content.filter(item => {
    if (!isCollectionRef(item) || item.visibility === undefined) return true;
    return item.visibility === CollectionVisibility.LISTED;
  });
}

/**
 * A "dateable" content block participates in the chronological date sort: any image, or a GIF/MP4
 * that has been given a captureDate. Text, collections, and undated GIFs are NOT dateable and keep
 * their processed position (undated GIFs therefore stay at the end of a chronological collection).
 *
 * Child-collection CARDS are excluded explicitly: `convertCollectionContentToParallax` stamps them
 * `contentType: 'IMAGE'`, so the plain image check would admit them, they would sort at epoch 0,
 * and `enterReorder` would persist that as a full orderIndex re-index. Keyed on
 * {@link isCollectionCard} (slug presence) so this can never disagree with the layout/badge code.
 */
export function isDateable(block: AnyContentModel): boolean {
  if (isCollectionCard(block)) return false;
  return isImageContent(block) || (isGifContent(block) && Boolean(block.captureDate));
}

/**
 * Re-interleave date-sorted dateable content back into a processed content array.
 *
 * Date sort runs after `processContentBlocks` (which sorts by orderIndex), so this walks the
 * processed array and replaces each dateable slot (images, plus GIFs/MP4s with a captureDate), in
 * order, with the next date-sorted item — leaving non-dateable blocks (text, collections, undated
 * GIFs) in place.
 *
 * @param processed - Content already processed for layout
 * @param sortedDateables - The processed dateable content re-sorted by date
 */
export function mergeDateSortedImages(
  processed: AnyContentModel[],
  sortedDateables: AnyContentModel[]
): AnyContentModel[] {
  let idx = 0;
  return processed.map(item => {
    if (!isDateable(item)) return item;
    return sortedDateables[idx++] ?? item;
  });
}

/**
 * Whether the collection filter bar has anything to show (controls the
 * decision to wrap the page in the filter provider at all). Locations and
 * dates contribute only when multi-value (`filterable`) - a single-value
 * location, or a collection whose images share one capture day, is
 * intentionally surfaced elsewhere and must not trigger the bar alone. (Nearly
 * every real photo carries a captureDate, so gating dates on raw value count
 * instead of `filterable` would open the bar for collections with no other
 * filterable dimension at all.)
 *
 * @param baseOptions - The page's base dimensions
 * @param showHighlyRated - Whether the Highly Rated control is shown
 * @param showDateSort - Whether the Date Sort control should be shown
 */
export function hasFilterableOptions(
  baseOptions: CollectionFilterDimensions,
  showHighlyRated: boolean,
  showDateSort: boolean
): boolean {
  return (
    showHighlyRated ||
    showDateSort ||
    baseOptions.people.values.length > 0 ||
    baseOptions.cameras.values.length > 0 ||
    baseOptions.lenses.values.length > 0 ||
    baseOptions.locations.filterable ||
    baseOptions.dates.filterable
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Location/taxonomy-page filter derivations
//
// The location page shares the filter domain but its criteria differ from the
// collection page: it surfaces a film/digital toggle (mapped to `isFilm`) and
// uses default (OR) match mode on tags/people with no location/camera/lens
// dimensions — so it gets its own criteria builder rather than parameterizing.
// ─────────────────────────────────────────────────────────────────────────────

/** Map the URL's isFilm tristate onto the FilterState film toggle. */
export function filmFilterFromIsFilm(isFilm: boolean | undefined): FilmFilter {
  if (isFilm === true) return 'film';
  if (isFilm === false) return 'digital';
  return 'off';
}

/**
 * Build filter criteria from a location page's filter state. Single source of
 * truth for both the live filter and the URL sync. Differs from
 * {@link buildCollectionCriteria}: includes the film/digital toggle and uses
 * default (OR) match mode on tags/people with no location/camera/lens keys.
 */
export function buildLocationCriteria(filterState: FilterState): ContentFilterCriteria {
  return {
    ...(filterState.highlyRatedOnly ? { minRating: 4 } : {}),
    ...(filterState.filmFilter === 'film' ? { isFilm: true as const } : {}),
    ...(filterState.filmFilter === 'digital' ? { isFilm: false as const } : {}),
    ...(filterState.selectedTags.length > 0 ? { tags: filterState.selectedTags } : {}),
    ...(filterState.selectedPeople.length > 0 ? { people: filterState.selectedPeople } : {}),
  };
}
