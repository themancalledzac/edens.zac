/**
 * Shared storage for scroll position during full-screen image transitions
 *
 * This module-level storage allows scroll position to be captured BEFORE
 * URL updates (in useImageSelection) and read AFTER URL updates (in
 * ImageFullScreenController), solving the race condition where browser
 * navigation can reset scroll before React effects run.
 *
 * Why this is needed:
 * - router.push() may cause browser to reset scroll position
 * - React effects (useEffect/useLayoutEffect) run AFTER URL update
 * - By the time effects run, window.scrollY might already be 0
 * - This store captures scroll synchronously BEFORE the problematic event
 */

/**
 * Module-level scroll position storage
 * Initialized to 0, updated before navigation, read after navigation
 */
let savedScrollPosition = 0;

/**
 * Store the current scroll position
 * Call this BEFORE router.push() to capture scroll before browser navigation
 */
export function saveScrollPosition(position: number): void {
  savedScrollPosition = position;
}

/**
 * Retrieve the saved scroll position
 * Call this in effect after URL update to restore correct scroll
 */
export function getSavedScrollPosition(): number {
  return savedScrollPosition;
}

/**
 * Reset the saved scroll position to 0
 * Call this after scroll has been restored to clean up
 */
export function clearSavedScrollPosition(): void {
  savedScrollPosition = 0;
}