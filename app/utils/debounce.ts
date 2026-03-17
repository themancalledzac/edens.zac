import { useCallback, useEffect, useRef } from 'react';

/**
 * useDebounce Hook
 *
 * Delays function execution until after a specified period has passed
 * since the last invocation. Uses a callback ref pattern to ensure
 * the returned function identity is stable.
 *
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds before execution
 * @returns Debounced version of the callback function (stable reference)
 */
export function useDebounce<T extends (...args: never[]) => void>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef<T>(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callbackRef.current(...args), delay);
    }) as T,
    [delay]
  );
}

/**
 * useThrottle Hook
 *
 * Limits function execution to at most once per interval. Fires immediately
 * on the first call (leading edge), then at most once per `interval` ms
 * during continuous invocation, plus a trailing call to capture the final state.
 *
 * Ideal for resize/scroll handlers where you need responsive updates during
 * active interaction, unlike debounce which only fires after interaction stops.
 *
 * @param callback - Function to throttle
 * @param interval - Minimum interval in milliseconds between executions
 * @returns Throttled version of the callback function (stable reference)
 */
export function useThrottle<T extends (...args: never[]) => void>(
  callback: T,
  interval: number
): T {
  const callbackRef = useRef<T>(callback);
  const lastCallRef = useRef<number>(0);
  const trailingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (trailingTimeoutRef.current) clearTimeout(trailingTimeoutRef.current);
    };
  }, []);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      // Clear any pending trailing call
      if (trailingTimeoutRef.current) clearTimeout(trailingTimeoutRef.current);

      if (timeSinceLastCall >= interval) {
        // Leading edge: enough time has passed, fire immediately
        lastCallRef.current = now;
        callbackRef.current(...args);
      } else {
        // Trailing: capture the final state after interval elapses
        trailingTimeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callbackRef.current(...args);
        }, interval - timeSinceLastCall);
      }
    }) as T,
    [interval]
  );
}
