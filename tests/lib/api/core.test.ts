/**
 * Unit tests for core.ts
 * Tests API utilities including error handling and fetch functions
 */

import {
  ApiError,
  fetchAdminDeleteApi,
  fetchAdminGetApi,
  fetchAdminPatchJsonApi,
  fetchAdminPostJsonApi,
  fetchAdminPutJsonApi,
  fetchPatchJsonApi,
  fetchPostJsonApi,
  fetchPutJsonApi,
} from '@/app/lib/api/core';

// Mock fetch globally
global.fetch = jest.fn();

// Mock environment
jest.mock('@/app/utils/environment', () => ({
  isProduction: jest.fn(() => false),
}));

describe('handleApiError (tested via public API functions)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Response error handling', () => {
    it('should extract error message from response JSON', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({ message: 'Custom error message' }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(fetchPostJsonApi('/test', {})).rejects.toThrow(ApiError);
      await expect(fetchPostJsonApi('/test', {})).rejects.toThrow('Custom error message');
    });

    it('should use default error message when response JSON has no message', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValue({}),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(fetchPostJsonApi('/test', {})).rejects.toThrow(ApiError);
      await expect(fetchPostJsonApi('/test', {})).rejects.toThrow('API error: 404 Not Found');
    });

    it('should handle response with invalid JSON', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(fetchPostJsonApi('/test', {})).rejects.toThrow(ApiError);
      await expect(fetchPostJsonApi('/test', {})).rejects.toThrow(
        'API error: 500 Internal Server Error'
      );
    });

    it('should preserve status code in ApiError', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: jest.fn().mockResolvedValue({ message: 'Access denied' }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      try {
        await fetchPostJsonApi('/test', {});
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(403);
      }
    });
  });

  describe('Catch block error handling', () => {
    it('should convert Error to ApiError with status 500', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(fetchPostJsonApi('/test', {})).rejects.toThrow(ApiError);
      await expect(fetchPostJsonApi('/test', {})).rejects.toThrow('Network error');

      try {
        await fetchPostJsonApi('/test', {});
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(500);
      }
    });

    it('should re-throw ApiError without modification', async () => {
      const apiError = new ApiError('Already an ApiError', 400);
      (global.fetch as jest.Mock).mockRejectedValue(apiError);

      await expect(fetchPostJsonApi('/test', {})).rejects.toThrow(apiError);
      await expect(fetchPostJsonApi('/test', {})).rejects.toThrow('Already an ApiError');
    });

    it('should handle unknown error types', async () => {
      (global.fetch as jest.Mock).mockRejectedValue('String error');

      await expect(fetchPostJsonApi('/test', {})).rejects.toThrow(ApiError);
      await expect(fetchPostJsonApi('/test', {})).rejects.toThrow('Unknown error occurred');

      try {
        await fetchPostJsonApi('/test', {});
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(500);
      }
    });
  });
});

describe('fetchBase (tested via public API functions)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('write endpoint functions', () => {
    it('should use write endpoint for fetchPutJsonApi', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await fetchPutJsonApi('/test', { data: 'test' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/write'),
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should use write endpoint for fetchPatchJsonApi', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await fetchPatchJsonApi('/test', { data: 'test' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/write'),
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });

    it('should use write endpoint for fetchPostJsonApi', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await fetchPostJsonApi('/test', { data: 'test' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/write'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('admin endpoint functions', () => {
    it('should use admin endpoint for fetchAdminPostJsonApi', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await fetchAdminPostJsonApi('/test', { data: 'test' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should use admin endpoint for fetchAdminPutJsonApi', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await fetchAdminPutJsonApi('/test', { data: 'test' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin'),
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });

    it('should use admin endpoint for fetchAdminPatchJsonApi', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await fetchAdminPatchJsonApi('/test', { data: 'test' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin'),
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });

    it('should use admin endpoint for fetchAdminDeleteApi', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        json: jest.fn().mockResolvedValue(null),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await fetchAdminDeleteApi('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('response handling', () => {
    it('should return parsed JSON for successful responses', async () => {
      const mockData = { id: 1, name: 'Test' };
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockData),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await fetchPostJsonApi('/test', {});
      expect(result).toEqual(mockData);
    });

    it('should return null for 204 No Content responses', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        json: jest.fn(),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await fetchPostJsonApi('/test', {});
      expect(result).toBeNull();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(fetchPostJsonApi('/test', {})).rejects.toThrow(ApiError);
      await expect(fetchPostJsonApi('/test', {})).rejects.toThrow('Network error');
    });
  });

  describe('fetchAdminGetApi', () => {
    it('should use admin endpoint for GET requests', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await fetchAdminGetApi('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should merge custom headers with default headers', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await fetchAdminGetApi('/test', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Custom-Header': 'custom-value',
          }),
        })
      );
    });

    it('should handle 204 No Content responses', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        json: jest.fn(),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await fetchAdminGetApi('/test');
      expect(result).toBeNull();
    });
  });
});
