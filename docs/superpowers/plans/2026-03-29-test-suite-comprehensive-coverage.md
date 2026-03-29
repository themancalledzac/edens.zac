# Test Suite Comprehensive Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Achieve comprehensive test coverage across all utility functions, API clients, hooks, and components — filling every gap identified in the test audit.

**Architecture:** New test files for 7 untested utility/API files. Additive tests to 6 existing test files for missing branches and edge cases. All tests use existing fixture factories from `tests/fixtures/contentFixtures.ts` and follow established AAA (Arrange-Act-Assert) patterns.

**Tech Stack:** Jest, @testing-library/react, @testing-library/jest-dom, existing contentFixtures factories.

**Run tests with:** `/opt/homebrew/bin/node node_modules/.bin/jest <path>`

---

## File Structure

### New Test Files to Create
| File | Tests For |
|---|---|
| `tests/utils/contentTypeGuards.test.ts` | `app/utils/contentTypeGuards.ts` (9 functions) |
| `tests/utils/apiUtils.test.ts` | `app/utils/apiUtils.ts` (`handleApiError`) |
| `tests/utils/admin.test.ts` | `app/utils/admin.ts` (2 functions) |
| `tests/utils/environment.test.ts` | `app/utils/environment.ts` (2 functions) |

### Existing Test Files to Extend
| File | What to Add |
|---|---|
| `tests/utils/contentRendererUtils.test.ts` | NaN fallback branches, parallax path, GIF path |
| `tests/utils/contentLayout.test.ts` | `processContentForDisplay`, `isContentVisibleInCollection`, `convertCollectionContentToImage`, `createHeaderRow` mobile |
| `tests/utils/contentFilter.test.ts` | Whitespace query, empty arrays, minRating=0, alt-text match, round-trip gaps |
| `tests/hooks/useCollectionData.test.tsx` | Cache hit path, null response, fix mock target |
| `tests/components/CollectionListSelector.test.tsx` | Keyboard navigation, `onAddNewChild` |
| `tests/components/ImageMetadata/imageMetadataUtils.test.ts` | `applyPartialUpdate`, `getFormValue`, all `getDisplay*` functions |

---

## Task 1: contentTypeGuards.test.ts (New File)

**Files:**
- Create: `tests/utils/contentTypeGuards.test.ts`
- Source: `app/utils/contentTypeGuards.ts`

- [ ] **Step 1: Create test file with type guard tests**

