import { formatFilmFormat } from '@/app/utils/filmFormat';

describe('formatFilmFormat', () => {
  it('maps the backend enum names to their display labels', () => {
    expect(formatFilmFormat('MM_35')).toBe('35mm');
    expect(formatFilmFormat('MM_120')).toBe('120');
  });

  it('passes an unmapped value through so a new backend format is visibly wrong, not missing', () => {
    expect(formatFilmFormat('IN_4X5')).toBe('IN_4X5');
  });

  it('returns an empty string for absent input', () => {
    expect(formatFilmFormat(null)).toBe('');
    expect(formatFilmFormat()).toBe('');
    expect(formatFilmFormat('')).toBe('');
  });
});
