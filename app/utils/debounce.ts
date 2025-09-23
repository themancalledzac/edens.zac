import { useCallback, useRef } from 'react';

/**
 * useDebounce Hook
 *
 * Performance optimization hook that delays function execution until after
 * a specified period has passed since the last invocation. Uses useRef to
 * persist timeout across renders and prevent memory leaks through cleanup.
 *
 * @dependencies
 * - React useCallback for memoization
 * - React useRef for timeout persistence
 *
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds before execution
 * @returns Debounced version of the callback function
 */
export function useDebounce<T extends (...args: never[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    }) as T,
    [callback, delay]
  );
}