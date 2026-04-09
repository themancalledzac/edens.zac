import { type LensType } from '@/app/types/GalleryFilter';

/**
 * Parse a numeric focal length from a string like "50mm", "50 mm", "50.0mm".
 * Returns null if the string is missing, has no numeric content, or the value
 * falls outside the realistic lens range (4–2000mm).
 */
export function parseFocalLength(fl?: string | null): number | null {
  if (!fl) return null;
  const match = fl.match(/^(\d+(?:\.\d+)?)\s*(?:mm)?$/i);
  if (!match?.[1]) return null;
  const value = Number.parseFloat(match[1]);
  if (value < 4 || value > 2000) return null;
  return value;
}

/** Classify a focal length value into a lens type category. */
export function classifyFocalLength(fl: number): LensType {
  if (fl < 35) return 'wide';
  if (fl <= 70) return 'normal';
  return 'telephoto';
}

/** Get the lens type for a focal length string, or null if unparseable. */
export function getLensType(focalLength?: string | null): LensType | null {
  const fl = parseFocalLength(focalLength);
  return fl !== null ? classifyFocalLength(fl) : null;
}
