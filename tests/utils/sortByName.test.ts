import { compareNames } from '@/app/utils/sortByName';

describe('compareNames', () => {
  it('orders alphabetically', () => {
    expect(compareNames('alice', 'bob')).toBeLessThan(0);
    expect(compareNames('bob', 'alice')).toBeGreaterThan(0);
  });

  it('ignores case, so a capitalised name does not jump the list', () => {
    expect(compareNames('Alice', 'alice')).toBe(0);
    expect(compareNames('Zoe', 'alice')).toBeGreaterThan(0);
  });

  it('ignores accents', () => {
    expect(compareNames('resume', 'résumé')).toBe(0);
  });

  it('sorts a list case-insensitively', () => {
    expect(['delta', 'Alpha', 'charlie', 'Bravo'].sort(compareNames)).toEqual([
      'Alpha',
      'Bravo',
      'charlie',
      'delta',
    ]);
  });

  it('treats an empty string as first', () => {
    expect(compareNames('', 'alice')).toBeLessThan(0);
  });
});
