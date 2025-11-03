/**
 * Tests for Images API functions
 */

import * as core from './core';

import { type ImageCollection } from '@/app/types/Content';
import { updateImage, type UpdateImageDTO } from '@/app/types/Content';

// Mock the core module
jest.mock('./core');

describe('updateImage', () => {
  const mockFetchPatchJsonApi = core.fetchPatchJsonApi as jest.MockedFunction<
    typeof core.fetchPatchJsonApi
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validation', () => {
    it('should throw error if id is not provided', async () => {
      await expect(updateImage({ id: 0, title: 'Test' })).rejects.toThrow('Valid id is required');
    });

    it('should throw error if id is negative', async () => {
      await expect(updateImage({ id: -1, title: 'Test' })).rejects.toThrow('Valid id is required');
    });

    it('should throw error if updates object only contains id', async () => {
      await expect(updateImage({ id: 123 })).rejects.toThrow(
        'Updates object must contain at least one field to update besides id'
      );
    });

    it('should throw error if updates is null', async () => {
      await expect(updateImage(null as unknown as UpdateImageDTO)).rejects.toThrow();
    });
  });

  describe('successful updates', () => {
    it('should update image title and caption', async () => {
      const imageId = 123;
      const updates: UpdateImageDTO = {
        id: imageId,
        title: 'Sunset over the mountains',
        caption: 'A beautiful sunset captured in the Rockies',
      };
      const mockResponse = { id: imageId, ...updates };

      mockFetchPatchJsonApi.mockResolvedValueOnce(mockResponse);

      const result = await updateImage(updates);

      expect(mockFetchPatchJsonApi).toHaveBeenCalledWith('/content/images', [updates]);
      expect(result).toEqual(mockResponse);
    });

    it('should update single field', async () => {
      const imageId = 456;
      const updates: UpdateImageDTO = {
        id: imageId,
        rating: 5,
      };
      const mockResponse = { id: imageId, rating: 5 };

      mockFetchPatchJsonApi.mockResolvedValueOnce(mockResponse);

      const result = await updateImage(updates);

      expect(mockFetchPatchJsonApi).toHaveBeenCalledWith('/content/images', [updates]);
      expect(result).toEqual(mockResponse);
    });

    it('should update collections', async () => {
      const imageId = 789;
      const collections: ImageCollection[] = [
        {
          collectionId: 1,
          name: 'Portfolio',
          visible: true,
          orderIndex: 0,
        },
        {
          collectionId: 2,
          name: 'Landscapes',
          visible: true,
          orderIndex: 5,
        },
      ];
      const updates: UpdateImageDTO = {
        id: imageId,
        collections: { prev: collections },
      };
      const mockResponse = { id: imageId, collections };

      mockFetchPatchJsonApi.mockResolvedValueOnce(mockResponse);

      const result = await updateImage(updates);

      expect(mockFetchPatchJsonApi).toHaveBeenCalledWith('/content/images', [updates]);
      expect(result).toEqual(mockResponse);
    });

    it('should clear field by setting to null', async () => {
      const imageId = 101;
      const updates: UpdateImageDTO = {
        id: imageId,
        caption: null,
        location: null,
      };
      const mockResponse = { id: imageId, caption: null, location: null };

      mockFetchPatchJsonApi.mockResolvedValueOnce(mockResponse);

      const result = await updateImage(updates);

      expect(mockFetchPatchJsonApi).toHaveBeenCalledWith('/content/images', [updates]);
      expect(result).toEqual(mockResponse);
    });

    it('should update multiple metadata fields', async () => {
      const imageId = 202;
      const updates: UpdateImageDTO = {
        id: imageId,
        author: 'John Doe',
        camera: { newValue: 'Canon EOS R5' },
        lens: { newValue: 'Canon RF 24-70mm f/2.8' },
        iso: 800,
        fStop: 'f/2.8',
        shutterSpeed: '1/250 sec',
        focalLength: '50 mm',
        blackAndWhite: false,
        isFilm: false,
      };
      const mockResponse = { id: imageId, ...updates };

      mockFetchPatchJsonApi.mockResolvedValueOnce(mockResponse);

      const result = await updateImage(updates);

      expect(mockFetchPatchJsonApi).toHaveBeenCalledWith('/content/images', [updates]);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('error handling', () => {
    it('should propagate API errors', async () => {
      const imageId = 999;
      const updates: UpdateImageDTO = {
        id: imageId,
        title: 'Test',
      };
      const error = new Error('API Error: 500 Internal Server Error');

      mockFetchPatchJsonApi.mockRejectedValueOnce(error);

      await expect(updateImage(updates)).rejects.toThrow(
        'API Error: 500 Internal Server Error'
      );
      expect(mockFetchPatchJsonApi).toHaveBeenCalledWith('/content/images', [updates]);
    });

    it('should handle network errors', async () => {
      const imageId = 303;
      const updates: UpdateImageDTO = {
        id: imageId,
        title: 'Test',
      };
      const error = new Error('Network error');

      mockFetchPatchJsonApi.mockRejectedValueOnce(error);

      await expect(updateImage(updates)).rejects.toThrow('Network error');
    });
  });

  describe('collections updates', () => {
    it('should handle removing all collections', async () => {
      const imageId = 404;
      const updates: UpdateImageDTO = {
        id: imageId,
        collections: {
          remove: [1, 2, 3],
        },
      };
      const mockResponse = { id: imageId, collections: [] };

      mockFetchPatchJsonApi.mockResolvedValueOnce(mockResponse);

      const result = await updateImage(updates);

      expect(mockFetchPatchJsonApi).toHaveBeenCalledWith('/content/images', [updates]);
      expect(result).toEqual(mockResponse);
    });

    it('should handle collections with prev pattern', async () => {
      const imageId = 505;
      const collections: ImageCollection[] = [
        {
          collectionId: 1,
          name: 'Test Collection',
          visible: true,
          orderIndex: 0,
        },
      ];
      const updates: UpdateImageDTO = {
        id: imageId,
        collections: {
          prev: collections,
        },
      };
      const mockResponse = { id: imageId, collections };

      mockFetchPatchJsonApi.mockResolvedValueOnce(mockResponse);

      const result = await updateImage(updates);

      expect(mockFetchPatchJsonApi).toHaveBeenCalledWith('/content/images', [updates]);
      expect(result).toEqual(mockResponse);
    });

    it('should handle adding new collections', async () => {
      const imageId = 606;
      const newCollections: ImageCollection[] = [
        {
          collectionId: 5,
          name: 'New Collection',
          visible: true,
          orderIndex: 0,
        },
      ];
      const updates: UpdateImageDTO = {
        id: imageId,
        collections: {
          newValue: newCollections,
        },
      };
      const mockResponse = { id: imageId, collections: newCollections };

      mockFetchPatchJsonApi.mockResolvedValueOnce(mockResponse);

      const result = await updateImage(updates);

      expect(mockFetchPatchJsonApi).toHaveBeenCalledWith('/content/images', [updates]);
      expect(result).toEqual(mockResponse);
    });
  });
});