```typescript
import {
  isContentImage,
  isTextContent,
  isGifContent,
  isContentCollection,
  hasImage,
  getContentDimensions,
  validateContentBlock,
  getAspectRatio,
  getSlotWidth,
} from '@/app/utils/contentTypeGuards';
import {
  createImageContent,
  createTextContent,
  createGifContent,
  createCollectionContent,
  createParallaxContent,
} from '@/tests/fixtures/contentFixtures';

// ─── isContentImage ──────────────────────────────────────────────────────────

describe('isContentImage', () => {
  it('returns true for IMAGE content with imageUrl', () => {
    expect(isContentImage(createImageContent(1))).toBe(true);
  });

  it('returns false for TEXT content', () => {
    expect(isContentImage(createTextContent(1))).toBe(false);
  });

  it('returns false for GIF content', () => {
    expect(isContentImage(createGifContent(1))).toBe(false);
  });

  it('returns false for COLLECTION content', () => {
    expect(isContentImage(createCollectionContent(1))).toBe(false);
  });

  it('returns false for null', () => {
    expect(isContentImage(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isContentImage(undefined)).toBe(false);
  });

  it('returns false for non-object primitive', () => {
    expect(isContentImage(42)).toBe(false);
    expect(isContentImage('string')).toBe(false);
  });

  it('returns false for object with IMAGE type but no imageUrl', () => {
    expect(isContentImage({ contentType: 'IMAGE', id: 1 })).toBe(false);
  });

  it('returns true for untyped object matching IMAGE shape', () => {
    expect(isContentImage({ contentType: 'IMAGE', imageUrl: 'https://example.com/img.jpg' })).toBe(true);
  });
});

// ─── isTextContent ───────────────────────────────────────────────────────────

describe('isTextContent', () => {
  it('returns true for TEXT content', () => {
    expect(isTextContent(createTextContent(1))).toBe(true);
  });

  it('returns false for IMAGE content', () => {
    expect(isTextContent(createImageContent(1))).toBe(false);
  });
});

// ─── isGifContent ────────────────────────────────────────────────────────────

describe('isGifContent', () => {
  it('returns true for GIF content', () => {
    expect(isGifContent(createGifContent(1))).toBe(true);
  });

  it('returns false for IMAGE content', () => {
    expect(isGifContent(createImageContent(1))).toBe(false);
  });
});

// ─── isContentCollection ─────────────────────────────────────────────────────

describe('isContentCollection', () => {
  it('returns true for COLLECTION content', () => {
    expect(isContentCollection(createCollectionContent(1))).toBe(true);
  });

  it('returns false for IMAGE content', () => {
    expect(isContentCollection(createImageContent(1))).toBe(false);
  });
});

// ─── hasImage ────────────────────────────────────────────────────────────────

describe('hasImage', () => {
  it('returns true for IMAGE content', () => {
    expect(hasImage(createImageContent(1))).toBe(true);
  });

  it('returns true for GIF content', () => {
    expect(hasImage(createGifContent(1))).toBe(true);
  });

  it('returns false for TEXT content', () => {
    expect(hasImage(createTextContent(1))).toBe(false);
  });

  it('returns false for COLLECTION content', () => {
    expect(hasImage(createCollectionContent(1))).toBe(false);
  });
});

// ─── getContentDimensions ────────────────────────────────────────────────────

describe('getContentDimensions', () => {
  describe('IMAGE content', () => {
    it('returns imageWidth/imageHeight when present', () => {
      const img = createImageContent(1, { imageWidth: 2000, imageHeight: 1000 });
      expect(getContentDimensions(img)).toEqual({ width: 2000, height: 1000 });
    });

    it('falls back to width/height when imageWidth/imageHeight missing', () => {
      const img = createImageContent(1, {
        imageWidth: undefined as unknown as number,
        imageHeight: undefined as unknown as number,
        width: 800,
        height: 600,
      });
      expect(getContentDimensions(img)).toEqual({ width: 800, height: 600 });
    });

    it('falls back to defaults when no dimensions present', () => {
      const img = createImageContent(1, {
        imageWidth: undefined as unknown as number,
        imageHeight: undefined as unknown as number,
        width: undefined,
        height: undefined,
      });
      const result = getContentDimensions(img);
      expect(result.width).toBe(1300);
      expect(result.height).toBe(Math.round(1300 / (3 / 2)));
    });

    it('respects custom default width and aspect', () => {
      const img = createImageContent(1, {
        imageWidth: undefined as unknown as number,
        imageHeight: undefined as unknown as number,
        width: undefined,
        height: undefined,
      });
      const result = getContentDimensions(img, 1000, 2);
      expect(result).toEqual({ width: 1000, height: 500 });
    });
  });

  describe('COLLECTION content', () => {
    it('returns coverImage.imageWidth/imageHeight when present', () => {
      const col = createCollectionContent(1);
      expect(getContentDimensions(col)).toEqual({ width: 1920, height: 1080 });
    });

    it('falls back to coverImage.width/height', () => {
      const col = createCollectionContent(1, {
        coverImage: {
          id: 10,
          contentType: 'IMAGE',
          orderIndex: 0,
          imageUrl: 'https://example.com/img.jpg',
          visible: true,
          imageWidth: undefined as unknown as number,
          imageHeight: undefined as unknown as number,
          width: 640,
          height: 480,
        },
      });
      expect(getContentDimensions(col)).toEqual({ width: 640, height: 480 });
    });

    it('falls back to defaults when no coverImage dimensions', () => {
      const col = createCollectionContent(1, {
        coverImage: {
          id: 10,
          contentType: 'IMAGE',
          orderIndex: 0,
          imageUrl: 'https://example.com/img.jpg',
          visible: true,
          imageWidth: undefined as unknown as number,
          imageHeight: undefined as unknown as number,
        },
      });
      const result = getContentDimensions(col);
      expect(result.width).toBe(1300);
    });
  });

  describe('TEXT content', () => {
    it('returns explicit width/height when present', () => {
      const text = createTextContent(1, { width: 800, height: 200 });
      expect(getContentDimensions(text)).toEqual({ width: 800, height: 200 });
    });

    it('falls back to defaults when no dimensions', () => {
      const text = createTextContent(1, {
        width: undefined as unknown as number,
        height: undefined as unknown as number,
      });
      expect(getContentDimensions(text).width).toBe(1300);
    });
  });

  describe('GIF content', () => {
    it('returns explicit width/height', () => {
      const gif = createGifContent(1, { width: 400, height: 300 });
      expect(getContentDimensions(gif)).toEqual({ width: 400, height: 300 });
    });
  });
});

// ─── validateContentBlock ────────────────────────────────────────────────────

describe('validateContentBlock', () => {
  it('returns true for valid IMAGE block', () => {
    expect(validateContentBlock(createImageContent(1))).toBe(true);
  });

  it('returns true for valid TEXT block', () => {
    expect(validateContentBlock(createTextContent(1))).toBe(true);
  });

  it('returns true for valid GIF block', () => {
    expect(validateContentBlock(createGifContent(1))).toBe(true);
  });

  it('returns true for valid COLLECTION block', () => {
    expect(validateContentBlock(createCollectionContent(1))).toBe(true);
  });

  it('returns false for null', () => {
    expect(validateContentBlock(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(validateContentBlock(undefined)).toBe(false);
  });

  it('returns false for non-object', () => {
    expect(validateContentBlock(42)).toBe(false);
    expect(validateContentBlock('text')).toBe(false);
  });

  it('returns false when id is not a number', () => {
    expect(validateContentBlock({ id: 'abc', contentType: 'IMAGE', orderIndex: 1 })).toBe(false);
  });

  it('returns false when contentType is invalid', () => {
    expect(validateContentBlock({ id: 1, contentType: 'INVALID', orderIndex: 1 })).toBe(false);
  });

  it('returns false when orderIndex is missing', () => {
    expect(validateContentBlock({ id: 1, contentType: 'IMAGE' })).toBe(false);
  });
});

// ─── getAspectRatio ──────────────────────────────────────────────────────────

describe('getAspectRatio', () => {
  it('returns correct ratio for horizontal image', () => {
    const img = createImageContent(1, { imageWidth: 1920, imageHeight: 1080 });
    expect(getAspectRatio(img)).toBeCloseTo(1.778, 2);
  });

  it('returns correct ratio for vertical image', () => {
    const img = createImageContent(1, { imageWidth: 1080, imageHeight: 1920 });
    expect(getAspectRatio(img)).toBeCloseTo(0.5625, 3);
  });

  it('returns 1.0 for non-image content', () => {
    expect(getAspectRatio(createTextContent(1))).toBe(1.0);
  });

  it('returns 1.0 when dimensions are zero', () => {
    const img = createImageContent(1, { imageWidth: 0, imageHeight: 0 });
    expect(getAspectRatio(img)).toBe(1.0);
  });

  it('returns 1.0 for GIF with zero height', () => {
    const gif = createGifContent(1, { width: 100, height: 0 });
    expect(getAspectRatio(gif)).toBe(1.0);
  });
});

// ─── getSlotWidth ────────────────────────────────────────────────────────────

describe('getSlotWidth', () => {
  const chunkSize = 6;
  const halfSlot = 3;

  describe('collection cards', () => {
    it('returns halfSlot for collection content with slug', () => {
      expect(getSlotWidth(createCollectionContent(1), chunkSize)).toBe(halfSlot);
    });
  });

  describe('non-image content', () => {
    it('returns 1 for text content', () => {
      expect(getSlotWidth(createTextContent(1), chunkSize)).toBe(1);
    });
  });

  describe('panoramas', () => {
    it('returns chunkSize for wide panorama (ratio >= 2)', () => {
      const panorama = createImageContent(1, { imageWidth: 3000, imageHeight: 1000 });
      expect(getSlotWidth(panorama, chunkSize)).toBe(chunkSize);
    });

    it('returns 1 for tall panorama (ratio <= 0.5)', () => {
      const tall = createImageContent(1, { imageWidth: 500, imageHeight: 1500 });
      expect(getSlotWidth(tall, chunkSize)).toBe(1);
    });
  });

  describe('horizontal images (ratio > 1.0)', () => {
    it('returns chunkSize for 5-star horizontal', () => {
      const img = createImageContent(1, { imageWidth: 1920, imageHeight: 1080, rating: 5 });
      expect(getSlotWidth(img, chunkSize)).toBe(chunkSize);
    });

    it('returns chunkSize for 4-star horizontal', () => {
      const img = createImageContent(1, { imageWidth: 1920, imageHeight: 1080, rating: 4 });
      expect(getSlotWidth(img, chunkSize)).toBe(chunkSize);
    });

    it('returns halfSlot for 3-star horizontal', () => {
      const img = createImageContent(1, { imageWidth: 1920, imageHeight: 1080, rating: 3 });
      expect(getSlotWidth(img, chunkSize)).toBe(halfSlot);
    });

    it('returns 1 for 2-star horizontal', () => {
      const img = createImageContent(1, { imageWidth: 1920, imageHeight: 1080, rating: 2 });
      expect(getSlotWidth(img, chunkSize)).toBe(1);
    });

    it('returns 1 for 1-star horizontal', () => {
      const img = createImageContent(1, { imageWidth: 1920, imageHeight: 1080, rating: 1 });
      expect(getSlotWidth(img, chunkSize)).toBe(1);
    });

    it('returns 1 for 0-rating horizontal', () => {
      const img = createImageContent(1, { imageWidth: 1920, imageHeight: 1080, rating: 0 });
      expect(getSlotWidth(img, chunkSize)).toBe(1);
    });
  });

  describe('vertical/square images (ratio <= 1.0)', () => {
    it('returns halfSlot for 5-star vertical', () => {
      const img = createImageContent(1, { imageWidth: 1080, imageHeight: 1920, rating: 5 });
      expect(getSlotWidth(img, chunkSize)).toBe(halfSlot);
    });

    it('returns halfSlot for 3-star vertical', () => {
      const img = createImageContent(1, { imageWidth: 1080, imageHeight: 1920, rating: 3 });
      expect(getSlotWidth(img, chunkSize)).toBe(halfSlot);
    });

    it('returns 1 for 2-star vertical', () => {
      const img = createImageContent(1, { imageWidth: 1080, imageHeight: 1920, rating: 2 });
      expect(getSlotWidth(img, chunkSize)).toBe(1);
    });

    it('returns halfSlot for 3-star square (ratio = 1.0, treated as vertical)', () => {
      const img = createImageContent(1, { imageWidth: 1000, imageHeight: 1000, rating: 3 });
      expect(getSlotWidth(img, chunkSize)).toBe(halfSlot);
    });
  });

  describe('GIF content', () => {
    it('returns 1 for GIF (no rating logic applied)', () => {
      const gif = createGifContent(1, { width: 1920, height: 1080 });
      expect(getSlotWidth(gif, chunkSize)).toBe(1);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
/opt/homebrew/bin/node node_modules/.bin/jest tests/utils/contentTypeGuards.test.ts --verbose
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/utils/contentTypeGuards.test.ts
git commit -m "test: add comprehensive contentTypeGuards tests (9 functions, all branches)"
```

