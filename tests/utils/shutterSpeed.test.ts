/**
 * Unit tests for shutterSpeed.ts
 *
 * Verifies that raw decimal exposure times (the regression) and other shapes
 * are normalized to canonical photographic notation: `1/N sec` for sub-second
 * exposures, `N sec` for >= 1 second.
 */

import { formatShutterSpeed } from '@/app/utils/shutterSpeed';

describe('formatShutterSpeed', () => {
  describe('decimal exposures (the regression)', () => {
    it('converts "0.01 sec" to "1/100 sec"', () => {
      expect(formatShutterSpeed('0.01 sec')).toBe('1/100 sec');
    });

    it('converts a bare decimal "0.01" to "1/100 sec"', () => {
      expect(formatShutterSpeed('0.01')).toBe('1/100 sec');
    });

    it('converts "0.1" to "1/10 sec"', () => {
      expect(formatShutterSpeed('0.1')).toBe('1/10 sec');
    });

    it('converts "0.005 sec" to "1/200 sec"', () => {
      expect(formatShutterSpeed('0.005 sec')).toBe('1/200 sec');
    });

    it('handles a trailing "s" suffix', () => {
      expect(formatShutterSpeed('0.004s')).toBe('1/250 sec');
    });

    it('handles a trailing double-quote (seconds) suffix', () => {
      expect(formatShutterSpeed('0.002"')).toBe('1/500 sec');
    });
  });

  describe('exposures of one second or longer', () => {
    it('keeps a whole second as "N sec"', () => {
      expect(formatShutterSpeed('2 sec')).toBe('2 sec');
    });

    it('keeps a bare whole number as "N sec"', () => {
      expect(formatShutterSpeed('30')).toBe('30 sec');
    });

    it('renders a fractional long exposure with one decimal', () => {
      expect(formatShutterSpeed('1.6 sec')).toBe('1.6 sec');
    });

    it('treats exactly 1 second as "1 sec", not a fraction', () => {
      expect(formatShutterSpeed('1')).toBe('1 sec');
    });
  });

  describe('values already expressed as fractions', () => {
    it('normalizes the suffix on "1/250"', () => {
      expect(formatShutterSpeed('1/250')).toBe('1/250 sec');
    });

    it('leaves "1/250 sec" unchanged', () => {
      expect(formatShutterSpeed('1/250 sec')).toBe('1/250 sec');
    });

    it('preserves non-power fractions like "1/2.5"', () => {
      expect(formatShutterSpeed('1/2.5')).toBe('1/2.5 sec');
    });
  });

  describe('edge cases', () => {
    it('returns empty string for null', () => {
      expect(formatShutterSpeed(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(formatShutterSpeed()).toBe('');
    });

    it('returns empty string for an empty / whitespace value', () => {
      expect(formatShutterSpeed('   ')).toBe('');
    });

    it('trims surrounding whitespace before formatting', () => {
      expect(formatShutterSpeed('  0.01 sec  ')).toBe('1/100 sec');
    });

    it('returns unrecognized input trimmed and untouched', () => {
      expect(formatShutterSpeed('Auto')).toBe('Auto');
    });

    it('does not divide by zero on "0"', () => {
      expect(formatShutterSpeed('0')).toBe('0');
    });
  });
});
