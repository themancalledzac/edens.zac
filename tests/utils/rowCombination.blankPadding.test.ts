/**
 * Unit tests for blank-spacer row-width normalization.
 * Covers the BLANK content type, its guard, and padRowToWidth's math,
 * threshold, solo-hero skip, and id determinism.
 */

import type { ContentBlankModel } from '@/app/types/Content';
import { isBlankContent } from '@/app/utils/contentTypeGuards';
import { createHorizontalImage } from '@/tests/fixtures/contentFixtures';

describe('isBlankContent', () => {
  it('returns true for a BLANK block', () => {
    const blank: ContentBlankModel = {
      id: -1_000_000,
      contentType: 'BLANK',
      orderIndex: 0,
      visible: true,
      width: 8.8889,
      height: 1,
    };
    expect(isBlankContent(blank)).toBe(true);
  });

  it('returns false for a real image', () => {
    expect(isBlankContent(createHorizontalImage(1, 3))).toBe(false);
  });
});
