/**
 * Unit tests for collections.ts
 * Tests collection API functions and response parsing
 */

import {
  createChildCollection as createChildCollectionApi,
  createCollection as createCollectionApi,
  getCollectionsByLocation,
  parseCollectionArrayResponse,
  reorderCollectionContent as reorderCollectionContentApi,
  saveCollectionFromTag,
  saveGalleryAccess,
  updateCollection as updateCollectionApi,
  updateCollectionRating as updateCollectionRatingApi,
  validateClientGalleryAccess,
} from '@/app/lib/api/collections';
import { ApiError } from '@/app/lib/api/core';
import * as core from '@/app/lib/api/core';
import { type CollectionModel } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';

// Mock fetch globally
global.fetch = jest.fn();

// Mock environment
jest.mock('@/app/utils/environment', () => ({
  isLocalEnvironment: jest.fn(() => false),
}));

// Spy on the edit-channel wrappers while leaving every other core export (including
// fetchAdminPostJsonApi/fetchAdminPatchJsonApi, used by the other functions under test in this
// file) as the real implementation backed by the mocked global.fetch above.
jest.mock('@/app/lib/api/core', () => ({
  ...jest.requireActual('@/app/lib/api/core'),
  fetchEditPostJsonApi: jest.fn(),
  fetchEditPatchJsonApi: jest.fn(),
}));

const mockSuccessResponse = (data: unknown) => ({
  ok: true,
  status: 200,
  json: jest.fn().mockResolvedValue(data),
  headers: new Headers({ 'content-type': 'application/json' }),
});

// Test fixtures
// Fixed timestamps keep the fixture deterministic: tests that build a collection twice (once for
// the mocked response, once for the expected value) must get byte-identical objects. `new Date()`
// straddled a millisecond boundary under full-suite CPU load, flaking the toEqual comparisons.
const FIXTURE_TIMESTAMP = '2026-01-01T00:00:00.000Z';
const createCollection = (id: number, overrides?: Partial<CollectionModel>): CollectionModel => ({
  id,
  slug: `collection-${id}`,
  title: `Collection ${id}`,
  description: `Description ${id}`,
  isClient: false,
  isBlog: false,
  visibility: CollectionVisibility.LISTED,
  locations: [],
  createdAt: FIXTURE_TIMESTAMP,
  updatedAt: FIXTURE_TIMESTAMP,
  ...overrides,
});

