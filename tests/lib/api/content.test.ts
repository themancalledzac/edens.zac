/**
 * Tests for content.ts API functions
 * Tests read and admin content API endpoints
 */
import {
  createImages,
  createTextContent,
  deleteImages,
  getAllImages,
  getAllLocations,
  getAllTags,
  searchImages,
  updateImages,
} from '@/app/lib/api/content';
import { logger } from '@/app/utils/logger';

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

describe('Read Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTags', () => {
    it('should fetch and return tags normalized to ContentTagModel', async () => {
      const rawTags = [
        { id: 1, tagName: 'landscape', slug: 'landscape' },
        { id: 2, tagName: 'portrait', slug: 'portrait' },
      ];
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse(rawTags));

      const result = await getAllTags();
      expect(result).toEqual([
        { id: 1, name: 'landscape', slug: 'landscape' },
        { id: 2, name: 'portrait', slug: 'portrait' },
      ]);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/content/tags'),
        expect.any(Object)
      );
    });
  });

  describe('getAllLocations', () => {
    it('should fetch and return locations', async () => {
      const locations = [
        { id: 1, name: 'Seattle', slug: 'seattle', count: 42 },
        { id: 2, name: 'Portland', slug: 'portland', count: 15 },
      ];
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse(locations));

      const result = await getAllLocations();
      expect(result).toEqual(locations);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/content/locations'),
        expect.any(Object)
      );
    });
  });

  describe('searchImages', () => {
    it('should return images from array response', async () => {
      const images = [{ id: 1, contentType: 'IMAGE', imageUrl: 'https://example.com/1.jpg' }];
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse(images));

      const result = await searchImages({ locationId: 1 });
      expect(result).toEqual(images);
    });

    it('should unwrap paginated response with content property', async () => {
      const images = [{ id: 1, contentType: 'IMAGE', imageUrl: 'https://example.com/1.jpg' }];
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse({ content: images }));

      const result = await searchImages({ tagIds: [1, 2] });
      expect(result).toEqual(images);
    });

    it('should return empty array for null response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse(null));

      const result = await searchImages({});
      expect(result).toEqual([]);
    });

    it('should throw for unrecognized response shape', async () => {
      const spy = jest.spyOn(logger, 'error').mockImplementation(() => {});
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse({ data: [] }));

      await expect(searchImages({ cameraId: 1 })).rejects.toThrow(
        '[searchImages] Unexpected response shape'
      );
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should build query params from search params', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse([]));

      await searchImages({ locationId: 5, size: 100, isFilm: true });
      const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(calledUrl).toContain('locationId=5');
      expect(calledUrl).toContain('size=100');
      expect(calledUrl).toContain('isFilm=true');
    });

    it('should produce no query params when params are empty', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse([]));

      await searchImages({});
      const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(calledUrl).toContain('/content/images/search');
      expect(calledUrl).not.toContain('?');
    });

    it('comma-joins list dimensions rather than repeating them', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse([]));

      await searchImages({ tagIds: [1, 2], personIds: [3, 4] });

      const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(calledUrl).toContain('tagIds=1%2C2');
      expect(calledUrl).toContain('personIds=3%2C4');
      expect(calledUrl).not.toContain('tagIds=1&tagIds=2');
    });
  });
});

describe('Admin Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllImages', () => {
    it('unwraps a Spring Page envelope into PagedImages', async () => {
      const images = [{ id: 1, contentType: 'IMAGE', imageUrl: 'https://example.com/1.jpg' }];
      const envelope = {
        content: images,
        totalElements: 137,
        totalPages: 3,
        number: 0,
        last: false,
        size: 50,
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse(envelope));

      const result = await getAllImages();
      expect(result).toEqual({
        items: images,
        page: 0,
        totalPages: 3,
        totalElements: 137,
        isLast: false,
      });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/content/images?page=0&size=50'),
        expect.objectContaining({ cache: 'no-store' })
      );
    });

    it('passes filter params in the query string', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockSuccessResponse({ content: [], totalElements: 0, totalPages: 0, number: 0, last: true })
      );

      await getAllImages({
        page: 2,
        size: 50,
        locationId: 8,
        minRating: 4,
        tagIds: [3, 7],
        captureStartDate: '2026-01-01',
        captureEndDate: '2026-12-31',
      });

      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain('page=2');
      expect(url).toContain('size=50');
      expect(url).toContain('locationId=8');
      expect(url).toContain('minRating=4');
      expect(url).toContain('tagIds=3');
      expect(url).toContain('tagIds=7');
      expect(url).toContain('captureStartDate=2026-01-01');
      expect(url).toContain('captureEndDate=2026-12-31');
    });

    it('repeats list dimensions rather than comma-joining them', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockSuccessResponse({ content: [], totalElements: 0, totalPages: 0, number: 0, last: true })
      );

      await getAllImages({ tagIds: [3, 7], personIds: [1, 2] });

      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain('tagIds=3&tagIds=7');
      expect(url).toContain('personIds=1&personIds=2');
      expect(url).not.toContain('tagIds=3%2C7');
    });

    it('passes the remaining shared filter dimensions', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockSuccessResponse({ content: [], totalElements: 0, totalPages: 0, number: 0, last: true })
      );

      await getAllImages({ cameraId: 2, lensId: 9, isFilm: false, blackAndWhite: true });

      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain('cameraId=2');
      expect(url).toContain('lensId=9');
      expect(url).toContain('isFilm=false');
      expect(url).toContain('blackAndWhite=true');
    });
  });

  describe('createImages', () => {
    it('should post FormData to collection endpoint', async () => {
      const response = [{ id: 1, contentType: 'IMAGE', imageUrl: 'https://example.com/new.jpg' }];
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse(response));

      const formData = new FormData();
      const result = await createImages(42, formData);

      expect(result).toEqual(response);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/content/images/42'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('createTextContent', () => {
    it('should post text content creation request', async () => {
      const response = { id: 10, contentType: 'TEXT' };
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse(response));

      const result = await createTextContent({
        collectionId: 1,
        content: 'Hello world',
        format: 'plain',
        align: 'left',
      });

      expect(result).toEqual(response);
    });
  });

  describe('updateImages', () => {
    it('should patch multiple image updates', async () => {
      const response = {
        updatedImages: [{ id: 1, contentType: 'IMAGE', title: 'Updated' }],
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse(response));

      const result = await updateImages([{ id: 1, title: 'Updated' }]);
      expect(result!.updatedImages).toHaveLength(1);
    });
  });

  describe('deleteImages', () => {
    it('should delete images by ID', async () => {
      const response = { deletedIds: [1, 2] };
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse(response));

      const result = await deleteImages([1, 2]);
      expect(result!.deletedIds).toEqual([1, 2]);
    });
  });
});
