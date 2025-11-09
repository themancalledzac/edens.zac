import { isProduction } from '@/app/utils/environment';

// Static variables for our endpoints
const READ = 'read';
const WRITE = 'write';
const ADMIN = 'admin';

/**
 * Core API utilities for making requests to the backend
 */

/**
 * Get the base API URL for a given endpoint type
 */
function getApiBaseUrl(endpointType: string): string {
  const base = isProduction()
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://localhost:8080';

  return `${base}/api/${endpointType}`;
}

/**
 * Build a complete API URL with optional query parameters
 */
export function buildApiUrl(
  endpointType: string,
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const baseUrl = getApiBaseUrl(endpointType);
  const url = new URL(`${baseUrl}${path.startsWith('/') ? path : '/' + path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

/**
 * Build a simple API URL without query parameters (for use with fetch options)
 */
function buildSimpleApiUrl(endpointType: string, endpoint: string): string {
  const baseUrl = getApiBaseUrl(endpointType);
  return `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
}

/**
 * Custom error class for API responses
 */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * Unified error handling for API requests
 * Handles both Response errors and catch block errors
 *
 * @param error - Error to handle (can be Response, Error, ApiError, or unknown)
 * @param response - Optional Response object (if error is a Response, this should be the same)
 * @returns Never (always throws ApiError)
 * @throws ApiError with appropriate message and status code
 */
async function handleApiError(error: unknown, response?: Response): Promise<never> {
  // If it's already an ApiError, re-throw it
  if (error instanceof ApiError) {
    throw error;
  }

  // If we have a Response object (either as error or parameter), extract error from it
  // Use duck typing instead of instanceof since Response may not be available in all environments
  const responseObj = (error && typeof error === 'object' && 'status' in error && 'statusText' in error && 'json' in error)
    ? error as Response
    : response;
  if (responseObj) {
    const errorData = await responseObj.json().catch(() => null);
    throw new ApiError(
      errorData?.message || `API error: ${responseObj.status} ${responseObj.statusText}`,
      responseObj.status
    );
  }

  // Otherwise, convert the error to ApiError
  throw new ApiError(
    error instanceof Error ? error.message : 'Unknown error occurred',
    500
  );
}

/**
 * Base function for making API requests with consistent error handling
 *
 * @param endpoint - API endpoint path ( without the base URL)
 * @param options - Fetch options
 * @returns The parsed response data
 * @throws ApiError if the request fails
 */
export async function fetchReadApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const url = buildSimpleApiUrl(READ, endpoint);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // For non-OK responses, throw an ApiError
    if (!response.ok) {
      await handleApiError(response);
    }

    // For 204 no content responses, return null
    if (response.status === 204) {
      return null as unknown as T;
    }

    // Parse and return the response data
    return await response.json();
  } catch (error) {
    return await handleApiError(error);
  }
}

/**
 * Base function for making API requests to write or admin endpoints
 * Handles URL building, error handling, and response parsing
 *
 * @param endpointType - Type of endpoint ('write' or 'admin')
 * @param endpoint - API endpoint path (without the base URL)
 * @param options - Fetch options
 * @returns The parsed response data
 * @throws ApiError if the request fails
 */
const fetchBase = async <T>(
  endpointType: 'write' | 'admin',
  endpoint: string,
  options: RequestInit
): Promise<T> => {
  try {
    const url = buildSimpleApiUrl(endpointType === 'write' ? WRITE : ADMIN, endpoint);
    const response = await fetch(url, options);

    if (!response.ok) {
      await handleApiError(response);
    }

    // Return parsed response
    if (response.status === 204) {
      return null as unknown as T;
    }

    return await response.json();
  } catch (error) {
    return await handleApiError(error);
  }
};

// For JSON-based updates (PUT)
export async function fetchPutJsonApi<T>(endpoint: string, body: unknown): Promise<T> {
  return await fetchBase<T>('write', endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// For JSON-based partial updates (PATCH)
export async function fetchPatchJsonApi<T>(endpoint: string, body: unknown): Promise<T> {
  return await fetchBase<T>('write', endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// For JSON-based creates (POST)
export async function fetchPostJsonApi<T>(endpoint: string, body: unknown): Promise<T> {
  return await fetchBase<T>('write', endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// For FormData-based creates (POST) - used for image uploads
export async function fetchFormDataApi<T>(endpoint: string, formData: FormData): Promise<T> {
  return await fetchBase<T>('write', endpoint, {
    method: 'POST',
    body: formData,
  });
}

// ============================================================================
// Admin API Functions (for collection management)
// ============================================================================

// For admin JSON-based creates (POST)
export async function fetchAdminPostJsonApi<T>(endpoint: string, body: unknown): Promise<T> {
  return await fetchBase<T>('admin', endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// For admin JSON-based updates (PUT)
export async function fetchAdminPutJsonApi<T>(endpoint: string, body: unknown): Promise<T> {
  return await fetchBase<T>('admin', endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// For admin JSON-based partial updates (PATCH)
export async function fetchAdminPatchJsonApi<T>(endpoint: string, body: unknown): Promise<T> {
  return await fetchBase<T>('admin', endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// For admin FormData-based creates (POST) - used for image uploads
export async function fetchAdminFormDataApi<T>(endpoint: string, formData: FormData): Promise<T> {
  return await fetchBase<T>('admin', endpoint, {
    method: 'POST',
    body: formData,
  });
}

// For admin deletes (DELETE)
export async function fetchAdminDeleteApi<T>(endpoint: string): Promise<T> {
  return await fetchBase<T>('admin', endpoint, {
    method: 'DELETE',
  });
}

// For admin GET requests
export async function fetchAdminGetApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const url = buildSimpleApiUrl(ADMIN, endpoint);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    if (response.status === 204) {
      return null as unknown as T;
    }

    return await response.json();
  } catch (error) {
    return await handleApiError(error);
  }
}
