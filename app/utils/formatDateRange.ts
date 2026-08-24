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

import { logger } from '@/app/utils/logger';

/**
 * Three-letter month abbreviations, indexed by month number minus one. Exported because the
 * per-day filter chips in `collectionDates.ts` label with the same abbreviations, and a second
 * copy there drifted from this one silently.
 */
export const MONTHS_SHORT = [
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

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export interface DateParts {
  year: number;
  month: number;
  day: number;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** Anchored so `2026-03-0399` is rejected; a time suffix is tolerated and ignored. */
const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/;

/**
 * Parse a `YYYY-MM-DD` ISO date string into its calendar parts without timezone drift
 * (never `new Date('2026-03-03')`, which is UTC-midnight and can shift a day in
 * negative-offset zones).
 *
 * Returns null when the input is absent or not a real calendar date — `2026-02-30` and
 * `2026-13-01` are rejected, not silently rolled over.
 */
export function parseIsoDateParts(iso?: string | null): DateParts | null {
  if (!iso) {
    return null;
  }
  const match = ISO_DATE_REGEX.exec(iso);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // An out-of-range month indexes past the table, which is the month check.
  const monthLength = DAYS_IN_MONTH[month - 1];
  if (monthLength === undefined) {
    return null;
  }
  const isLeapFebruary = month === 2 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0);
  if (day < 1 || day > (isLeapFebruary ? 29 : monthLength)) {
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
 * English ordinal suffix for a day-of-month: `1st`, `2nd`, `3rd`, `4th`, `11th`, `21st`, `31st`.
 * The 11–13 teens are the exception to the trailing-digit rule and are checked first.
 */
function ordinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return 'th';
  }
  switch (day % 10) {
    case 1: {
      return 'st';
    }
    case 2: {
      return 'nd';
    }
    case 3: {
      return 'rd';
    }
    default: {
      return 'th';
    }
  }
}

/**
 * Format a single date for human display: `September 13th, 2023`.
 *
 * Used wherever a raw capture date would otherwise leak to the screen — the fullscreen metadata
 * overlay and the metadata editor's read-only rows both previously rendered the backend string
 * verbatim (`2023-10-13T02:32:00`). A time component is accepted and dropped; anything that isn't
 * a real calendar date falls through verbatim so a malformed value stays visible rather than
 * silently disappearing.
 *
 * @param iso - ISO `YYYY-MM-DD` date, optionally with a `T`/space time suffix.
 * @returns The long-form date, the verbatim input when unparseable, or an empty string.
 */
export function formatLongDate(iso?: string | null): string {
  if (!iso) {
    return '';
  }
  const parts = parseIsoDateParts(iso);
  if (!parts) {
    return iso;
  }
  return `${MONTHS_LONG[parts.month - 1]} ${parts.day}${ordinalSuffix(parts.day)}, ${parts.year}`;
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
    logger.warn('formatDateRange', 'Unparseable end date dropped from the label', { start, end });
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
