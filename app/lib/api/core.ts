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
 * Shared error handling for API responses
 * Extracts error message from response or provides default
 */
async function handleApiResponseError(response: Response): Promise<never> {
  const errorData = await response.json().catch(() => null);
  throw new ApiError(
    errorData?.message || `API error: ${response.status} ${response.statusText}`,
    response.status
  );
}

/**
 * Shared error handling for catch blocks
 * Converts unknown errors to ApiError
 */
function handleApiCatchError(error: unknown): never {
  if (error instanceof ApiError) {
    throw error;
  }
  throw new ApiError(error instanceof Error ? error.message : 'Unknown error occurred', 500);
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
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    // For non-OK responses, throw an ApiError
    if (!response.ok) {
      await handleApiResponseError(response);
    }

    // For 204 no content responses, return null
    if (response.status === 204) {
      return null as unknown as T;
    }

    // Parse and return the response data
    return await response.json();
  } catch (error) {
    handleApiCatchError(error);
  }
}

const fetchWriteBase = async <T>(endpoint: string, options: RequestInit): Promise<T> => {
  try {
    const url = buildSimpleApiUrl(WRITE, endpoint);
    const response = await fetch(url, options);

    if (!response.ok) {
      await handleApiResponseError(response);
    }

    // Return parsed response
    if (response.status === 204) {
      return null as unknown as T;
    }

    return await response.json();
  } catch (error) {
    handleApiCatchError(error);
  }
};

// For JSON-based updates (PUT)
export async function fetchPutJsonApi<T>(endpoint: string, body: unknown): Promise<T> {
  return await fetchWriteBase<T>(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// For JSON-based partial updates (PATCH)
export async function fetchPatchJsonApi<T>(endpoint: string, body: unknown): Promise<T> {
  return await fetchWriteBase<T>(endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// For JSON-based creates (POST)
export async function fetchPostJsonApi<T>(endpoint: string, body: unknown): Promise<T> {
  return await fetchWriteBase<T>(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// For FormData-based creates (POST) - used for image uploads
export async function fetchFormDataApi<T>(endpoint: string, formData: FormData): Promise<T> {
  return await fetchWriteBase<T>(endpoint, {
    method: 'POST',
    body: formData,
  });
}

// ============================================================================
// Admin API Functions (for collection management)
// ============================================================================

const fetchAdminBase = async <T>(endpoint: string, options: RequestInit): Promise<T> => {
  try {
    const url = buildSimpleApiUrl(ADMIN, endpoint);
    const response = await fetch(url, options);

    if (!response.ok) {
      await handleApiResponseError(response);
    }

    // Return parsed response
    if (response.status === 204) {
      return null as unknown as T;
    }

    return await response.json();
  } catch (error) {
    handleApiCatchError(error);
  }
};

// For admin JSON-based creates (POST)
export async function fetchAdminPostJsonApi<T>(endpoint: string, body: unknown): Promise<T> {
  return await fetchAdminBase<T>(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// For admin JSON-based updates (PUT)
export async function fetchAdminPutJsonApi<T>(endpoint: string, body: unknown): Promise<T> {
  return await fetchAdminBase<T>(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// For admin JSON-based partial updates (PATCH)
export async function fetchAdminPatchJsonApi<T>(endpoint: string, body: unknown): Promise<T> {
  return await fetchAdminBase<T>(endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// For admin FormData-based creates (POST) - used for image uploads
export async function fetchAdminFormDataApi<T>(endpoint: string, formData: FormData): Promise<T> {
  return await fetchAdminBase<T>(endpoint, {
    method: 'POST',
    body: formData,
  });
}

// For admin deletes (DELETE)
export async function fetchAdminDeleteApi<T>(endpoint: string): Promise<T> {
  return await fetchAdminBase<T>(endpoint, {
    method: 'DELETE',
  });
}

// For admin GET requests
export async function fetchAdminGetApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const url = buildSimpleApiUrl(ADMIN, endpoint);

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      await handleApiResponseError(response);
    }

    if (response.status === 204) {
      return null as unknown as T;
    }

    return await response.json();
  } catch (error) {
    handleApiCatchError(error);
  }
}
