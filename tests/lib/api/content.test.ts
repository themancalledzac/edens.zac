/**
 * Tests for content.ts API functions
 * Tests read and admin content API endpoints
 */
import {
  createImages,
  createPerson,
  createTag,
  createTextContent,
  deleteImages,
  getAllCameras,
  getAllImages,
  getAllPeople,
  getAllTags,
  getFilmMetadata,
  updateImages,
} from '@/app/lib/api/content';

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
    it('should fetch and return tags', async () => {
      const tags = [
        { id: 1, tagName: 'landscape' },
        { id: 2, tagName: 'portrait' },
      ];
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse(tags));

      const result = await getAllTags();
      expect(result).toEqual(tags);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/content/tags'),
        expect.any(Object)
      );
    });
  });

  describe('getAllPeople', () => {
    it('should fetch and return people', async () => {
      const people = [{ id: 1, personName: 'John Doe' }];
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse(people));

      const result = await getAllPeople();
      expect(result).toEqual(people);
    });
  });

  describe('getAllCameras', () => {
    it('should fetch and return cameras', async () => {
      const cameras = [{ id: 1, cameraName: 'Sony A7R5' }];
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse(cameras));

      const result = await getAllCameras();
      expect(result).toEqual(cameras);
    });
  });

  describe('getFilmMetadata', () => {
    it('should fetch and return film metadata', async () => {
      const metadata = {
        filmTypes: [{ id: 1, filmTypeName: 'Portra 400', defaultIso: 400 }],
        filmFormats: [{ name: 'MM_35', displayName: '35mm' }],
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse(metadata));

      const result = await getFilmMetadata();
      expect(result).toEqual(metadata);
      expect(result!.filmTypes).toHaveLength(1);
      expect(result!.filmFormats).toHaveLength(1);
    });
  });
});

describe('Admin Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllImages', () => {
    it('should fetch all images with no-store cache', async () => {
      const images = [
        { id: 1, contentType: 'IMAGE', imageUrl: 'https://example.com/1.jpg' },
      ];
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse(images));

      const result = await getAllImages();
      expect(result).toEqual(images);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/content/images'),
        expect.objectContaining({ cache: 'no-store' })
      );
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

  describe('createTag', () => {
    it('should create a new tag', async () => {
      const response = { id: 5, tagName: 'nature' };
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse(response));

      const result = await createTag({ tagName: 'nature' });
      expect(result).toEqual({ id: 5, tagName: 'nature' });
    });
  });

  describe('createPerson', () => {
    it('should create a new person', async () => {
      const response = { id: 3, personName: 'Jane' };
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse(response));

      const result = await createPerson({ personName: 'Jane' });
      expect(result).toEqual({ id: 3, personName: 'Jane' });
    });
  });
});
