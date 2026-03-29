/**
 * Shared API utility functions
 * Generic helpers that can be used across hooks, components, and utilities.
 */

/**
 * Standardized error handling helper
 * Extracts error message from various error types or provides default.
 * Handles: Error objects, fetch Response errors, API error objects, and strings.
 *
 * @param error - Unknown error value caught in a catch block
 * @param defaultMessage - Fallback message when no useful message can be extracted
 * @returns Human-readable error message string
 */
export function handleApiError(error: unknown, defaultMessage: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    if ('response' in error && typeof (error as { response: unknown }).response === 'object') {
      const response = (error as { response: Record<string, unknown> }).response;
      if (response && 'statusText' in response && typeof response.statusText === 'string') {
        return response.statusText;
      }
      if (response && 'message' in response && typeof response.message === 'string') {
        return response.message;
      }
    }

    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }

    if ('statusText' in error && typeof (error as { statusText: unknown }).statusText === 'string') {
      return (error as { statusText: string }).statusText;
    }
  }

  if (typeof error === 'string') {
    return error;
  }

  return defaultMessage;
}
