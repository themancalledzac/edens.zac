/**
 * Per-day derivations for the collection filter bar.
 *
 * `captureDate` arrives as a zoneless LocalDateTime string ('2026-07-20T18:32:00'), so the
 * calendar day is taken as a literal string slice and labels are formatted from the string parts.
 * Parsing through `Date` and re-serialising would resolve the value against the viewer's timezone
 * and can move an evening capture onto the next day (or a small-hours one onto the previous day).
 */

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** The calendar day of a capture date as 'YYYY-MM-DD', or null when there is no usable date. */
export function captureDayKey(captureDate: string | null | undefined): string | null {
  if (!captureDate) return null;
  const day = captureDate.slice(0, 10);
  return DAY_KEY_PATTERN.test(day) ? day : null;
}

/** Ascending, de-duplicated calendar days across the given capture dates. */
export function distinctDays(captureDates: readonly (string | null | undefined)[]): string[] {
  const days = new Set<string>();
  for (const captureDate of captureDates) {
    const key = captureDayKey(captureDate);
    if (key) days.add(key);
  }
  return Array.from(days).sort();
}

/**
 * Chip label for a day key: 'Jul 20' when every day in `allDays` shares a year, 'Jul 20, 2026'
 * when the set spans more than one. The year appears only where it disambiguates.
 */
export function formatDayLabel(dayKey: string, allDays: readonly string[]): string {
  const [year, month, day] = dayKey.split('-');
  const monthName = MONTH_NAMES[Number(month) - 1] ?? month;
  const label = `${monthName} ${Number(day)}`;
  const years = new Set(allDays.map(d => d.slice(0, 4)));
  return years.size > 1 ? `${label}, ${year}` : label;
}

/** Labels for a set of day keys, keyed by day key. The shape `ToolbarDimension.optionLabels` wants. */
export function dayLabels(days: readonly string[]): Record<string, string> {
  return Object.fromEntries(days.map(day => [day, formatDayLabel(day, days)]));
}