describe('parseCollectionArrayResponse', () => {
  describe('Direct array responses', () => {
    it('should return array when data is directly an array', () => {
      const data = [createCollection(1), createCollection(2), createCollection(3)];
      const result = parseCollectionArrayResponse(data);
      expect(result).toEqual(data);
    });

    it('should return empty array when data is empty array', () => {
      const result = parseCollectionArrayResponse([]);
      expect(result).toEqual([]);
    });

    it('should handle array with single item', () => {
      const data = [createCollection(1)];
      const result = parseCollectionArrayResponse(data);
      expect(result).toEqual(data);
    });
  });

  describe('Wrapped object responses', () => {
    it('should extract array from content property', () => {
      const collections = [createCollection(1), createCollection(2)];
      const data = { content: collections };
      const result = parseCollectionArrayResponse(data);
      expect(result).toEqual(collections);
    });

    it('should extract array from collections property', () => {
      const collections = [createCollection(1), createCollection(2)];
      const data = { collections };
      const result = parseCollectionArrayResponse(data);
      expect(result).toEqual(collections);
    });

    it('should extract array from items property', () => {
      const collections = [createCollection(1), createCollection(2)];
      const data = { items: collections };
      const result = parseCollectionArrayResponse(data);
      expect(result).toEqual(collections);
    });

    it('should prefer content over collections over items', () => {
      const content = [createCollection(1)];
      const collections = [createCollection(2)];
      const items = [createCollection(3)];
      const data = { content, collections, items };
      const result = parseCollectionArrayResponse(data);
      expect(result).toEqual(content);
    });
  });

  describe('Invalid responses', () => {
    it('should return empty array when data is null', () => {
      const result = parseCollectionArrayResponse(null);
      expect(result).toEqual([]);
    });

    it('should return empty array when data is undefined', () => {
      // eslint-disable-next-line unicorn/no-useless-undefined -- explicitly testing undefined input
      const result = parseCollectionArrayResponse(undefined);
      expect(result).toEqual([]);
    });

    it('should return empty array when data is empty object', () => {
      const result = parseCollectionArrayResponse({});
      expect(result).toEqual([]);
    });

    it('should return empty array when data is string', () => {
      const result = parseCollectionArrayResponse('invalid');
      expect(result).toEqual([]);
    });

    it('should return empty array when data is number', () => {
      const result = parseCollectionArrayResponse(123);
      expect(result).toEqual([]);
    });

    it('should return empty array when object has no array properties', () => {
      const data = {
        total: 10,
        page: 0,
        size: 20,
      };
      const result = parseCollectionArrayResponse(data);
      expect(result).toEqual([]);
    });

    it('should return empty array when object has non-array values for known properties', () => {
      const data = {
        content: 'not an array',
        collections: 123,
        items: null,
      };
      const result = parseCollectionArrayResponse(data);
      expect(result).toEqual([]);
    });
  });

  describe('Edge cases', () => {
    it('should handle object with multiple array properties (prefers content)', () => {
      const content = [createCollection(1)];
      const collections = [createCollection(2), createCollection(3)];
      const data = { content, collections };
      const result = parseCollectionArrayResponse(data);
      expect(result).toEqual(content);
    });

    it('should handle nested objects with array properties', () => {
      const collections = [createCollection(1)];
      const data = {
        response: {
          content: collections,
        },
        metadata: {},
      };
      // Note: This won't find nested arrays, only top-level properties
      const result = parseCollectionArrayResponse(data);
      expect(result).toEqual([]);
    });

    it('should preserve collection object structure', () => {
      const collection = createCollection(1, {
        isBlog: true,
        slug: 'test-slug',
      });
      const result = parseCollectionArrayResponse([collection]);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(collection);
      expect(result[0]?.isBlog).toBe(true);
    });
  });
});

describe('getCollectionsByLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw when slug is empty', async () => {
    await expect(getCollectionsByLocation('')).rejects.toThrow('location slug is required');
  });

  it('should fetch collections for a location slug', async () => {
    const collections = [createCollection(1), createCollection(2)];
    (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse(collections));

    const result = await getCollectionsByLocation('seattle');
    expect(result).toEqual(collections);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/collections/location/seattle'),
      expect.any(Object)
    );
  });

  it('should return empty array on 404', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: jest.fn().mockResolvedValue({ message: 'Not found' }),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    const result = await getCollectionsByLocation('nonexistent');
    expect(result).toEqual([]);
  });
});

describe('validateClientGalleryAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when slug is missing', async () => {
    await expect(validateClientGalleryAccess('', 'pw')).rejects.toThrow('slug is required');
  });

  it('throws when password is missing', async () => {
    await expect(validateClientGalleryAccess('smith-wedding', '')).rejects.toThrow(
      'password is required'
    );
  });

  it('routes through the BFF proxy with credentials and JSON body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockResolvedValue({ hasAccess: true }),
    });

    const result = await validateClientGalleryAccess('smith-wedding', 'super-secret');

    expect(result).toEqual({ hasAccess: true });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/proxy/api/read/collections/smith-wedding/access',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'super-secret' }),
        cache: 'no-store',
      })
    );
  });

  it('encodes the slug in the URL', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockResolvedValue({ hasAccess: true }),
    });

    await validateClientGalleryAccess('a b/c', 'pw');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/proxy/api/read/collections/a%20b%2Fc/access',
      expect.any(Object)
    );
  });

  it('returns the {hasAccess} body without exposing any token', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockResolvedValue({ hasAccess: false }),
    });

    const result = await validateClientGalleryAccess('smith-wedding', 'wrong');

    expect(result).toEqual({ hasAccess: false });
    expect((result as Record<string, unknown>).accessToken).toBeUndefined();
  });

  it('throws ApiError with status 429 when rate-limited', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockResolvedValue({ message: 'Too Many Requests' }),
    });

    await expect(validateClientGalleryAccess('smith-wedding', 'pw')).rejects.toMatchObject({
      name: 'ApiError',
      status: 429,
    });
  });

  it('throws ApiError with status 404 when gallery not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockResolvedValue({ message: 'Not found' }),
    });

    await expect(validateClientGalleryAccess('missing', 'pw')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
    });
  });

  it('throws ApiError with the response status on 403', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockResolvedValue({ message: 'Forbidden' }),
    });

    let caught: unknown;
    try {
      await validateClientGalleryAccess('smith-wedding', 'pw');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(403);
  });

  // FE-C1: runtime-validate the response shape so a backend regression can't silently
  // flip the gate to "unlocked" without proof of access.
  it('throws ApiError when response body is missing hasAccess key', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockResolvedValue({}),
    });

    await expect(validateClientGalleryAccess('smith-wedding', 'pw')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Unexpected response shape from /access',
    });
  });

  it('throws ApiError when hasAccess is a string instead of boolean', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockResolvedValue({ hasAccess: 'true' }),
    });

    await expect(validateClientGalleryAccess('smith-wedding', 'pw')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Unexpected response shape from /access',
    });
  });
});

