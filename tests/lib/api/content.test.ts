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
  getAllLenses,
  getAllLocations,
  getAllPeople,
  getAllTags,
  getFilmMetadata,
  searchImages,
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

  describe('getAllPeople', () => {
    it('should fetch and return people normalized to ContentPersonModel', async () => {
      const rawPeople = [{ id: 1, personName: 'John Doe', slug: 'john-doe' }];
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse(rawPeople));

      const result = await getAllPeople();
      expect(result).toEqual([{ id: 1, name: 'John Doe', slug: 'john-doe' }]);
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

  describe('getAllLenses', () => {
    it('should fetch and return lenses', async () => {
      const lenses = [{ id: 1, lensName: 'Sony 24-70mm f/2.8' }];
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse(lenses));

      const result = await getAllLenses();
      expect(result).toEqual(lenses);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/content/lenses'),
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

    it('should return empty array for unrecognized response shape', async () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse({ data: [] }));

      const result = await searchImages({ cameraId: 1 });
      expect(result).toEqual([]);
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[searchImages]'),
        expect.anything(),
        expect.anything()
      );
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
  });
});

describe('Admin Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllImages', () => {
    it('should fetch all images with no-store cache', async () => {
      const images = [{ id: 1, contentType: 'IMAGE', imageUrl: 'https://example.com/1.jpg' }];
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
