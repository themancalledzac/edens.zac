import { isLocalEnvironment } from '@/app/utils/environment';

const READ = 'read';
const WRITE = 'write';
const ADMIN = 'admin';

/**
 * On the server, forward incoming browser cookies on outgoing fetches so that the backend
 * sees per-gallery `gallery_access_<slug>` cookies on RSC re-fetches (e.g. after
 * `router.refresh()` from the client gallery gate).
 *
 * Returns `null` in the browser — fetch already attaches same-origin cookies automatically.
 */
export async function getServerCookieHeader(): Promise<string | null> {
  if (typeof window !== 'undefined') return null;
  try {
    // Lazy import: `next/headers` is only available in the server runtime.
    const { cookies } = await import('next/headers');
    const store = await cookies();
    const all = store.getAll();
    if (all.length === 0) return null;
    return all.map(c => `${c.name}=${c.value}`).join('; ');
  } catch (error: unknown) {
    // `cookies()` throws whenever there's no request context — at build time,
    // inside `generateStaticParams`, inside `unstable_cache`, or otherwise
    // outside a per-request scope. All of those mean "no cookies to forward",
    // not a real failure, so suppress the noise.
    if (
      error instanceof Error &&
      /outside a request scope|generatestaticparams|without an http request/i.test(error.message)
    ) {
      return null;
    }
    // Any other unexpected error: warn and degrade gracefully rather than breaking the fetch.
    console.warn('[getServerCookieHeader] Unexpected error reading cookies:', error);
    return null;
  }
}

/**
 * Core API utilities for making requests to the backend
 */

/**
 * Get the base API URL for a given endpoint type
 */
function getApiBaseUrl(endpointType: string): string {
  if (isLocalEnvironment()) {
    return `http://localhost:8080/api/${endpointType}`;
  }
  // All production calls go through the Next.js proxy — never directly to EC2
  const appBase =
    typeof window !== 'undefined'
      ? '' // browser: relative URL
      : (process.env.NEXT_PUBLIC_APP_URL ?? ''); // server component: needs absolute
  return `${appBase}/api/proxy/api/${endpointType}`;
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
async function throwApiError(error: unknown, response?: Response): Promise<never> {
  if (error instanceof ApiError) {
    throw error;
  }

  // Duck-type check instead of instanceof — Response may not be available in all environments
  const responseObj =
    error &&
    typeof error === 'object' &&
    'status' in error &&
    'statusText' in error &&
    'json' in error
      ? (error as Response)
      : response;
  if (responseObj) {
    const errorData = await responseObj.json().catch(() => null);
    throw new ApiError(
      errorData?.message || `API error: ${responseObj.status} ${responseObj.statusText}`,
      responseObj.status
    );
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
export async function fetchReadApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T | null> {
  try {
    const url = buildSimpleApiUrl(READ, endpoint);

    const cookieHeader = await getServerCookieHeader();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      await throwApiError(response);
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    return await throwApiError(error);
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
): Promise<T | null> => {
  try {
    const url = buildSimpleApiUrl(endpointType === 'write' ? WRITE : ADMIN, endpoint);
    const response = await fetch(url, options);

    if (!response.ok) {
      await throwApiError(response);
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    return await throwApiError(error);
  }
};

/** PUT JSON to the write endpoint */
export async function fetchPutJsonApi<T>(endpoint: string, body: unknown): Promise<T | null> {
  return await fetchBase<T>('write', endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** PATCH JSON to the write endpoint */
export async function fetchPatchJsonApi<T>(endpoint: string, body: unknown): Promise<T | null> {
  return await fetchBase<T>('write', endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** POST JSON to the write endpoint */
export async function fetchPostJsonApi<T>(endpoint: string, body: unknown): Promise<T | null> {
  return await fetchBase<T>('write', endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** POST FormData to the write endpoint — used for image uploads */
export async function fetchFormDataApi<T>(endpoint: string, formData: FormData): Promise<T | null> {
  return await fetchBase<T>('write', endpoint, {
    method: 'POST',
    body: formData,
  });
}

/** POST JSON to the admin endpoint */
export async function fetchAdminPostJsonApi<T>(endpoint: string, body: unknown): Promise<T | null> {
  return await fetchBase<T>('admin', endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** PUT JSON to the admin endpoint */
export async function fetchAdminPutJsonApi<T>(endpoint: string, body: unknown): Promise<T | null> {
  return await fetchBase<T>('admin', endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** PATCH JSON to the admin endpoint */
export async function fetchAdminPatchJsonApi<T>(
  endpoint: string,
  body: unknown
): Promise<T | null> {
  return await fetchBase<T>('admin', endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** POST FormData to the admin endpoint — used for image uploads */
export async function fetchAdminFormDataApi<T>(
  endpoint: string,
  formData: FormData
): Promise<T | null> {
  return await fetchBase<T>('admin', endpoint, {
    method: 'POST',
    body: formData,
  });
}

/** DELETE via the admin endpoint */
export async function fetchAdminDeleteApi<T>(endpoint: string): Promise<T | null> {
  return await fetchBase<T>('admin', endpoint, {
    method: 'DELETE',
  });
}

/** DELETE with a JSON body via the admin endpoint */
export async function fetchAdminDeleteJsonApi<T>(
  endpoint: string,
  body: unknown
): Promise<T | null> {
  return await fetchBase<T>('admin', endpoint, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** GET from the admin endpoint */
export async function fetchAdminGetApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T | null> {
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
      await throwApiError(response);
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    return await throwApiError(error);
  }
}
