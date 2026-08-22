import { formatDateRange, formatLongDate, parseIsoDateParts } from '@/app/utils/formatDateRange';

const EN_DASH = '–';

describe('formatDateRange', () => {
  describe('single date (start only)', () => {
    it('returns the raw ISO start verbatim when no end is given', () => {
      expect(formatDateRange('2026-03-03')).toBe('2026-03-03');
    });

    it('returns the raw ISO start verbatim when end is null', () => {
      expect(formatDateRange('2026-03-03', null)).toBe('2026-03-03');
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

  describe('reversed range', () => {
    // Pinning current behaviour, not endorsing it: an end before the start renders
    // backwards. InfoTab shows a soft advisory but never blocks the save, so this string
    // is reachable in production. Change it deliberately, not by accident.
    it('renders a reversed same-month range backwards, as-is', () => {
      expect(formatDateRange('2026-03-07', '2026-03-01')).toBe(`Mar 7${EN_DASH}1, 2026`);
    });
  });
});

describe('parseIsoDateParts', () => {
  it('parses a well-formed ISO date into calendar parts', () => {
    expect(parseIsoDateParts('2026-03-03')).toEqual({ year: 2026, month: 3, day: 3 });
  });

  it('tolerates and ignores a time suffix', () => {
    expect(parseIsoDateParts('2026-03-03T12:30:00Z')).toEqual({ year: 2026, month: 3, day: 3 });
  });

  it('rejects trailing junk (the regex is anchored)', () => {
    expect(parseIsoDateParts('2026-03-0399')).toBeNull();
  });

  it('rejects an impossible day for the month', () => {
    expect(parseIsoDateParts('2026-02-30')).toBeNull();
  });

  it('rejects an out-of-range month', () => {
    expect(parseIsoDateParts('2026-13-01')).toBeNull();
  });

  it('accepts Feb 29 in a leap year and rejects it otherwise', () => {
    expect(parseIsoDateParts('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });
    expect(parseIsoDateParts('2026-02-29')).toBeNull();
  });

  it('returns null for absent input', () => {
    expect(parseIsoDateParts(null)).toBeNull();
    expect(parseIsoDateParts('')).toBeNull();
  });
});

describe('formatLongDate', () => {
  it('renders a plain ISO date in long form', () => {
    expect(formatLongDate('2023-09-13')).toBe('September 13th, 2023');
  });

  it('drops a time component (the shape captureDate arrives in)', () => {
    expect(formatLongDate('2023-10-13T02:32:00')).toBe('October 13th, 2023');
  });

  it('applies st/nd/rd suffixes to the days that take them', () => {
    expect(formatLongDate('2024-01-01')).toBe('January 1st, 2024');
    expect(formatLongDate('2024-01-02')).toBe('January 2nd, 2024');
    expect(formatLongDate('2024-01-03')).toBe('January 3rd, 2024');
    expect(formatLongDate('2024-01-21')).toBe('January 21st, 2024');
    expect(formatLongDate('2024-01-22')).toBe('January 22nd, 2024');
    expect(formatLongDate('2024-01-23')).toBe('January 23rd, 2024');
    expect(formatLongDate('2024-01-31')).toBe('January 31st, 2024');
  });

  it('uses "th" for the 11-13 teens rather than the trailing-digit rule', () => {
    expect(formatLongDate('2024-01-11')).toBe('January 11th, 2024');
    expect(formatLongDate('2024-01-12')).toBe('January 12th, 2024');
    expect(formatLongDate('2024-01-13')).toBe('January 13th, 2024');
  });

  it('returns an unparseable value verbatim rather than blanking it', () => {
    expect(formatLongDate('not-a-date')).toBe('not-a-date');
    expect(formatLongDate('2026-02-30')).toBe('2026-02-30');
  });

  it('returns an empty string for absent input', () => {
    expect(formatLongDate(null)).toBe('');
    expect(formatLongDate()).toBe('');
    expect(formatLongDate('')).toBe('');
  });
});
