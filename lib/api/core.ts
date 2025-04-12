/**
 * Core API utilities for making requests to the backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
  : 'http://localhost:8080/api/v1';

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
export async function fetchFromApi<T>(
  endpoint: string,
  options: RequestInit = {}): Promise<T> {
  try {
    console.log(`[zac] - fetching endpoint: ${endpoint} with API_BASE_URL=${API_BASE_URL}`);
    console.log(process.env.NEXT_PUBLIC_API_URL);
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

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
        response.status,
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
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error has occured',
      500,
    );
  }
}

const fetchWriteBase = async <T>(url: string, options: RequestInit): Promise<T> => {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      console.error(`[zac] - response: ${JSON.stringify(response)}`);

      throw new ApiError(
        `API error: ${response.status} ${response.statusText}`,
        response.status,
      );
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
export async function fetchJsonApi<T>(endpoint: string, body: any): Promise<T> {
  const baseUrl = 'http://localhost:8080/api/v1';
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  return await fetchWriteBase<T>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

}

// For FormData-based creates (POST)
export async function fetchFormDataApi<T>(endpoint: string, formData: FormData): Promise<T> {
  const baseUrl = 'http://localhost:8080/api/v1';
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  return await fetchWriteBase<T>(url, {
    method: 'POST',
    body: formData,
  });
}