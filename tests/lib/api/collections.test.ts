/**
 * Unit tests for collections.ts
 * Tests collection API functions and response parsing
 */

import {
  getCollectionsByLocation,
  parseCollectionArrayResponse,
  saveGalleryAccess,
  validateClientGalleryAccess,
} from '@/app/lib/api/collections';
import { ApiError } from '@/app/lib/api/core';
import { type CollectionModel, CollectionType } from '@/app/types/Collection';

// Mock fetch globally
global.fetch = jest.fn();

// Mock environment
jest.mock('@/app/utils/environment', () => ({
  isLocalEnvironment: jest.fn(() => false),
}));

const mockSuccessResponse = (data: unknown) => ({
  ok: true,
  status: 200,
  json: jest.fn().mockResolvedValue(data),
  headers: new Headers({ 'content-type': 'application/json' }),
});

// Test fixtures
const createCollection = (id: number, overrides?: Partial<CollectionModel>): CollectionModel => ({
  id,
  slug: `collection-${id}`,
  title: `Collection ${id}`,
  description: `Description ${id}`,
  type: CollectionType.PORTFOLIO,
  visible: true,
  locations: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
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
        title: 'Test Collection',
        description: 'Test Description',
        type: CollectionType.BLOG,
        visible: false,
      });
      const data = [collection];
      const result = parseCollectionArrayResponse(data);
      expect(result[0]).toEqual(collection);
      expect(result[0]?.title).toBe('Test Collection');
      expect(result[0]?.type).toBe(CollectionType.BLOG);
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
      json: jest
        .fn()
        .mockResolvedValue({ saved: true, emailsSent: false, reason: null, password: 'gallery-pw', emails: [] }),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    const result = await saveGalleryAccess(42, { password: 'gallery-pw' });

    expect(result).toEqual({ saved: true, emailsSent: false, reason: null, password: 'gallery-pw', emails: [] });
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
      json: jest
        .fn()
        .mockResolvedValue({ saved: true, emailsSent: false, reason: null, password: null, emails: [] }),
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