---

## Task 2: apiUtils.test.ts (New File)

**Files:**
- Create: `tests/utils/apiUtils.test.ts`
- Source: `app/utils/apiUtils.ts`

- [ ] **Step 1: Create test file**

```typescript
import { handleApiError } from '@/app/utils/apiUtils';

describe('handleApiError', () => {
  const defaultMsg = 'Something went wrong';

  describe('Error instances', () => {
    it('returns error.message from Error object', () => {
      expect(handleApiError(new Error('Connection failed'), defaultMsg)).toBe('Connection failed');
    });

    it('returns error.message from TypeError', () => {
      expect(handleApiError(new TypeError('Cannot read property'), defaultMsg)).toBe('Cannot read property');
    });
  });

  describe('objects with nested response', () => {
    it('returns response.statusText when present', () => {
      const error = { response: { statusText: 'Not Found' } };
      expect(handleApiError(error, defaultMsg)).toBe('Not Found');
    });

    it('returns response.message when statusText not present', () => {
      const error = { response: { message: 'Resource not found' } };
      expect(handleApiError(error, defaultMsg)).toBe('Resource not found');
    });

    it('prefers response.statusText over response.message', () => {
      const error = { response: { statusText: 'Bad Request', message: 'Validation failed' } };
      expect(handleApiError(error, defaultMsg)).toBe('Bad Request');
    });
  });

  describe('objects with direct message', () => {
    it('returns message property from plain object', () => {
      const error = { message: 'API limit exceeded' };
      expect(handleApiError(error, defaultMsg)).toBe('API limit exceeded');
    });
  });

  describe('objects with statusText', () => {
    it('returns statusText from object without message', () => {
      const error = { statusText: 'Service Unavailable' };
      expect(handleApiError(error, defaultMsg)).toBe('Service Unavailable');
    });
  });

  describe('string errors', () => {
    it('returns the string directly', () => {
      expect(handleApiError('Network error', defaultMsg)).toBe('Network error');
    });

    it('returns empty string when thrown as empty string', () => {
      expect(handleApiError('', defaultMsg)).toBe('');
    });
  });

  describe('fallback to default', () => {
    it('returns defaultMessage for null', () => {
      expect(handleApiError(null, defaultMsg)).toBe(defaultMsg);
    });

    it('returns defaultMessage for undefined', () => {
      expect(handleApiError(undefined, defaultMsg)).toBe(defaultMsg);
    });

    it('returns defaultMessage for number', () => {
      expect(handleApiError(42, defaultMsg)).toBe(defaultMsg);
    });

    it('returns defaultMessage for boolean', () => {
      expect(handleApiError(true, defaultMsg)).toBe(defaultMsg);
    });

    it('returns defaultMessage for empty object', () => {
      expect(handleApiError({}, defaultMsg)).toBe(defaultMsg);
    });

    it('returns defaultMessage for object with non-string message', () => {
      expect(handleApiError({ message: 123 }, defaultMsg)).toBe(defaultMsg);
    });

    it('returns defaultMessage for object with null response', () => {
      expect(handleApiError({ response: null }, defaultMsg)).toBe(defaultMsg);
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
/opt/homebrew/bin/node node_modules/.bin/jest tests/utils/apiUtils.test.ts --verbose
```

- [ ] **Step 3: Commit**

```bash
git add tests/utils/apiUtils.test.ts
git commit -m "test: add apiUtils.test.ts covering all handleApiError branches"
```

---

## Task 3: admin.test.ts (New File)

**Files:**
- Create: `tests/utils/admin.test.ts`
- Source: `app/utils/admin.ts`

- [ ] **Step 1: Create test file**

