import { formatDateRange } from '@/app/utils/formatDateRange';

const EN_DASH = '–';

describe('formatDateRange', () => {
  describe('single date (start only)', () => {
    it('returns the raw ISO start verbatim when no end is given', () => {
      expect(formatDateRange('2026-03-03')).toBe('2026-03-03');
    });

    it('returns the raw ISO start verbatim when end is null', () => {
      expect(formatDateRange('2026-03-03', null)).toBe('2026-03-03');
    });

    it('returns the raw ISO start verbatim when end is undefined', () => {
      expect(formatDateRange('2026-03-03')).toBe('2026-03-03');
    });

    it('returns the raw ISO start verbatim when end is an empty string', () => {
      expect(formatDateRange('2026-03-03', '')).toBe('2026-03-03');
    });
  });

  describe('no start', () => {
    it('returns an empty string when start is undefined', () => {
      expect(formatDateRange(undefined, '2026-03-07')).toBe('');
    });

    it('returns an empty string when start is null', () => {
      expect(formatDateRange(null, '2026-03-07')).toBe('');
    });

    it('returns an empty string when start is an empty string', () => {
      expect(formatDateRange('', '2026-03-07')).toBe('');
    });

    it('returns an empty string when both are absent', () => {
      expect(formatDateRange()).toBe('');
    });
  });

  describe('same day', () => {
    it('collapses an identical start/end to the single verbatim date', () => {
      expect(formatDateRange('2026-03-03', '2026-03-03')).toBe('2026-03-03');
    });
  });

  describe('same month, same year', () => {
    it('formats as `Mar 3–7, 2026`', () => {
      expect(formatDateRange('2026-03-03', '2026-03-07')).toBe(`Mar 3${EN_DASH}7, 2026`);
    });

    it('drops leading zeros on the day', () => {
      expect(formatDateRange('2026-12-01', '2026-12-25')).toBe(`Dec 1${EN_DASH}25, 2026`);
    });
  });

  describe('same year, different month', () => {
    it('formats as `Mar 30 – Apr 2, 2026` with a spaced en-dash', () => {
      expect(formatDateRange('2026-03-30', '2026-04-02')).toBe(`Mar 30 ${EN_DASH} Apr 2, 2026`);
    });
  });

  describe('different year', () => {
    it('formats both endpoints with year: `Dec 30, 2025 – Jan 2, 2026`', () => {
      expect(formatDateRange('2025-12-30', '2026-01-02')).toBe(
        `Dec 30, 2025 ${EN_DASH} Jan 2, 2026`
      );
    });
  });

  describe('timezone-drift safety', () => {
    it('does not shift a day when parsing UTC-midnight-prone ISO dates', () => {
      expect(formatDateRange('2026-01-01', '2026-01-05')).toBe(`Jan 1${EN_DASH}5, 2026`);
    });

    it('keeps a year boundary intact (no drift into the previous year)', () => {
      expect(formatDateRange('2026-01-01', '2026-01-01')).toBe('2026-01-01');
    });

    it('renders a single New Year date verbatim regardless of timezone', () => {
      expect(formatDateRange('2026-01-01')).toBe('2026-01-01');
    });
  });

  describe('malformed input', () => {
    it('returns the raw start when the start is not a parseable ISO date', () => {
      expect(formatDateRange('not-a-date', '2026-03-07')).toBe('not-a-date');
    });

    it('returns the raw start when the end is not a parseable ISO date', () => {
      expect(formatDateRange('2026-03-03', 'not-a-date')).toBe('2026-03-03');
    });
  });

  describe('month coverage', () => {
    it('uses the correct short month name for each endpoint', () => {
      expect(formatDateRange('2026-06-15', '2026-11-20')).toBe(`Jun 15 ${EN_DASH} Nov 20, 2026`);
    });
  });
});
