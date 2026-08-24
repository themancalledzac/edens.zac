/**
 * Unit tests for entityUtils.ts
 *
 * Covers the two shared mechanics directly, on the widened input union the wrappers do not
 * each exercise. `tagUtils.test.ts` and `locationUtils.test.ts` cover the same functions
 * through their concrete types and are the guard against a wrapper drifting from this.
 */

import type { EntityRef } from '@/app/types/Collection';
import { buildEntityDiff, convertToModels } from '@/app/utils/entityUtils';

const make = (id: number, name: string, slug: string): EntityRef => ({ id, name, slug });

const AVAILABLE: EntityRef[] = [
  { id: 1, name: 'Seattle', slug: 'seattle' },
  { id: 2, name: 'Portland', slug: 'portland' },
];

describe('convertToModels', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty array', []],
  ])('returns an empty array for %s', (_label, input) => {
    expect(convertToModels(input as null, AVAILABLE, make)).toEqual([]);
  });

  it('resolves a known id to the available entity, ignoring the input name', () => {
    const result = convertToModels([{ id: 1, name: 'stale', slug: '' }], AVAILABLE, make);
    expect(result).toEqual([{ id: 1, name: 'Seattle', slug: 'seattle' }]);
  });

  it('falls back to a name match when the id is unknown', () => {
    const result = convertToModels([{ id: 99, name: 'Portland', slug: '' }], AVAILABLE, make);
    expect(result).toEqual([{ id: 2, name: 'Portland', slug: 'portland' }]);
  });

  it('resolves a bare name string against the available list', () => {
    expect(convertToModels('Seattle', AVAILABLE, make)).toEqual([
      { id: 1, name: 'Seattle', slug: 'seattle' },
    ]);
  });

  it('builds a new entity with id 0 for an unknown name string', () => {
    expect(convertToModels(['Tacoma'], AVAILABLE, make)).toEqual([
      { id: 0, name: 'Tacoma', slug: '' },
    ]);
  });

  it('keeps an unmatched object id rather than zeroing it', () => {
    expect(convertToModels({ id: 7, name: 'Bend' }, AVAILABLE, make)).toEqual([
      { id: 7, name: 'Bend', slug: '' },
    ]);
  });

  it('defaults a missing slug to the empty string', () => {
    expect(convertToModels([{ id: 8, name: 'Bend' }], AVAILABLE, make)).toEqual([
      { id: 8, name: 'Bend', slug: '' },
    ]);
  });

  it('builds every unmatched entry through createUnknown', () => {
    const factory = jest.fn(make);
    convertToModels(['Tacoma', 'Bend'], AVAILABLE, factory);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(factory).toHaveBeenCalledWith(0, 'Tacoma', '');
  });

  it('does not call createUnknown for entries it resolves', () => {
    const factory = jest.fn(make);
    convertToModels(['Seattle'], AVAILABLE, factory);
    expect(factory).not.toHaveBeenCalled();
  });

  it('preserves input order across resolved and new entries', () => {
    const result = convertToModels(['Tacoma', 'Seattle'], AVAILABLE, make);
    expect(result.map(e => e.name)).toEqual(['Tacoma', 'Seattle']);
  });
});

describe('buildEntityDiff', () => {
  it('returns undefined when both sides hold the same saved ids', () => {
    const same = [{ id: 1, name: 'Seattle' }];
    expect(buildEntityDiff(same, same)).toBeUndefined();
  });

  it('returns undefined when ids match in a different order', () => {
    expect(
      buildEntityDiff(
        [
          { id: 2, name: 'b' },
          { id: 1, name: 'a' },
        ],
        [
          { id: 1, name: 'a' },
          { id: 2, name: 'b' },
        ]
      )
    ).toBeUndefined();
  });

  it('returns undefined when the unsaved names match on both sides', () => {
    const same = [{ id: 0, name: 'Tacoma' }];
    expect(buildEntityDiff(same, same)).toBeUndefined();
  });

  it('defaults current to empty, so a first save is all additions', () => {
    expect(buildEntityDiff([{ id: 1, name: 'Seattle' }])).toEqual({ prev: [1] });
  });

  it('puts every saved id in prev, added or merely kept', () => {
    const result = buildEntityDiff(
      [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
      [{ id: 1, name: 'a' }]
    );
    expect(result).toEqual({ prev: [1, 2] });
  });

  it('reports a dropped id in remove — the deselection case', () => {
    const result = buildEntityDiff(
      [{ id: 1, name: 'a' }],
      [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ]
    );
    expect(result).toEqual({ prev: [1], remove: [2] });
  });

  it('reports every id in remove when the selection is cleared', () => {
    expect(buildEntityDiff([], [{ id: 1, name: 'a' }])).toEqual({ remove: [1] });
  });

  it('puts unsaved names in newValue and omits them from prev', () => {
    const result = buildEntityDiff([{ id: 0, name: 'Tacoma' }], []);
    expect(result).toEqual({ newValue: ['Tacoma'] });
  });

  it('combines prev, newValue and remove in one diff', () => {
    const result = buildEntityDiff(
      [
        { id: 1, name: 'a' },
        { id: 0, name: 'new' },
      ],
      [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ]
    );
    expect(result).toEqual({ prev: [1], newValue: ['new'], remove: [2] });
  });

  it('omits keys with nothing to report rather than sending empty arrays', () => {
    const result = buildEntityDiff([{ id: 0, name: 'only-new' }], []);
    expect(Object.keys(result ?? {})).toEqual(['newValue']);
  });

  it('deduplicates repeated ids through the id set', () => {
    const result = buildEntityDiff(
      [
        { id: 1, name: 'a' },
        { id: 1, name: 'a' },
      ],
      []
    );
    expect(result).toEqual({ prev: [1] });
  });

  it('treats a renamed unsaved entity as a change', () => {
    expect(buildEntityDiff([{ id: 0, name: 'Tacoma' }], [{ id: 0, name: 'Bend' }])).toEqual({
      newValue: ['Tacoma'],
    });
  });
});
