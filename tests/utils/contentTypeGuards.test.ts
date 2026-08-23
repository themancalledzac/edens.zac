/**
 * Unit tests for contentTypeGuards.ts
 * Tests all 12 exported functions: type guards, dimension extraction, aspect ratio
 */

import {
  getAspectRatio,
  getContentDimensions,
  hasChildCollectionContent,
  hasImage,
  isContentCollection,
  isContentImage,
  isGifContent,
  isPanelContent,
  isParentCollection,
  isTextContent,
  pickImageDimensions,
} from '@/app/utils/contentTypeGuards';
import {
  createCollectionContent,
  createGifContent,
  createImageContent,
  createPanelContent,
  createTextContent,
} from '@/tests/fixtures/contentFixtures';

// ===================== isContentImage =====================

describe('isContentImage', () => {
  it('returns true for IMAGE content with imageUrl', () => {
    const img = createImageContent(1);
    expect(isContentImage(img)).toBe(true);
  });

  it('returns false for TEXT content', () => {
    const text = createTextContent(1);
    expect(isContentImage(text)).toBe(false);
  });

  it('returns false for GIF content', () => {
    const gif = createGifContent(1);
    expect(isContentImage(gif)).toBe(false);
  });

  it('returns false for COLLECTION content', () => {
    const col = createCollectionContent(1);
    expect(isContentImage(col)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isContentImage(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    const undef = undefined;
    expect(isContentImage(undef)).toBe(false);
  });

  it('returns false for a string primitive', () => {
    expect(isContentImage('IMAGE')).toBe(false);
  });

  it('returns false for a number primitive', () => {
    expect(isContentImage(42)).toBe(false);
  });

  it('returns false for IMAGE contentType but missing imageUrl', () => {
    const noUrl = { id: 1, contentType: 'IMAGE', orderIndex: 0 };
    expect(isContentImage(noUrl)).toBe(false);
  });

  it('returns false for object with imageUrl but wrong contentType', () => {
    const wrong = { id: 1, contentType: 'GIF', orderIndex: 0, imageUrl: 'x.jpg' };
    expect(isContentImage(wrong)).toBe(false);
  });
});

// ===================== isTextContent =====================

describe('isTextContent', () => {
  it('returns true for TEXT content', () => {
    const text = createTextContent(1);
    expect(isTextContent(text)).toBe(true);
  });

  it('returns false for IMAGE content', () => {
    const img = createImageContent(1);
    expect(isTextContent(img)).toBe(false);
  });

  it('returns false for GIF content', () => {
    const gif = createGifContent(1);
    expect(isTextContent(gif)).toBe(false);
  });

  it('returns false for COLLECTION content', () => {
    const col = createCollectionContent(1);
    expect(isTextContent(col)).toBe(false);
  });
});

// ===================== isGifContent =====================

describe('isGifContent', () => {
  it('returns true for GIF content', () => {
    const gif = createGifContent(1);
    expect(isGifContent(gif)).toBe(true);
  });

  it('returns false for IMAGE content', () => {
    const img = createImageContent(1);
    expect(isGifContent(img)).toBe(false);
  });

  it('returns false for TEXT content', () => {
    const text = createTextContent(1);
    expect(isGifContent(text)).toBe(false);
  });

  it('returns false for COLLECTION content', () => {
    const col = createCollectionContent(1);
    expect(isGifContent(col)).toBe(false);
  });
});

// ===================== isContentCollection =====================

describe('isContentCollection', () => {
  it('returns true for COLLECTION content', () => {
    const col = createCollectionContent(1);
    expect(isContentCollection(col)).toBe(true);
  });

  it('returns false for IMAGE content', () => {
    const img = createImageContent(1);
    expect(isContentCollection(img)).toBe(false);
  });

  it('returns false for TEXT content', () => {
    const text = createTextContent(1);
    expect(isContentCollection(text)).toBe(false);
  });

  it('returns false for GIF content', () => {
    const gif = createGifContent(1);
    expect(isContentCollection(gif)).toBe(false);
  });
});

// ===================== isPanelContent =====================

describe('isPanelContent', () => {
  it('returns true for PANEL content', () => {
    const panel = createPanelContent(1);
    expect(isPanelContent(panel)).toBe(true);
  });

  it('returns false for IMAGE content', () => {
    const img = createImageContent(1);
    expect(isPanelContent(img)).toBe(false);
  });

  it('returns false for TEXT content', () => {
    const text = createTextContent(1);
    expect(isPanelContent(text)).toBe(false);
  });

  it('returns false for GIF content', () => {
    const gif = createGifContent(1);
    expect(isPanelContent(gif)).toBe(false);
  });

  it('returns false for COLLECTION content', () => {
    const col = createCollectionContent(1);
    expect(isPanelContent(col)).toBe(false);
  });
});

// ===================== hasImage =====================

describe('hasImage', () => {
  it('returns true for IMAGE content', () => {
    const img = createImageContent(1);
    expect(hasImage(img)).toBe(true);
  });

  it('returns true for GIF content', () => {
    const gif = createGifContent(1);
    expect(hasImage(gif)).toBe(true);
  });

  it('returns false for TEXT content', () => {
    const text = createTextContent(1);
    expect(hasImage(text)).toBe(false);
  });

  it('returns false for COLLECTION content', () => {
    const col = createCollectionContent(1);
    expect(hasImage(col)).toBe(false);
  });
});

// ===================== getContentDimensions =====================

describe('getContentDimensions', () => {
  describe('IMAGE blocks', () => {
    it('returns imageWidth/imageHeight when both are present', () => {
      const img = createImageContent(1, { imageWidth: 3000, imageHeight: 2000 });
      expect(getContentDimensions(img)).toEqual({ width: 3000, height: 2000 });
    });

    it('falls back to width/height when imageWidth/imageHeight are absent', () => {
      const img = createImageContent(1, {
        imageWidth: undefined,
        imageHeight: undefined,
        width: 800,
        height: 600,
      });
      expect(getContentDimensions(img)).toEqual({ width: 800, height: 600 });
    });

    it('uses default dimensions when neither pair is present', () => {
      const img = createImageContent(1, {
        imageWidth: undefined,
        imageHeight: undefined,
        width: undefined,
        height: undefined,
      });
      // defaultWidth = 1300, defaultAspect = 3/2 => height = round(1300 / 1.5) = 867
      expect(getContentDimensions(img)).toEqual({ width: 1300, height: 867 });
    });

    it('uses custom default dimensions', () => {
      const img = createImageContent(1, {
        imageWidth: undefined,
        imageHeight: undefined,
        width: undefined,
        height: undefined,
      });
      expect(getContentDimensions(img, 2000, 2)).toEqual({ width: 2000, height: 1000 });
    });
  });

  describe('COLLECTION blocks', () => {
    it('returns coverImage imageWidth/imageHeight when available', () => {
      const col = createCollectionContent(1);
      // fixture has coverImage imageWidth 1920, imageHeight 1080
      expect(getContentDimensions(col)).toEqual({ width: 1920, height: 1080 });
    });

    it('falls back to coverImage width/height when imageWidth/imageHeight absent', () => {
      const col = createCollectionContent(1, {
        coverImage: {
          id: 10,
          contentType: 'IMAGE',
          orderIndex: 0,
          imageUrl: 'https://example.com/cover.jpg',
          imageWidth: undefined,
          imageHeight: undefined,
          width: 640,
          height: 480,
          visible: true,
          locations: [],
        },
      });
      expect(getContentDimensions(col)).toEqual({ width: 640, height: 480 });
    });

    it('returns default dimensions when coverImage has no dimensions', () => {
      const col = createCollectionContent(1, {
        coverImage: {
          id: 10,
          contentType: 'IMAGE',
          orderIndex: 0,
          imageUrl: 'https://example.com/cover.jpg',
          visible: true,
          locations: [],
        },
      });
      expect(getContentDimensions(col)).toEqual({ width: 1300, height: 867 });
    });

    it('returns default dimensions when coverImage is null', () => {
      const col = createCollectionContent(1, { coverImage: null });
      expect(getContentDimensions(col)).toEqual({ width: 1300, height: 867 });
    });
  });

  describe('TEXT blocks', () => {
    it('returns width/height from the block', () => {
      const text = createTextContent(1, { width: 800, height: 200 });
      expect(getContentDimensions(text)).toEqual({ width: 800, height: 200 });
    });

    it('returns defaults when width/height absent', () => {
      const text = createTextContent(1, { width: undefined, height: undefined });
      expect(getContentDimensions(text)).toEqual({ width: 1300, height: 867 });
    });
  });

  describe('GIF blocks', () => {
    it('returns width/height from the block', () => {
      const gif = createGifContent(1, { width: 800, height: 600 });
      expect(getContentDimensions(gif)).toEqual({ width: 800, height: 600 });
    });

    it('returns defaults when width/height absent', () => {
      const gif = createGifContent(1, { width: undefined, height: undefined });
      expect(getContentDimensions(gif)).toEqual({ width: 1300, height: 867 });
    });
  });
});

// ===================== pickImageDimensions =====================

describe('pickImageDimensions', () => {
  it('prefers imageWidth/imageHeight over width/height', () => {
    expect(
      pickImageDimensions({ imageWidth: 1920, imageHeight: 1080, width: 800, height: 600 })
    ).toEqual({ width: 1920, height: 1080 });
  });

  it('falls back to width/height when imageWidth/imageHeight are absent', () => {
    expect(pickImageDimensions({ width: 800, height: 600 })).toEqual({ width: 800, height: 600 });
  });

  it('returns undefined for a dimension when neither field is present', () => {
    expect(pickImageDimensions({ imageWidth: 1920 })).toEqual({
      width: 1920,
      height: undefined,
    });
  });

  it('keeps a stored 0 (nullish coalescing, not falsy)', () => {
    expect(pickImageDimensions({ imageWidth: 0, width: 800, imageHeight: 0, height: 600 })).toEqual(
      { width: 0, height: 0 }
    );
  });

  it('returns undefined dimensions for a null source', () => {
    expect(pickImageDimensions(null)).toEqual({ width: undefined, height: undefined });
  });

  it('returns undefined dimensions for an undefined source', () => {
    expect(pickImageDimensions()).toEqual({ width: undefined, height: undefined });
  });
});

// ===================== getAspectRatio =====================

describe('getAspectRatio', () => {
  it('returns correct ratio for a horizontal image', () => {
    // 1920 / 1080 ≈ 1.777...
    const img = createImageContent(1, { imageWidth: 1920, imageHeight: 1080 });
    expect(getAspectRatio(img)).toBeCloseTo(1920 / 1080);
  });

  it('returns correct ratio for a vertical image', () => {
    const img = createImageContent(1, { imageWidth: 1080, imageHeight: 1920 });
    expect(getAspectRatio(img)).toBeCloseTo(1080 / 1920);
  });

  it('returns 1.0 for TEXT content (non-image)', () => {
    expect(getAspectRatio(createTextContent(1))).toBe(1.0);
  });

  it('returns 1.0 for COLLECTION content (non-image)', () => {
    expect(getAspectRatio(createCollectionContent(1))).toBe(1.0);
  });

  it('returns vertical AR for PANEL content with width < height', () => {
    const panel = createPanelContent(1, { width: 600, height: 1000 });
    expect(getAspectRatio(panel)).toBeCloseTo(600 / 1000);
  });

  it('returns 1.0 for PANEL content with zero height', () => {
    const panel = createPanelContent(1, { width: 600, height: 0 });
    expect(getAspectRatio(panel)).toBe(1.0);
  });
});

// ===================== hasChildCollectionContent =====================

describe('hasChildCollectionContent', () => {
  it('returns true for a collection containing a child-collection ref', () => {
    const collection = {
      content: [createImageContent(1), createCollectionContent(2)],
    };
    expect(hasChildCollectionContent(collection)).toBe(true);
  });

  it('returns false for a collection with only image content', () => {
    const collection = { content: [createImageContent(1), createGifContent(2)] };
    expect(hasChildCollectionContent(collection)).toBe(false);
  });

  it('returns false for empty or missing content', () => {
    expect(hasChildCollectionContent({ content: [] })).toBe(false);
    expect(hasChildCollectionContent({ content: undefined })).toBe(false);
  });

  it('returns false for null/undefined collection', () => {
    expect(hasChildCollectionContent(null)).toBe(false);
    // eslint-disable-next-line unicorn/no-useless-undefined -- explicitly testing undefined input
    expect(hasChildCollectionContent(undefined)).toBe(false);
  });
});

// ===================== isParentCollection =====================

describe('isParentCollection', () => {
  it('returns true when the content contains a child-collection ref', () => {
    const collection = { content: [createImageContent(1), createCollectionContent(2)] };
    expect(isParentCollection(collection)).toBe(true);
  });

  it('returns false when no content and no server answer', () => {
    expect(isParentCollection({ content: [] })).toBe(false);
    expect(isParentCollection({ content: undefined })).toBe(false);
  });

  it('uses the server hasChildren when present', () => {
    expect(isParentCollection({ content: [], hasChildren: true })).toBe(true);
  });

  it('trusts hasChildren: false over a content scan that found a child', () => {
    expect(isParentCollection({ content: [createCollectionContent(9)], hasChildren: false })).toBe(
      false
    );
  });

  it('falls back to the content scan when hasChildren is absent', () => {
    expect(isParentCollection({ content: [createCollectionContent(9)] })).toBe(true);
  });

  it('returns false for a non-parent collection with only image content', () => {
    const collection = { content: [createImageContent(1)] };
    expect(isParentCollection(collection)).toBe(false);
  });

  it('returns false for null/undefined collection', () => {
    expect(isParentCollection(null)).toBe(false);
    // eslint-disable-next-line unicorn/no-useless-undefined -- explicitly testing undefined input
    expect(isParentCollection(undefined)).toBe(false);
  });
});