describe('saveGalleryAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POSTs to the gallery-access endpoint with password only', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        saved: true,
        emailsSent: false,
        reason: null,
        password: 'gallery-pw',
        emails: [],
      }),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    const result = await saveGalleryAccess(42, { password: 'gallery-pw' });

    expect(result).toEqual({
      saved: true,
      emailsSent: false,
      reason: null,
      password: 'gallery-pw',
      emails: [],
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/collections/42/gallery-access'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ password: 'gallery-pw' }),
      })
    );
  });

  it('POSTs with emails array when recipients are provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        saved: true,
        emailsSent: true,
        reason: null,
        password: 'gallery-pw',
        emails: ['client@example.com'],
      }),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    const result = await saveGalleryAccess(42, {
      password: 'gallery-pw',
      emails: ['client@example.com'],
    });

    expect(result).toEqual({
      saved: true,
      emailsSent: true,
      reason: null,
      password: 'gallery-pw',
      emails: ['client@example.com'],
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/collections/42/gallery-access'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ password: 'gallery-pw', emails: ['client@example.com'] }),
      })
    );
  });

  it('sends null password to clear the gallery password', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        saved: true,
        emailsSent: false,
        reason: null,
        password: null,
        emails: [],
      }),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    await saveGalleryAccess(9, { password: null });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/collections/9/gallery-access'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ password: null }),
      })
    );
  });

  it('returns {emailsSent: false, reason} when email is disabled on the backend', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        saved: true,
        emailsSent: false,
        reason: 'email-disabled',
        password: 'pw',
        emails: ['a@b.com'],
      }),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    const result = await saveGalleryAccess(7, {
      password: 'pw',
      emails: ['a@b.com'],
    });

    expect(result).toEqual({
      saved: true,
      emailsSent: false,
      reason: 'email-disabled',
      password: 'pw',
      emails: ['a@b.com'],
    });
  });

  it('throws ApiError when saved is false', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest
        .fn()
        .mockResolvedValue({ saved: false, emailsSent: false, reason: 'validation-error' }),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    await expect(saveGalleryAccess(9, { password: 'pw' })).rejects.toBeInstanceOf(ApiError);
  });

  it('throws ApiError when the HTTP response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({ message: 'Internal error' }),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    await expect(saveGalleryAccess(9, { password: 'pw' })).rejects.toBeInstanceOf(ApiError);
  });
});