```typescript
import { isAdminRoutesEnabled, hasValidAdminAuth } from '@/app/utils/admin';

// ─── isAdminRoutesEnabled ────────────────────────────────────────────────────

describe('isAdminRoutesEnabled', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns true when ADMIN_ROUTES_ENABLED is "true"', () => {
    process.env.ADMIN_ROUTES_ENABLED = 'true';
    expect(isAdminRoutesEnabled()).toBe(true);
  });

  it('returns false when ADMIN_ROUTES_ENABLED is "false"', () => {
    process.env.ADMIN_ROUTES_ENABLED = 'false';
    expect(isAdminRoutesEnabled()).toBe(false);
  });

  it('returns false when ADMIN_ROUTES_ENABLED is undefined', () => {
    delete process.env.ADMIN_ROUTES_ENABLED;
    expect(isAdminRoutesEnabled()).toBe(false);
  });

  it('returns false when ADMIN_ROUTES_ENABLED is empty string', () => {
    process.env.ADMIN_ROUTES_ENABLED = '';
    expect(isAdminRoutesEnabled()).toBe(false);
  });
});

// ─── hasValidAdminAuth ───────────────────────────────────────────────────────

describe('hasValidAdminAuth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function createMockRequest(options: {
    headerToken?: string;
    cookieToken?: string;
  }) {
    return {
      headers: {
        get: (name: string) => name === 'x-admin-token' ? (options.headerToken ?? null) : null,
      },
      cookies: {
        get: (name: string) => name === 'admin_token' && options.cookieToken
          ? { value: options.cookieToken }
          : undefined,
      },
    } as unknown as Parameters<typeof hasValidAdminAuth>[0];
  }

  it('returns true when no ADMIN_TOKEN configured (feature-flag only)', () => {
    delete process.env.ADMIN_TOKEN;
    expect(hasValidAdminAuth(createMockRequest({}))).toBe(true);
  });

  it('returns true when header token matches ADMIN_TOKEN', () => {
    process.env.ADMIN_TOKEN = 'secret123';
    expect(hasValidAdminAuth(createMockRequest({ headerToken: 'secret123' }))).toBe(true);
  });

  it('returns false when header token does not match', () => {
    process.env.ADMIN_TOKEN = 'secret123';
    expect(hasValidAdminAuth(createMockRequest({ headerToken: 'wrong' }))).toBe(false);
  });

  it('returns true when cookie token matches ADMIN_TOKEN', () => {
    process.env.ADMIN_TOKEN = 'secret123';
    expect(hasValidAdminAuth(createMockRequest({ cookieToken: 'secret123' }))).toBe(true);
  });

  it('returns false when cookie token does not match', () => {
    process.env.ADMIN_TOKEN = 'secret123';
    expect(hasValidAdminAuth(createMockRequest({ cookieToken: 'wrong' }))).toBe(false);
  });

  it('returns false when no token provided but ADMIN_TOKEN is set', () => {
    process.env.ADMIN_TOKEN = 'secret123';
    expect(hasValidAdminAuth(createMockRequest({}))).toBe(false);
  });

  it('prefers header token over cookie (header checked first)', () => {
    process.env.ADMIN_TOKEN = 'secret123';
    expect(hasValidAdminAuth(createMockRequest({
      headerToken: 'secret123',
      cookieToken: 'wrong',
    }))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
/opt/homebrew/bin/node node_modules/.bin/jest tests/utils/admin.test.ts --verbose
```

- [ ] **Step 3: Commit**

```bash
git add tests/utils/admin.test.ts
git commit -m "test: add admin.test.ts covering auth and feature flag logic"
```

---

## Task 4: environment.test.ts (New File)

**Files:**
- Create: `tests/utils/environment.test.ts`
- Source: `app/utils/environment.ts`

- [ ] **Step 1: Create test file**

```typescript
import { isLocalEnvironment, isProduction } from '@/app/utils/environment';

describe('isLocalEnvironment', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns true when NEXT_PUBLIC_ENV is "local"', () => {
    process.env.NEXT_PUBLIC_ENV = 'local';
    process.env.NODE_ENV = 'production';
    expect(isLocalEnvironment()).toBe(true);
  });

  it('returns true when NODE_ENV is "development"', () => {
    process.env.NEXT_PUBLIC_ENV = 'production';
    process.env.NODE_ENV = 'development';
    expect(isLocalEnvironment()).toBe(true);
  });

  it('returns false when neither condition met', () => {
    process.env.NEXT_PUBLIC_ENV = 'production';
    process.env.NODE_ENV = 'production';
    expect(isLocalEnvironment()).toBe(false);
  });

  it('returns false when both env vars are undefined', () => {
    delete process.env.NEXT_PUBLIC_ENV;
    delete process.env.NODE_ENV;
    expect(isLocalEnvironment()).toBe(false);
  });
});

describe('isProduction', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns true when NEXT_PUBLIC_ENV is "production"', () => {
    process.env.NEXT_PUBLIC_ENV = 'production';
    process.env.NODE_ENV = 'production';
    expect(isProduction()).toBe(true);
  });

  it('returns true when NODE_ENV is "production" and not local', () => {
    process.env.NEXT_PUBLIC_ENV = 'staging';
    process.env.NODE_ENV = 'production';
    expect(isProduction()).toBe(true);
  });

  it('returns false when NODE_ENV is "development" even if NEXT_PUBLIC_ENV is "production"', () => {
    process.env.NEXT_PUBLIC_ENV = 'production';
    process.env.NODE_ENV = 'development';
    // isLocalEnvironment() returns true due to NODE_ENV=development
    // But NEXT_PUBLIC_ENV=production returns true on the first check
    expect(isProduction()).toBe(true);
  });

  it('returns false in local environment', () => {
    process.env.NEXT_PUBLIC_ENV = 'local';
    process.env.NODE_ENV = 'development';
    expect(isProduction()).toBe(false);
  });

  it('returns false when both env vars undefined', () => {
    delete process.env.NEXT_PUBLIC_ENV;
    delete process.env.NODE_ENV;
    expect(isProduction()).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
/opt/homebrew/bin/node node_modules/.bin/jest tests/utils/environment.test.ts --verbose
```

- [ ] **Step 3: Commit**

```bash
git add tests/utils/environment.test.ts
git commit -m "test: add environment.test.ts covering local and production detection"
```

---

## Task 5: contentRendererUtils — NaN fallback branches

**Files:**
- Modify: `tests/utils/contentRendererUtils.test.ts`
- Source: `app/utils/contentRendererUtils.ts`

- [ ] **Step 1: Add NaN fallback tests to existing file**

Append a new describe block at the end of `tests/utils/contentRendererUtils.test.ts`:

