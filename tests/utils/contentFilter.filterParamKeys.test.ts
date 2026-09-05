/**
 * Drift guard for FILTER_PARAM_KEYS against serializeFilterToParams.
 *
 * `useFilterUrlState`'s syncToUrl deletes exactly these keys before writing the serialized ones.
 * A key the serializer emits but the list omits sticks in the URL forever once its filter is
 * cleared; a key in the list the serializer never emits silently deletes a param someone else
 * owns (`?image=<id>` for the fullscreen deep-link is the one that would hurt).
 */
import {
  type ContentFilterCriteria,
  FILTER_PARAM_KEYS,
  serializeFilterToParams,
} from '@/app/utils/contentFilter';

/**
 * Every criterion set at once. Typed `Required` so adding a field to ContentFilterCriteria
 * without a value here is a compile error, which is what makes the per-criterion guard below
 * cover new dimensions instead of quietly skipping them.
 */
const EVERY_CRITERION: Required<ContentFilterCriteria> = {
  minRating: 4,
  people: ['ada'],
  locations: ['oslo'],
  tags: ['film'],
  cameras: ['leica-m6'],
  lenses: ['35mm Summicron'],
  dates: ['2026-07-20'],
  years: ['2026'],
  query: 'sunset',
  dateFrom: '2026-01-01',
  dateTo: '2026-12-31',
  isFilm: true,
  filmTypes: ['Kodak Portra 400'],
  blackAndWhite: true,
  collectionIds: [10, 20],
  tagMatchMode: 'AND',
  peopleMatchMode: 'AND',
  cameraMatchMode: 'AND',
  lensMatchMode: 'AND',
};

/**
 * Match modes are the deliberate exception: a page decides AND vs OR, not the URL, so they carry
 * no param. Every other criterion must reach the URL or its filter cannot be shared or restored.
 */
const MATCH_MODE_KEYS = [
  'tagMatchMode',
  'peopleMatchMode',
  'cameraMatchMode',
  'lensMatchMode',
] as const;

const URL_CARRIED_KEYS = (Object.keys(EVERY_CRITERION) as (keyof ContentFilterCriteria)[]).filter(
  key => !(MATCH_MODE_KEYS as readonly string[]).includes(key)
);

describe('FILTER_PARAM_KEYS', () => {
  it('is exactly the set of keys serializeFilterToParams can emit', () => {
    const emitted = [...new Set(serializeFilterToParams(EVERY_CRITERION).keys())].sort();

    expect(emitted).toEqual([...FILTER_PARAM_KEYS].sort());
  });

  it('lists no key twice', () => {
    expect(new Set(FILTER_PARAM_KEYS).size).toBe(FILTER_PARAM_KEYS.length);
  });
});

describe('every criterion reaches the URL', () => {
  it.each(URL_CARRIED_KEYS)('serializes %s on its own', key => {
    const emitted = [...serializeFilterToParams({ [key]: EVERY_CRITERION[key] }).keys()];

    expect(emitted.length).toBeGreaterThan(0);
  });

  it.each(MATCH_MODE_KEYS)('deliberately does not serialize %s', key => {
    const emitted = [...serializeFilterToParams({ [key]: EVERY_CRITERION[key] }).keys()];

    expect(emitted).toEqual([]);
  });
});