describe('saveCollectionFromTag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POSTs the visibility body verbatim (no derived flags, no type)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockSuccessResponse({ collection: createCollection(3) })
    );

    const result = await saveCollectionFromTag(5, {
      visibility: CollectionVisibility.UNLISTED,
    });

    expect(result).toEqual({ collection: createCollection(3) });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/tags/5/save-as-collection'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ visibility: CollectionVisibility.UNLISTED }),
      })
    );
  });

  it('POSTs an empty object when no body is provided (backend applies defaults)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockSuccessResponse({ collection: createCollection(3) })
    );

    await saveCollectionFromTag(7);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/tags/7/save-as-collection'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({}) })
    );
  });

  it('throws ApiError when the response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 409,
      json: jest.fn().mockResolvedValue({ message: 'Already exists' }),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    await expect(saveCollectionFromTag(5)).rejects.toBeInstanceOf(ApiError);
  });
});

describe('admin kind writes — boolean-only wire contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createCollection sends the body verbatim, with no derived flags added', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockSuccessResponse({ collection: createCollection(1) })
    );

    await createCollectionApi({ title: 'Smith Wedding', isClient: true });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/collections/createCollection'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'Smith Wedding', isClient: true }),
      })
    );
  });

  it('createCollection sends no kind keys at all for an ordinary collection', async () => {
    // PORTFOLIO has no successor concept under the typeless model, so there is nothing to send:
    // an ordinary collection is simply one that is neither a client gallery nor a blog.
    (global.fetch as jest.Mock).mockResolvedValue(
      mockSuccessResponse({ collection: createCollection(1) })
    );

    await createCollectionApi({ title: 'Film Pack 002' });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/collections/createCollection'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'Film Pack 002' }),
      })
    );
  });

  it('updateCollection sends isBlog verbatim', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockSuccessResponse({ collection: createCollection(9) })
    );

    await updateCollectionApi(9, { id: 9, isBlog: true });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/collections/9'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ id: 9, isBlog: true }),
      })
    );
  });

  it('updateCollection sends an explicit false so a demotion is not swallowed', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockSuccessResponse({ collection: createCollection(9) })
    );

    await updateCollectionApi(9, { id: 9, isClient: false });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/collections/9'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ id: 9, isClient: false }),
      })
    );
  });

  it('updateCollection adds nothing to a metadata-only body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockSuccessResponse({ collection: createCollection(9) })
    );

    await updateCollectionApi(9, { id: 9, title: 'Renamed' });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/collections/9'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ id: 9, title: 'Renamed' }),
      })
    );
  });

  it('createChildCollection sends the body verbatim', async () => {
    // Was: "sends type: PORTFOLIO to the wire (the MISC regression this prevents)". Under the
    // typeless model MISC and PORTFOLIO are the same thing — an ordinary collection — so the
    // regression this pinned no longer exists. What still matters is that the child-creation
    // path does not silently gain or lose kind keys.
    (global.fetch as jest.Mock).mockResolvedValue(
      mockSuccessResponse({ collection: createCollection(4) })
    );

    await createChildCollectionApi(3, { title: 'New Child Collection' });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/collections/3/child'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'New Child Collection' }),
      })
    );
  });

  it('createChildCollection carries isClient through when a child gallery is created', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockSuccessResponse({ collection: createCollection(4) })
    );

    await createChildCollectionApi(3, { title: 'Smith Wedding', isClient: true });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/collections/3/child'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'Smith Wedding', isClient: true }),
      })
    );
  });
});

describe('reorderCollectionContent / updateCollectionRating — edit tier contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Fallback for the pre-fix code path, which still calls the real (unmocked)
    // fetchAdminPostJsonApi/fetchAdminPatchJsonApi backed by this mocked fetch.
    (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse({}));
  });

  it('reorderCollectionContent calls fetchEditPostJsonApi with /collections/{id}/reorder', async () => {
    const reorders = [{ contentId: 1, newOrderIndex: 0 }];

    await reorderCollectionContentApi(5, reorders);

    expect(core.fetchEditPostJsonApi).toHaveBeenCalledWith('/collections/5/reorder', {
      reorders,
    });
  });

  it('updateCollectionRating calls fetchEditPatchJsonApi with /collections/{id}/rating', async () => {
    await updateCollectionRatingApi(5, 3);

    expect(core.fetchEditPatchJsonApi).toHaveBeenCalledWith('/collections/5/rating', {
      rating: 3,
    });
  });
});