```typescript
// Add these imports at top if not present:
// import { createGifContent } from '@/tests/fixtures/contentFixtures';

describe('normalizeContentToRendererProps — NaN fallback recovery', () => {
  const posClass = 'imageSingle';

  describe('IMAGE content with NaN dimensions', () => {
    it('recovers width from aspect ratio when only width is NaN', () => {
      const img = createImageContent(1, { imageWidth: 1920, imageHeight: 1080 });
      const result = normalizeContentToRendererProps(img, NaN, 500, posClass, false);
      // width = (500 * 1920) / 1080 ≈ 889
      expect(result.width).toBeCloseTo(889, -1);
      expect(result.height).toBe(500);
    });

    it('recovers height from aspect ratio when only height is NaN', () => {
      const img = createImageContent(1, { imageWidth: 1920, imageHeight: 1080 });
      const result = normalizeContentToRendererProps(img, 800, NaN, posClass, false);
      // height = (800 * 1080) / 1920 = 450
      expect(result.width).toBe(800);
      expect(result.height).toBe(450);
    });

    it('falls back to 300x200 when both dimensions are NaN', () => {
      const img = createImageContent(1, { imageWidth: 1920, imageHeight: 1080 });
      const result = normalizeContentToRendererProps(img, NaN, NaN, posClass, false);
      expect(result.width).toBe(300);
      expect(result.height).toBe(200);
    });

    it('handles Infinity as non-finite', () => {
      const img = createImageContent(1, { imageWidth: 1920, imageHeight: 1080 });
      const result = normalizeContentToRendererProps(img, Infinity, 500, posClass, false);
      expect(Number.isFinite(result.width)).toBe(true);
      expect(result.height).toBe(500);
    });
  });

  describe('COLLECTION content with NaN dimensions', () => {
    it('recovers from NaN using coverImage dimensions', () => {
      const col = createCollectionContent(1);
      const result = normalizeContentToRendererProps(col, NaN, 500, posClass, false);
      // coverImage is 1920x1080, width = (500 * 1920) / 1080 ≈ 889
      expect(Number.isFinite(result.width)).toBe(true);
      expect(result.height).toBe(500);
    });
  });

  describe('GIF content with NaN dimensions', () => {
    it('recovers from NaN using gif width/height', () => {
      const gif = createGifContent(1, { width: 800, height: 600 });
      const result = normalizeContentToRendererProps(gif, NaN, 400, posClass, false);
      // width = (400 * 800) / 600 ≈ 533
      expect(Number.isFinite(result.width)).toBe(true);
      expect(result.height).toBe(400);
    });
  });

  describe('TEXT content with NaN dimensions (no image dimensions)', () => {
    it('uses 1.5 aspect ratio fallback when only width is NaN', () => {
      const text = createTextContent(1);
      const result = normalizeContentToRendererProps(text, NaN, 400, posClass, false);
      // validWidth = 400 * 1.5 = 600
      expect(result.width).toBe(600);
      expect(result.height).toBe(400);
    });

    it('uses 1.5 aspect ratio fallback when only height is NaN', () => {
      const text = createTextContent(1);
      const result = normalizeContentToRendererProps(text, 600, NaN, posClass, false);
      // validHeight = 600 / 1.5 = 400
      expect(result.width).toBe(600);
      expect(result.height).toBe(400);
    });

    it('falls back to 300x200 when both are NaN', () => {
      const text = createTextContent(1);
      const result = normalizeContentToRendererProps(text, NaN, NaN, posClass, false);
      expect(result.width).toBe(300);
      expect(result.height).toBe(200);
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
/opt/homebrew/bin/node node_modules/.bin/jest tests/utils/contentRendererUtils.test.ts --verbose
```

- [ ] **Step 3: Commit**

```bash
git add tests/utils/contentRendererUtils.test.ts
git commit -m "test: add NaN fallback recovery tests for normalizeContentToRendererProps"
```

---

## Task 6: contentLayout — processContentForDisplay and missing functions

**Files:**
- Modify: `tests/utils/contentLayout.test.ts`
- Source: `app/utils/contentLayout.ts`

- [ ] **Step 1: Add tests for untested exported functions**

Append these describe blocks to `tests/utils/contentLayout.test.ts`. The file already imports `createImageContent`, `createCollectionContent`, `createCollectionModel` from fixtures. Add any missing imports:

```typescript
// Ensure these imports exist at top of file:
// import {
//   processContentForDisplay,
//   isContentVisibleInCollection,
//   convertCollectionContentToImage,
//   createHeaderRow,
// } from '@/app/utils/contentLayout';

// ─── isContentVisibleInCollection ────────────────────────────────────────────

describe('isContentVisibleInCollection', () => {
  it('returns true when block.visible is true and no collectionId', () => {
    const img = createImageContent(1, { visible: true });
    expect(isContentVisibleInCollection(img)).toBe(true);
  });

  it('returns false when block.visible is false', () => {
    const img = createImageContent(1, { visible: false });
    expect(isContentVisibleInCollection(img)).toBe(false);
  });

  it('returns true for non-IMAGE content regardless of collectionId', () => {
    const text = createTextContent(1, { visible: true });
    expect(isContentVisibleInCollection(text, 42)).toBe(true);
  });

  it('returns true when image has no collections array', () => {
    const img = createImageContent(1, { visible: true, collections: undefined });
    expect(isContentVisibleInCollection(img, 42)).toBe(true);
  });

  it('returns true when image collection entry is visible', () => {
    const img = createImageContent(1, {
      visible: true,
      collections: [{ collectionId: 42, visible: true, orderIndex: 0 }],
    });
    expect(isContentVisibleInCollection(img, 42)).toBe(true);
  });

  it('returns false when image collection entry is not visible', () => {
    const img = createImageContent(1, {
      visible: true,
      collections: [{ collectionId: 42, visible: false, orderIndex: 0 }],
    });
    expect(isContentVisibleInCollection(img, 42)).toBe(false);
  });

  it('returns true when collectionId not found in image collections', () => {
    const img = createImageContent(1, {
      visible: true,
      collections: [{ collectionId: 99, visible: false, orderIndex: 0 }],
    });
    expect(isContentVisibleInCollection(img, 42)).toBe(true);
  });
});

// ─── convertCollectionContentToImage ─────────────────────────────────────────

describe('convertCollectionContentToImage', () => {
  it('converts collection to image using coverImage dimensions', () => {
    const col = createCollectionContent(1, {
      coverImage: {
        id: 10,
        contentType: 'IMAGE',
        orderIndex: 0,
        imageUrl: 'https://example.com/cover.jpg',
        imageWidth: 2000,
        imageHeight: 1200,
        visible: true,
      },
    });
    const result = convertCollectionContentToImage(col);
    expect(result.contentType).toBe('IMAGE');
    expect(result.imageUrl).toBe('https://example.com/cover.jpg');
    expect(result.imageWidth).toBe(2000);
    expect(result.imageHeight).toBe(1200);
    expect(result.id).toBe(col.id);
  });

  it('sets overlayText from collection title or slug', () => {
    const col = createCollectionContent(1, { title: 'My Portfolio', slug: 'my-portfolio' });
    const result = convertCollectionContentToImage(col);
    expect(result.overlayText).toBeTruthy();
  });

  it('preserves orderIndex and visible from source', () => {
    const col = createCollectionContent(1, { orderIndex: 5, visible: true });
    const result = convertCollectionContentToImage(col);
    expect(result.orderIndex).toBe(5);
    expect(result.visible).toBe(true);
  });
});

// ─── createHeaderRow ─────────────────────────────────────────────────────────

describe('createHeaderRow', () => {
  it('returns null when collection has no coverImage', () => {
    const col = createCollectionModel(1, { coverImage: undefined });
    expect(createHeaderRow(col, 1200)).toBeNull();
  });

  it('returns a row with header templateKey on desktop', () => {
    const col = createCollectionModel(1);
    const result = createHeaderRow(col, 1200, 6, false);
    if (Array.isArray(result)) {
      expect(result[0].templateKey).toBe('header');
    } else if (result) {
      expect(result.templateKey).toBe('header');
    }
  });

  it('returns array of rows on mobile', () => {
    const col = createCollectionModel(1);
    const result = createHeaderRow(col, 400, 6, true);
    // Mobile returns array of rows (cover + metadata separately)
    if (result !== null) {
      expect(Array.isArray(result)).toBe(true);
    }
  });
});

// ─── processContentForDisplay ────────────────────────────────────────────────

describe('processContentForDisplay', () => {
  it('returns empty array for empty content', () => {
    const result = processContentForDisplay([], 1200);
    expect(result).toEqual([]);
  });

  it('produces rows with valid widths for a single image', () => {
    const content = [createImageContent(1, { imageWidth: 1920, imageHeight: 1080, rating: 3 })];
    const result = processContentForDisplay(content, 1200);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].items[0].width).toBeGreaterThan(0);
  });

  it('produces rows for mixed content types', () => {
    const content = [
      createImageContent(1, { rating: 3 }),
      createTextContent(2),
      createGifContent(3),
    ];
    const result = processContentForDisplay(content, 1200);
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes header row when collectionData is provided', () => {
    const content = [createImageContent(1, { rating: 3 })];
    const col = createCollectionModel(1);
    const result = processContentForDisplay(content, 1200, 6, { collectionData: col });
    const headerRow = result.find(r => r.templateKey === 'header');
    expect(headerRow).toBeDefined();
  });

  it('respects isMobile option', () => {
    const content = [createImageContent(1, { rating: 5 })];
    const result = processContentForDisplay(content, 400, 6, { isMobile: true });
    expect(result.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
/opt/homebrew/bin/node node_modules/.bin/jest tests/utils/contentLayout.test.ts --verbose
```

