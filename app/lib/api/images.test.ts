/**
 * Tests for Images API functions
 */

import { type ImageCollection } from '@/app/types/ContentBlock';

import * as core from './core';
import { updateImage,type UpdateImageDTO } from './images';

// Mock the core module
jest.mock('./core');

describe('updateImage', () => {
  const mockFetchPutJsonApi = core.fetchPutJsonApi as jest.MockedFunction<typeof core.fetchPutJsonApi>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validation', () => {
    it('should throw error if imageId is not provided', async () => {
      await expect(updateImage(0, { title: 'Test' })).rejects.toThrow('Valid imageId is required');
    });

    it('should throw error if imageId is negative', async () => {
      await expect(updateImage(-1, { title: 'Test' })).rejects.toThrow('Valid imageId is required');
    });

    it('should throw error if updates object is empty', async () => {
      await expect(updateImage(123, {})).rejects.toThrow(
        'Updates object must contain at least one field to update'
      );
    });

    it('should throw error if updates is null', async () => {
      await expect(updateImage(123, null as unknown as UpdateImageDTO)).rejects.toThrow();
    });
  });

  describe('successful updates', () => {
    it('should update image title and caption', async () => {
      const imageId = 123;
      const updates: UpdateImageDTO = {
        title: 'Sunset over the mountains',
        caption: 'A beautiful sunset captured in the Rockies',
      };
      const mockResponse = { id: imageId, ...updates };

      mockFetchPutJsonApi.mockResolvedValueOnce(mockResponse);

      const result = await updateImage(imageId, updates);

      expect(mockFetchPutJsonApi).toHaveBeenCalledWith('/images/123', updates);
      expect(result).toEqual(mockResponse);
    });

    it('should update single field', async () => {
      const imageId = 456;
      const updates: UpdateImageDTO = {
        rating: 5,
      };
      const mockResponse = { id: imageId, rating: 5 };

      mockFetchPutJsonApi.mockResolvedValueOnce(mockResponse);

      const result = await updateImage(imageId, updates);

      expect(mockFetchPutJsonApi).toHaveBeenCalledWith('/images/456', updates);
      expect(result).toEqual(mockResponse);
    });

    it('should update collections', async () => {
      const imageId = 789;
      const collections: ImageCollection[] = [
        {
          collectionId: 1,
          collectionName: 'Portfolio',
          visible: true,
          orderIndex: 0,
        },
        {
          collectionId: 2,
          collectionName: 'Landscapes',
          visible: true,
          orderIndex: 5,
        },
      ];
      const updates: UpdateImageDTO = {
        collections,
      };
      const mockResponse = { id: imageId, collections };

      mockFetchPutJsonApi.mockResolvedValueOnce(mockResponse);

      const result = await updateImage(imageId, updates);

      expect(mockFetchPutJsonApi).toHaveBeenCalledWith('/images/789', updates);
      expect(result).toEqual(mockResponse);
    });

    it('should clear field by setting to null', async () => {
      const imageId = 101;
      const updates: UpdateImageDTO = {
        caption: null,
        location: null,
      };
      const mockResponse = { id: imageId, caption: null, location: null };

      mockFetchPutJsonApi.mockResolvedValueOnce(mockResponse);

      const result = await updateImage(imageId, updates);

      expect(mockFetchPutJsonApi).toHaveBeenCalledWith('/images/101', updates);
      expect(result).toEqual(mockResponse);
    });

    it('should update multiple metadata fields', async () => {
      const imageId = 202;
      const updates: UpdateImageDTO = {
        author: 'John Doe',
        camera: 'Canon EOS R5',
        lens: 'Canon RF 24-70mm f/2.8',
        iso: 800,
        fstop: 'f/2.8',
        shutterSpeed: '1/250 sec',
        focalLength: '50 mm',
        blackAndWhite: false,
        isFilm: false,
      };
      const mockResponse = { id: imageId, ...updates };

      mockFetchPutJsonApi.mockResolvedValueOnce(mockResponse);

      const result = await updateImage(imageId, updates);

      expect(mockFetchPutJsonApi).toHaveBeenCalledWith('/images/202', updates);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('error handling', () => {
    it('should propagate API errors', async () => {
      const imageId = 999;
      const updates: UpdateImageDTO = {
        title: 'Test',
      };
      const error = new Error('API Error: 500 Internal Server Error');

      mockFetchPutJsonApi.mockRejectedValueOnce(error);

      await expect(updateImage(imageId, updates)).rejects.toThrow('API Error: 500 Internal Server Error');
      expect(mockFetchPutJsonApi).toHaveBeenCalledWith('/images/999', updates);
    });

    it('should handle network errors', async () => {
      const imageId = 303;
      const updates: UpdateImageDTO = {
        title: 'Test',
      };
      const error = new Error('Network error');

      mockFetchPutJsonApi.mockRejectedValueOnce(error);

      await expect(updateImage(imageId, updates)).rejects.toThrow('Network error');
    });
  });

  describe('collections updates', () => {
    it('should handle empty collections', async () => {
      const imageId = 404;
      const updates: UpdateImageDTO = {
        collections: [],
      };
      const mockResponse = { id: imageId, collections: [] };

      mockFetchPutJsonApi.mockResolvedValueOnce(mockResponse);

      const result = await updateImage(imageId, updates);

      expect(mockFetchPutJsonApi).toHaveBeenCalledWith('/images/404', updates);
      expect(result).toEqual(mockResponse);
    });

    it('should handle collections with partial data', async () => {
      const imageId = 505;
      const collections: ImageCollection[] = [
        {
          collectionId: 1,
          collectionName: 'Test Collection',
          // visible and orderIndex are optional
        },
      ];
      const updates: UpdateImageDTO = {
        collections,
      };
      const mockResponse = { id: imageId, collections };

      mockFetchPutJsonApi.mockResolvedValueOnce(mockResponse);

      const result = await updateImage(imageId, updates);

      expect(mockFetchPutJsonApi).toHaveBeenCalledWith('/images/505', updates);
      expect(result).toEqual(mockResponse);
    });

    it('should handle clearing collections', async () => {
      const imageId = 606;
      const updates: UpdateImageDTO = {
        collections: null,
      };
      const mockResponse = { id: imageId, collections: null };

      mockFetchPutJsonApi.mockResolvedValueOnce(mockResponse);

      const result = await updateImage(imageId, updates);

      expect(mockFetchPutJsonApi).toHaveBeenCalledWith('/images/606', updates);
      expect(result).toEqual(mockResponse);
    });
  });
});
