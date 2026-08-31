/**
 * Drift guard for FILTER_PARAM_KEYS against serializeFilterToParams.
 *
 * `useFilterUrlState`'s syncToUrl deletes exactly these keys before writing the serialized ones.
 * A key the serializer emits but the list omits sticks in the URL forever once its filter is
 * cleared; a key in the list the serializer never emits silently deletes a param someone else
 * owns (`?image=<id>` for the fullscreen deep-link is the one that would hurt). The two lived in
 * separate files with a "MUST mirror" comment holding them together, which is what this replaces.
 */
import {
  type ContentFilterCriteria,
  FILTER_PARAM_KEYS,
  serializeFilterToParams,
} from '@/app/utils/contentFilter';

/** Every field the serializer reads, set at once, so the emitted key set is the complete one. */
const EVERY_CRITERION: ContentFilterCriteria = {
  minRating: 4,
  people: ['ada'],
  locations: ['oslo'],
  tags: ['film'],
  cameras: ['leica-m6'],
  dates: ['2026-07-20'],
  years: ['2026'],
  focalRanges: ['wide'],
  query: 'sunset',
  dateFrom: '2026-01-01',
  dateTo: '2026-12-31',
  isFilm: true,
  blackAndWhite: true,
  collectionIds: [10, 20],
};

describe('FILTER_PARAM_KEYS', () => {
  it('is exactly the set of keys serializeFilterToParams can emit', () => {
    const emitted = [...new Set(serializeFilterToParams(EVERY_CRITERION).keys())].sort();

    expect(emitted).toEqual([...FILTER_PARAM_KEYS].sort());
  });

  it('lists no key twice', () => {
    expect(new Set(FILTER_PARAM_KEYS).size).toBe(FILTER_PARAM_KEYS.length);
  });
});