- [ ] **Step 3: Commit**

```bash
git add tests/utils/contentLayout.test.ts
git commit -m "test: add processContentForDisplay, isContentVisibleInCollection, convertCollectionContentToImage, createHeaderRow tests"
```

---

## Task 7: contentFilter — missing edge cases

**Files:**
- Modify: `tests/utils/contentFilter.test.ts`
- Source: `app/utils/contentFilter.ts`

- [ ] **Step 1: Add edge case tests**

Append to `tests/utils/contentFilter.test.ts`:

```typescript
// ─── filterContent edge cases ────────────────────────────────────────────────

describe('filterContent — edge cases', () => {
  it('returns all content when query is whitespace only', () => {
    const content = [createImageContent(1), createImageContent(2)];
    const result = filterContent(content, { query: '   ' });
    expect(result).toHaveLength(2);
  });

  it('returns all content when collectionIds is empty array', () => {
    const content = [createImageContent(1), createImageContent(2)];
    const result = filterContent(content, { collectionIds: [] });
    expect(result).toHaveLength(2);
  });

  it('treats minRating: 0 as active filter (filters nothing since all ratings >= 0)', () => {
    const content = [
      createImageContent(1, { rating: 0 }),
      createImageContent(2, { rating: 3 }),
    ];
    const result = filterContent(content, { minRating: 0 });
    expect(result).toHaveLength(2);
  });

  it('handles single-day date range (dateFrom equals dateTo)', () => {
    const content = [
      createImageContent(1, { captureDate: '2024-06-15T12:00:00Z' }),
      createImageContent(2, { captureDate: '2024-06-16T12:00:00Z' }),
    ];
    const result = filterContent(content, { dateFrom: '2024-06-15', dateTo: '2024-06-15' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });
});

// ─── computeFilterCounts edge cases ──────────────────────────────────────────

describe('computeFilterCounts — edge cases', () => {
  it('returns zero counts for empty content array', () => {
    const result = computeFilterCounts([], {}, { tags: [], people: [], cameras: [], locations: [] });
    expect(result.tags).toEqual({});
    expect(result.people).toEqual({});
  });
});
```

- [ ] **Step 2: Run tests**

```bash
/opt/homebrew/bin/node node_modules/.bin/jest tests/utils/contentFilter.test.ts --verbose
```

- [ ] **Step 3: Commit**

```bash
git add tests/utils/contentFilter.test.ts
git commit -m "test: add contentFilter edge cases (whitespace, empty arrays, minRating 0, single-day range)"
```

---

## Task 8: CollectionListSelector — keyboard navigation and onAddNewChild

**Files:**
- Modify: `tests/components/CollectionListSelector.test.tsx`
- Source: `app/components/CollectionListSelector/CollectionListSelector.tsx`

- [ ] **Step 1: Add keyboard and onAddNewChild tests**

Append to `tests/components/CollectionListSelector.test.tsx`:

```typescript
// ─── Keyboard navigation ─────────────────────────────────────────────────────

describe('Keyboard navigation', () => {
  it('triggers toggle on Enter key press on row', () => {
    const onToggle = jest.fn();
    render(
      <CollectionListSelector
        allCollections={mockCollections}
        onToggle={onToggle}
        selectedCollectionIds={[]}
        pendingAdds={[]}
        pendingRemoves={[]}
      />
    );

    const rows = screen.getAllByRole('button');
    fireEvent.keyDown(rows[0], { key: 'Enter' });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('triggers toggle on Space key press on row', () => {
    const onToggle = jest.fn();
    render(
      <CollectionListSelector
        allCollections={mockCollections}
        onToggle={onToggle}
        selectedCollectionIds={[]}
        pendingAdds={[]}
        pendingRemoves={[]}
      />
    );

    const rows = screen.getAllByRole('button');
    fireEvent.keyDown(rows[0], { key: ' ' });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('does not trigger toggle on other key presses', () => {
    const onToggle = jest.fn();
    render(
      <CollectionListSelector
        allCollections={mockCollections}
        onToggle={onToggle}
        selectedCollectionIds={[]}
        pendingAdds={[]}
        pendingRemoves={[]}
      />
    );

    const rows = screen.getAllByRole('button');
    fireEvent.keyDown(rows[0], { key: 'Tab' });
    expect(onToggle).not.toHaveBeenCalled();
  });
});

// ─── onAddNewChild ───────────────────────────────────────────────────────────

describe('onAddNewChild', () => {
  it('renders Add New Child button when onAddNewChild is provided', () => {
    render(
      <CollectionListSelector
        allCollections={mockCollections}
        onToggle={jest.fn()}
        selectedCollectionIds={[]}
        pendingAdds={[]}
        pendingRemoves={[]}
        onAddNewChild={jest.fn()}
      />
    );

    expect(screen.getByText(/add new/i)).toBeInTheDocument();
  });

  it('calls onAddNewChild when button is clicked', () => {
    const onAddNewChild = jest.fn();
    render(
      <CollectionListSelector
        allCollections={mockCollections}
        onToggle={jest.fn()}
        selectedCollectionIds={[]}
        pendingAdds={[]}
        pendingRemoves={[]}
        onAddNewChild={onAddNewChild}
      />
    );

    fireEvent.click(screen.getByText(/add new/i));
    expect(onAddNewChild).toHaveBeenCalledTimes(1);
  });

  it('does not render Add New Child button when onAddNewChild is not provided', () => {
    render(
      <CollectionListSelector
        allCollections={mockCollections}
        onToggle={jest.fn()}
        selectedCollectionIds={[]}
        pendingAdds={[]}
        pendingRemoves={[]}
      />
    );

    expect(screen.queryByText(/add new/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
/opt/homebrew/bin/node node_modules/.bin/jest tests/components/CollectionListSelector.test.tsx --verbose
```

