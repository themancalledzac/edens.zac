import { FOCAL_RANGE_ORDER, type FocalRange } from '@/app/types/GalleryFilter';

/** Realistic lens bounds in millimetres; anything outside is treated as unparseable. */
const MIN_FOCAL_MM = 4;
const MAX_FOCAL_MM = 2000;

/** Below this is Wide; at or below {@link NORMAL_MAX_MM} is Normal; above it is Tele. */
const NORMAL_MIN_MM = 35;
const NORMAL_MAX_MM = 70;

const FOCAL_LENGTH_PATTERN = /^(\d+(?:\.\d+)?)\s*(?:mm)?$/i;

/**
 * Parse a focal length out of the free-text `focalLength` field.
 *
 * The metadata editor stores whatever was typed, with no normalization, so the value has to be
 * read defensively. Live data is near-uniformly `'24 mm'`, with a bare `'50mm'` and decimals like
 * `'25.5 mm'` also present. Returns null for anything unparseable or outside a realistic lens
 * range, which is what keeps a typo out of the filter bar's option list.
 */
export function parseFocalLength(fl?: string | null): number | null {
  if (!fl) return null;
  const match = FOCAL_LENGTH_PATTERN.exec(fl.trim());
  if (!match?.[1]) return null;
  const value = Number.parseFloat(match[1]);
  if (value < MIN_FOCAL_MM || value > MAX_FOCAL_MM) return null;
  return value;
}

/** Classify a focal length in millimetres into one of the three ranges the filter bar offers. */
export function classifyFocalLength(fl: number): FocalRange {
  if (fl < NORMAL_MIN_MM) return 'wide';
  if (fl <= NORMAL_MAX_MM) return 'normal';
  return 'tele';
}

/** The range a stored focal-length string falls in, or null when it cannot be parsed. */
export function getFocalRange(focalLength?: string | null): FocalRange | null {
  const fl = parseFocalLength(focalLength);
  return fl === null ? null : classifyFocalLength(fl);
}

/**
 * The ranges actually present in a set of focal-length strings, in {@link FOCAL_RANGE_ORDER}
 * (wide before normal before tele) rather than the order encountered.
 *
 * The counterpart to `distinctYears`, and the reason the dimension self-hides where it should:
 * film scans carry no focal length at all, so a film collection yields an empty list and never
 * gets a dropdown.
 */
export function distinctFocalRanges(
  focalLengths: readonly (string | null | undefined)[]
): FocalRange[] {
  const ranges = new Set<FocalRange>();
  for (const fl of focalLengths) {
    const range = getFocalRange(fl);
    if (range) ranges.add(range);
  }
  return FOCAL_RANGE_ORDER.filter(range => ranges.has(range));
}
