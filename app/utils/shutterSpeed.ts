/**
 * Shutter speed display normalization.
 *
 * By photographic convention, shutter speeds are written as fractions of a
 * second for sub-second exposures (e.g. `1/100 sec`) and as whole seconds for
 * exposures of one second or longer (e.g. `2 sec`). Some upstream EXIF
 * extraction emits the raw decimal exposure time instead (e.g. `0.01 sec`),
 * which is technically correct but reads wrong to photographers.
 *
 * `formatShutterSpeed` normalizes any of those representations to the canonical
 * fraction / whole-second form. It is intentionally tolerant: anything it can't
 * confidently parse is returned trimmed and otherwise untouched, so we never
 * destroy data we don't understand.
 */

const SHUTTER_SUFFIX = ' sec';

/**
 * Normalize a shutter speed string to canonical display form.
 *
 * Accepts decimals (`0.01`, `0.01 sec`, `0.01s`, `0.01"`), existing fractions
 * (`1/100`, `1/100 sec`) and whole seconds (`2`, `2 sec`). Returns `1/N sec`
 * for sub-second exposures and `N sec` for exposures >= 1 second. Empty / nullish
 * input returns an empty string; unrecognized input is returned trimmed.
 *
 * @param value - Raw shutter speed string from the API / database.
 * @returns Canonical shutter speed string, or `''` when there is nothing to show.
 */
export function formatShutterSpeed(value?: string | null): string {
  if (value == null) return '';
  const trimmed = value.trim();
  if (trimmed === '') return '';

  // Already a fraction (e.g. "1/250", "1/250 sec"). Normalize the suffix only;
  // a value the photographer already expressed as a fraction is left intact.
  const fractionMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+(?:\.\d+)?)\b/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (numerator === 0 || denominator === 0) return trimmed;
    return `${fractionMatch[1]}/${fractionMatch[2]}${SHUTTER_SUFFIX}`;
  }

  // Decimal or whole seconds (e.g. "0.01", "0.01 sec", "0.01s", '0.01"', "2 sec").
  const decimalMatch = trimmed.match(/^(\d*\.?\d+)/);
  if (decimalMatch) {
    const seconds = Number(decimalMatch[1]);
    if (!Number.isFinite(seconds) || seconds <= 0) return trimmed;

    if (seconds >= 1) {
      // Whole seconds stay whole; keep a single decimal only when meaningful
      // (e.g. 1.6 sec) so we don't render "2 sec" as "2.0 sec".
      const rounded = Number.isInteger(seconds) ? seconds : Number(seconds.toFixed(1));
      return `${rounded}${SHUTTER_SUFFIX}`;
    }

    // Sub-second exposures become fractions: 0.01 -> 1/100, 0.005 -> 1/200.
    const denominator = Math.round(1 / seconds);
    return `1/${denominator}${SHUTTER_SUFFIX}`;
  }

  return trimmed;
}