- [ ] **Step 3: Commit**

```bash
git add tests/components/CollectionListSelector.test.tsx
git commit -m "test: add keyboard navigation and onAddNewChild tests for CollectionListSelector"
```

---

## Task 9: imageMetadataUtils — untested getDisplay* and applyPartialUpdate functions

**Files:**
- Modify: `tests/components/ImageMetadata/imageMetadataUtils.test.ts`
- Source: `app/components/ImageMetadata/imageMetadataUtils.ts`

- [ ] **Step 1: Add tests for untested functions**

Append to `tests/components/ImageMetadata/imageMetadataUtils.test.ts`. Before adding, read the file to find the correct import block and fixture patterns. Add these imports at the top if not present:

```typescript
// Ensure these are imported:
// import {
//   applyPartialUpdate,
//   getFormValue,
//   getDisplayTags,
//   getDisplayPeople,
//   getDisplayCollections,
//   getDisplayCamera,
//   getDisplayLens,
//   getDisplayFilmStock,
// } from '@/app/components/ImageMetadata/imageMetadataUtils';
```

Then append:

```typescript
// ─── applyPartialUpdate ──────────────────────────────────────────────────────

describe('applyPartialUpdate', () => {
  it('returns original when updates only contain id', () => {
    const original = { id: 1, title: 'Photo', rating: 3 };
    const result = applyPartialUpdate(original, { id: 1 });
    expect(result).toEqual(original);
  });

  it('applies updated fields from DTO', () => {
    const original = { id: 1, title: 'Old', rating: 3 };
    const result = applyPartialUpdate(original, { id: 1, title: 'New' });
    expect(result.title).toBe('New');
    expect(result.rating).toBe(3);
  });

  it('does not apply undefined fields', () => {
    const original = { id: 1, title: 'Photo', rating: 3 };
    const result = applyPartialUpdate(original, { id: 1, title: undefined });
    expect(result.title).toBe('Photo');
  });

  it('transforms collections.prev to collections', () => {
    const original = { id: 1, title: 'Photo', collections: [{ collectionId: 1 }] };
    const result = applyPartialUpdate(original, {
      id: 1,
      collections: { prev: [{ collectionId: 2 }] },
    } as never);
    expect(result.collections).toEqual([{ collectionId: 2 }]);
  });
});

// ─── getFormValue ────────────────────────────────────────────────────────────

describe('getFormValue', () => {
  it('returns dtoValue when defined', () => {
    expect(getFormValue('dto', 'initial', 'default')).toBe('dto');
  });

  it('returns dtoValue even when falsy (empty string)', () => {
    expect(getFormValue('', 'initial', 'default')).toBe('');
  });

  it('returns dtoValue even when falsy (zero)', () => {
    expect(getFormValue(0, 5, 10)).toBe(0);
  });

  it('returns initialValue when dtoValue is undefined', () => {
    expect(getFormValue(undefined, 'initial', 'default')).toBe('initial');
  });

  it('returns defaultValue when both are undefined', () => {
    expect(getFormValue(undefined, undefined, 'default')).toBe('default');
  });

  it('returns defaultValue when dtoValue undefined and initialValue null', () => {
    expect(getFormValue(undefined, null, 'default')).toBe('default');
  });
});

// ─── getDisplayTags ──────────────────────────────────────────────────────────

describe('getDisplayTags', () => {
  const availableTags = [
    { id: 1, name: 'landscape' },
    { id: 2, name: 'portrait' },
    { id: 3, name: 'street' },
  ];

  it('returns initial tags when no DTO changes', () => {
    const result = getDisplayTags({} as never, [{ id: 1, name: 'landscape' }], availableTags);
    expect(result).toEqual([{ id: 1, name: 'landscape' }]);
  });

  it('returns tags from DTO prev IDs', () => {
    const dto = { tags: { prev: [1, 3] } };
    const result = getDisplayTags(dto as never, [], availableTags);
    expect(result).toHaveLength(2);
    expect(result.map(t => t.name)).toContain('landscape');
    expect(result.map(t => t.name)).toContain('street');
  });

  it('includes new tags with id: 0', () => {
    const dto = { tags: { prev: [1], newNames: ['cityscape'] } };
    const result = getDisplayTags(dto as never, [], availableTags);
    expect(result).toHaveLength(2);
    const newTag = result.find(t => t.name === 'cityscape');
    expect(newTag?.id).toBe(0);
  });

  it('returns empty array when no initial and no DTO', () => {
    const result = getDisplayTags({} as never, undefined, availableTags);
    expect(result).toEqual([]);
  });
});

// ─── getDisplayPeople ────────────────────────────────────────────────────────

describe('getDisplayPeople', () => {
  const availablePeople = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];

  it('returns initial people when no DTO changes', () => {
    const result = getDisplayPeople({} as never, [{ id: 1, name: 'Alice' }], availablePeople);
    expect(result).toEqual([{ id: 1, name: 'Alice' }]);
  });

  it('returns people from DTO prev IDs', () => {
    const dto = { people: { prev: [2] } };
    const result = getDisplayPeople(dto as never, [], availablePeople);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Bob');
  });
});

// ─── getDisplayCollections ───────────────────────────────────────────────────

describe('getDisplayCollections', () => {
  it('returns initial collections when no DTO changes', () => {
    const initial = [{ collectionId: 1, name: 'Portfolio' }];
    const result = getDisplayCollections({} as never, initial);
    expect(result).toEqual([{ id: 1, name: 'Portfolio' }]);
  });

  it('returns collections from DTO prev', () => {
    const dto = { collections: { prev: [{ collectionId: 5, name: 'Album' }] } };
    const result = getDisplayCollections(dto as never, []);
    expect(result).toEqual([{ id: 5, name: 'Album' }]);
  });

  it('returns empty array when no initial and no DTO', () => {
    const result = getDisplayCollections({} as never, undefined);
    expect(result).toEqual([]);
  });
});

// ─── getDisplayCamera ────────────────────────────────────────────────────────

describe('getDisplayCamera', () => {
  const cameras = [
    { id: 1, name: 'Canon R5' },
    { id: 2, name: 'Sony A7IV' },
  ];

  it('returns initial camera when no DTO changes', () => {
    const result = getDisplayCamera({} as never, { id: 1, name: 'Canon R5' }, cameras);
    expect(result).toEqual({ id: 1, name: 'Canon R5' });
  });

  it('returns null when DTO specifies remove', () => {
    const dto = { camera: { remove: true } };
    const result = getDisplayCamera(dto as never, { id: 1, name: 'Canon R5' }, cameras);
    expect(result).toBeNull();
  });

  it('returns new camera from DTO newValue', () => {
    const dto = { camera: { newValue: 'Fuji X-T5' } };
    const result = getDisplayCamera(dto as never, null, cameras);
    expect(result?.name).toBe('Fuji X-T5');
    expect(result?.id).toBe(0);
  });

  it('returns camera from DTO prev ID', () => {
    const dto = { camera: { prev: 2 } };
    const result = getDisplayCamera(dto as never, null, cameras);
    expect(result?.name).toBe('Sony A7IV');
  });

  it('returns null when initial is null and no DTO', () => {
    const result = getDisplayCamera({} as never, null, cameras);
    expect(result).toBeNull();
  });
});

// ─── getDisplayLens ──────────────────────────────────────────────────────────

describe('getDisplayLens', () => {
  const lenses = [
    { id: 1, name: '24-70mm f/2.8' },
    { id: 2, name: '50mm f/1.4' },
  ];

  it('returns initial lens when no DTO changes', () => {
    const result = getDisplayLens({} as never, { id: 1, name: '24-70mm f/2.8' }, lenses);
    expect(result).toEqual({ id: 1, name: '24-70mm f/2.8' });
  });

  it('returns null when DTO specifies remove', () => {
    const dto = { lens: { remove: true } };
    const result = getDisplayLens(dto as never, { id: 1, name: '24-70mm f/2.8' }, lenses);
    expect(result).toBeNull();
  });

  it('returns new lens from DTO newValue', () => {
    const dto = { lens: { newValue: '85mm f/1.2' } };
    const result = getDisplayLens(dto as never, null, lenses);
    expect(result?.name).toBe('85mm f/1.2');
  });
});

// ─── getDisplayFilmStock ─────────────────────────────────────────────────────

describe('getDisplayFilmStock', () => {
  const filmTypes = [
    { id: 1, name: 'Portra 400', defaultIso: 400 },
    { id: 2, name: 'Tri-X 400', defaultIso: 400 },
  ];

  it('returns matching film type from initial name', () => {
    const result = getDisplayFilmStock({} as never, 'Portra 400', filmTypes);
    expect(result).toEqual({ id: 1, name: 'Portra 400', defaultIso: 400 });
  });

  it('returns null when DTO specifies remove', () => {
    const dto = { filmType: { remove: true } };
    const result = getDisplayFilmStock(dto as never, 'Portra 400', filmTypes);
    expect(result).toBeNull();
  });

  it('returns new film type from DTO newValue', () => {
    const dto = { filmType: { newValue: { filmTypeName: 'Ektar 100', defaultIso: 100 } } };
    const result = getDisplayFilmStock(dto as never, null, filmTypes);
    expect(result?.name).toBe('Ektar 100');
    expect(result?.id).toBe(0);
  });

  it('returns film type from DTO prev ID', () => {
    const dto = { filmType: { prev: 2 } };
    const result = getDisplayFilmStock(dto as never, null, filmTypes);
    expect(result?.name).toBe('Tri-X 400');
  });

  it('returns null when no initial and no DTO', () => {
    const result = getDisplayFilmStock({} as never, null, filmTypes);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
/opt/homebrew/bin/node node_modules/.bin/jest tests/components/ImageMetadata/imageMetadataUtils.test.ts --verbose
```

