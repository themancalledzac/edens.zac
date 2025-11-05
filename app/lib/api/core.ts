import { isProduction } from '@/app/utils/environment';

// Static variables for our endpoints
const READ = 'read';
const WRITE = 'write';
const ADMIN = 'admin';

/**
 * Core API utilities for making requests to the backend
 */
const API_BASE_URL = (endpointType: string) => {
  const base = isProduction()
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://localhost:8080';

  return `${base}/api/${endpointType}`;
};

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
 * Base function for making API requests with consistent error handling
 *
 * @param endpoint - API endpoint path ( without the base URL)
 * @param options - Fetch options
 * @returns The parsed response data
 * @throws ApiError if the request fails
 */
export async function fetchReadApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const url = `${API_BASE_URL(READ)}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    // For non-OK responses, throw an ApiError
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new ApiError(
        errorData?.message || `API error: ${response.status}${response.statusText}`,
        response.status
      );
    }

    // For 204 no content responses, return null
    if (response.status === 204) {
      return null as unknown as T;
    }

    // Parse and return the response data
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Convert other errors to ApiErrors
    throw new ApiError(error instanceof Error ? error.message : 'Unknown error has occured', 500);
  }
}

const fetchWriteBase = async <T>(endpoint: string, options: RequestInit): Promise<T> => {
  try {
    const url = `${API_BASE_URL(WRITE)}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const response = await fetch(url, options);

    if (!response.ok) {
      console.error(`[zac] - response: ${JSON.stringify(response)}`);

      throw new ApiError(`API error: ${response.status} ${response.statusText}`, response.status);
    }

    // Return parsed response
    if (response.status === 204) {
      return null as unknown as T;
    }

    return await response.json();
  } catch (error) {
    // All error handling in catch block
    console.error('Error in API call:', error);
    throw error;
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
  console.log('🌐 [fetchPatchJsonApi] Request:', {
    endpoint,
    method: 'PATCH',
    body,
    bodyJson: JSON.stringify(body, null, 2),
  });

  const result = await fetchWriteBase<T>(endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  console.log('🌐 [fetchPatchJsonApi] Response:', {
    endpoint,
    result,
  });

  return result;
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
    const url = `${API_BASE_URL(ADMIN)}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const response = await fetch(url, options);

    if (!response.ok) {
      console.error(`[zac] - admin response error: ${JSON.stringify(response)}`);
      throw new ApiError(`API error: ${response.status} ${response.statusText}`, response.status);
    }

    // Return parsed response
    if (response.status === 204) {
      return null as unknown as T;
    }

    return await response.json();
  } catch (error) {
    // All error handling in catch block
    console.error('Error in admin API call:', error);
    throw error;
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
  const url = `${API_BASE_URL(ADMIN)}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const bodyString = JSON.stringify(body);
  
  console.log('📤 [fetchAdminPutJsonApi] Collection Update Request:', {
    '1. Request URL (full)': url,
    '2. Request Body (full)': JSON.parse(bodyString),
    '2. Request Body (JSON string)': bodyString,
  });

  const result = await fetchAdminBase<T>(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: bodyString,
  });

  console.log('📥 [fetchAdminPutJsonApi] Collection Update Response:', {
    '3. Response (full)': result,
    '3. Response (JSON string)': JSON.stringify(result, null, 2),
  });

  return result;
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
    const url = `${API_BASE_URL(ADMIN)}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new ApiError(
        errorData?.message || `API error: ${response.status} ${response.statusText}`,
        response.status
      );
    }

    if (response.status === 204) {
      return null as unknown as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error instanceof Error ? error.message : 'Unknown error occurred', 500);
  }
}
