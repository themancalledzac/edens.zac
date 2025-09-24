/**
 * Base utilities for server-side props handling
 */
import { type GetServerSidePropsContext, type GetServerSidePropsResult } from 'next';

import { ApiError } from '@/lib/api/core';

/**
 * Type for any getServerSideProps function
 */
type GetServerSidePropsFunction = (
  context: GetServerSidePropsContext,
) => Promise<GetServerSidePropsResult<Record<string, unknown>>>;

/**
 * Wrap a getServerSideProps function with standard error handling
 *
 * @param propsFn - The function to wrap
 * @returns A wrapped function with error handling
 */
export function withErrorHandling(propsFn: GetServerSidePropsFunction): GetServerSidePropsFunction {
  return async (context) => {
    try {
      return await propsFn(context);
    } catch (error) {
      console.error('Error in getServerSideProps:', error);

      // Handle API errors
      if (error instanceof ApiError && error.status === 400) {
        return {
          notFound: true,
        };
      }

      // Default error props
      return {
        props: {
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error occured in GetServerSideProps',
        },
      };
    }
  };
}