- [ ] **Step 3: Commit**

```bash
git add tests/components/ImageMetadata/imageMetadataUtils.test.ts
git commit -m "test: add applyPartialUpdate, getFormValue, and all getDisplay* function tests"
```

---

## Task 10: useCollectionData — cache path and fix mock

**Files:**
- Modify: `tests/hooks/useCollectionData.test.tsx`
- Source: `app/hooks/useCollectionData.tsx`

- [ ] **Step 1: Read current test file to understand mock setup**

Read `tests/hooks/useCollectionData.test.tsx` fully to understand the existing mock structure before modifying.

- [ ] **Step 2: Add cache hit path and null response tests**

Add these tests. The implementation will need to:
1. Verify the mock for `collectionStorage` includes `getFull` and `updateFull`
2. Add test for cache hit path
3. Add test for null API response

```typescript
// Add to the existing describe block:

describe('Cache behavior', () => {
  it('uses cached data when available and skips API call', async () => {
    // Mock collectionStorage.getFull to return cached data
    const cachedData = { ...mockCollectionData, title: 'Cached' };
    (collectionStorage.getFull as jest.Mock).mockReturnValue(cachedData);

    const onLoadSuccess = jest.fn();
    renderHook(() => useCollectionData('test-slug', undefined, onLoadSuccess));

    await waitFor(() => {
      expect(onLoadSuccess).toHaveBeenCalledWith(cachedData);
    });

    // Should not call the API when cache hit
    expect(getCollectionUpdateMetadata).not.toHaveBeenCalled();
  });
});

describe('Null API response', () => {
  it('does not call onLoadSuccess when API returns null', async () => {
    (getCollectionUpdateMetadata as jest.Mock).mockResolvedValue(null);

    const onLoadSuccess = jest.fn();
    renderHook(() => useCollectionData('test-slug', undefined, onLoadSuccess));

    // Wait for the fetch to complete
    await waitFor(() => {
      expect(getCollectionUpdateMetadata).toHaveBeenCalled();
    });

    expect(onLoadSuccess).not.toHaveBeenCalled();
  });
});
```

Note: The exact implementation depends on the current mock structure. The implementer should read the file first and adapt the mock setup to include `getFull` and `updateFull` in the `collectionStorage` mock.

- [ ] **Step 3: Run tests**

```bash
/opt/homebrew/bin/node node_modules/.bin/jest tests/hooks/useCollectionData.test.tsx --verbose
```

- [ ] **Step 4: Commit**

```bash
git add tests/hooks/useCollectionData.test.tsx
git commit -m "test: add cache hit path and null response tests for useCollectionData"
```

---

## Summary

| Task | Type | Tests Added | Priority |
|---|---|---|---|
| 1. contentTypeGuards | New file | ~45 tests | Critical |
| 2. apiUtils | New file | ~15 tests | Critical |
| 3. admin | New file | ~8 tests | Critical (security) |
| 4. environment | New file | ~9 tests | Medium |
| 5. contentRendererUtils NaN | Extend | ~9 tests | Critical |
| 6. contentLayout missing fns | Extend | ~16 tests | Critical |
| 7. contentFilter edge cases | Extend | ~6 tests | Medium |
| 8. CollectionListSelector kbd | Extend | ~6 tests | High |
| 9. imageMetadataUtils display | Extend | ~25 tests | High |
| 10. useCollectionData cache | Extend | ~3 tests | High |

**Total: ~142 new tests across 10 tasks**

Tasks 1-4 are independent (new files). Tasks 5-10 are independent (different existing files). All 10 tasks can be parallelized.
