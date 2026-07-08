/**
 * Format a collection date or date range for public display.
 *
 * Single dates render byte-identically to the pre-range behavior: the raw ISO
 * `YYYY-MM-DD` string is returned verbatim (the metadata renderer prints it as-is).
 * A start+end pair renders as a US-style range with an en-dash, collapsing shared
 * month/year parts:
 * - same day → the single date (verbatim start)
 * - same month → `Mar 3–7, 2026`
 * - same year → `Mar 30 – Apr 2, 2026`
 * - different year → `Dec 30, 2025 – Jan 2, 2026`
 *
 * ISO dates are parsed from their local calendar parts (not `new Date('2026-03-03')`,
 * which is UTC-midnight and can shift a day in negative-offset timezones).
 */

const MONTHS_SHORT = [
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
] as const;

interface DateParts {
  year: number;
  month: number;
  day: number;
}

/**
 * Parse a `YYYY-MM-DD` ISO date string into its calendar parts without timezone drift.
 * Returns null when the input is empty or not a well-formed ISO date.
 */
function parseIsoDateParts(iso: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return { year, month, day };
}

/** `Mar 3` — month abbreviation and day, no year. */
function formatMonthDay(parts: DateParts): string {
  return `${MONTHS_SHORT[parts.month - 1]} ${parts.day}`;
}

/** `Mar 3, 2026` — month abbreviation, day, and year. */
function formatMonthDayYear(parts: DateParts): string {
  return `${formatMonthDay(parts)}, ${parts.year}`;
}

/**
 * Format a start/end date pair for display.
 *
 * @param start - ISO `YYYY-MM-DD` start date (or null/undefined)
 * @param end - ISO `YYYY-MM-DD` end date (or null/undefined)
 * @returns The formatted range, the verbatim single date, or an empty string.
 */
export function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start) {
    return '';
  }

  const startParts = parseIsoDateParts(start);

  if (!end || !startParts) {
    return start;
  }

  const endParts = parseIsoDateParts(end);

  if (!endParts) {
    return start;
  }

  const sameDay =
    startParts.year === endParts.year &&
    startParts.month === endParts.month &&
    startParts.day === endParts.day;

  if (sameDay) {
    return start;
  }

  const enDash = '–';

  if (startParts.year === endParts.year && startParts.month === endParts.month) {
    return `${MONTHS_SHORT[startParts.month - 1]} ${startParts.day}${enDash}${endParts.day}, ${endParts.year}`;
  }

  if (startParts.year === endParts.year) {
    return `${formatMonthDay(startParts)} ${enDash} ${formatMonthDayYear(endParts)}`;
  }

  return `${formatMonthDayYear(startParts)} ${enDash} ${formatMonthDayYear(endParts)}`;
}

export default formatDateRange;
