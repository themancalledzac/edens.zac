/**
 * Fraction Math Utilities
 *
 * Pure math functions for fraction-based calculations.
 * Used by rowStructureAlgorithm.ts for aspect ratio calculations.
 *
 * Note: These use fraction representation (numerator/denominator) to avoid
 * floating-point precision issues in intermediate calculations.
 * Final pixel values are computed from these fractions.
 */

/**
 * Fraction representation: { numerator, denominator }
 * Used for aspect ratios: width/height
 */
export interface Fraction {
  numerator: number;
  denominator: number;
}

/**
 * Create a fraction from width and height
 */
export function createFraction(width: number, height: number): Fraction {
  return {
    numerator: width,
    denominator: height,
  };
}

/**
 * Simplify a fraction to lowest terms using GCD
 */
export function simplifyFraction(f: Fraction): Fraction {
  // Guard against invalid input
  if (!Number.isFinite(f.numerator) || !Number.isFinite(f.denominator)) {
    return { numerator: 1, denominator: 1 };
  }

  if (f.denominator === 0) {
    return { numerator: 1, denominator: 1 };
  }

  const gcd = (a: number, b: number): number => {
    // Ensure we have valid finite numbers
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 1;
    if (b === 0) return a;
    return gcd(b, a % b);
  };

  const divisor = gcd(Math.abs(f.numerator), Math.abs(f.denominator));
  if (divisor === 0 || !Number.isFinite(divisor)) return f;

  return {
    numerator: f.numerator / divisor,
    denominator: f.denominator / divisor,
  };
}

/**
 * Add two fractions: a/b + c/d = (ad + bc) / bd
 */
export function addFractions(f1: Fraction, f2: Fraction): Fraction {
  return simplifyFraction({
    numerator: f1.numerator * f2.denominator + f2.numerator * f1.denominator,
    denominator: f1.denominator * f2.denominator,
  });
}

/**
 * Invert a fraction: a/b -> b/a (flip for vertical direction)
 */
export function invertFraction(f: Fraction): Fraction {
  return {
    numerator: f.denominator,
    denominator: f.numerator,
  };
}
