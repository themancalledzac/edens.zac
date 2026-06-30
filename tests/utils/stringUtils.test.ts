import { humanizeConstantCase, humanizeSlug } from '@/app/utils/stringUtils';

describe('humanizeConstantCase', () => {
  it('converts a two-word constant to Title Case', () => {
    expect(humanizeConstantCase('CLIENT_GALLERY')).toBe('Client Gallery');
  });

  it('converts a single-word constant to Title Case', () => {
    expect(humanizeConstantCase('HOME')).toBe('Home');
  });

  it('converts ART_GALLERY to Art Gallery', () => {
    expect(humanizeConstantCase('ART_GALLERY')).toBe('Art Gallery');
  });

  it('converts a multi-word constant to Title Case', () => {
    expect(humanizeConstantCase('UPPER_SNAKE_CASE')).toBe('Upper Snake Case');
  });

  it('converts a single token without underscores', () => {
    expect(humanizeConstantCase('PORTFOLIO')).toBe('Portfolio');
  });

  it('returns an empty string for empty input', () => {
    expect(humanizeConstantCase('')).toBe('');
  });
});

describe('humanizeSlug', () => {
  it('converts a hyphenated slug to Title Case', () => {
    expect(humanizeSlug('street-photography')).toBe('Street Photography');
  });

  it('handles a single-word slug', () => {
    expect(humanizeSlug('portfolio')).toBe('Portfolio');
  });

  it('collapses repeated hyphens and trims', () => {
    expect(humanizeSlug('dolomites--2025-')).toBe('Dolomites 2025');
  });

  it('decodes percent-encoding before humanizing', () => {
    expect(humanizeSlug('caf%C3%A9-trips')).toBe('Café Trips');
  });

  it('returns an empty string for empty/blank input', () => {
    expect(humanizeSlug('')).toBe('');
    expect(humanizeSlug('   ')).toBe('');
  });
});
