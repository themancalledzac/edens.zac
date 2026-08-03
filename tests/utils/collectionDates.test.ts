import {
  captureDayKey,
  dayLabels,
  distinctDays,
  formatDayLabel,
} from '@/app/utils/collectionDates';

describe('captureDayKey', () => {
  it('takes the calendar day as a literal slice', () => {
    expect(captureDayKey('2026-07-20T14:32:00')).toBe('2026-07-20');
  });


  it('returns null for null, undefined, empty, and malformed values', () => {
    expect(captureDayKey(null)).toBeNull();
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(captureDayKey(undefined)).toBeNull();
    expect(captureDayKey('')).toBeNull();
    expect(captureDayKey('not-a-date')).toBeNull();
  });
});

describe('distinctDays', () => {
  it('de-duplicates and sorts ascending', () => {
    expect(
      distinctDays([
        '2026-07-22T09:00:00',
        '2026-07-20T18:00:00',
        '2026-07-20T08:00:00',
        '2026-07-21T12:00:00',
      ])
    ).toEqual(['2026-07-20', '2026-07-21', '2026-07-22']);
  });

  it('ignores entries with no usable date', () => {
    expect(distinctDays(['2026-07-20T09:00:00', null, undefined, ''])).toEqual(['2026-07-20']);
  });

  it('returns an empty array for no input', () => {
    expect(distinctDays([])).toEqual([]);
  });
});

describe('formatDayLabel', () => {
  const sameYear = ['2026-07-20', '2026-07-21'];

  it('renders a short label without the year when all days share a year', () => {
    expect(formatDayLabel('2026-07-20', sameYear)).toBe('Jul 20');
  });

  it('strips the leading zero from the day number', () => {
    expect(formatDayLabel('2026-07-05', ['2026-07-05', '2026-07-06'])).toBe('Jul 5');
  });

  it('appends the year when the set spans more than one year', () => {
    const crossYear = ['2025-12-31', '2026-01-01'];
    expect(formatDayLabel('2025-12-31', crossYear)).toBe('Dec 31, 2025');
    expect(formatDayLabel('2026-01-01', crossYear)).toBe('Jan 1, 2026');
  });
});

describe('dayLabels', () => {
  it('maps every day key to its label', () => {
    expect(dayLabels(['2026-07-20', '2026-07-21'])).toEqual({
      '2026-07-20': 'Jul 20',
      '2026-07-21': 'Jul 21',
    });
  });
});
