/**
 * Core API utilities for making requests to the backend
 */

// TODO: Need to update this to push towards PROD endpoint, Fallback to Localhost
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

/**
 * Custom error class for API responses
 */
export class ApiError extends Error {
    status: number

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
export async function fetchFromApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
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
                response.status
            )
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
            error instanceof Error ? error.message : "Unknown error has occured",
            500
        )
    }
}