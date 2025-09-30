/**
 * Parallax Configuration Constants
 *
 * Centralized constants for parallax behavior across the application.
 * Ensures consistent parallax effects and makes configuration changes easier.
 */

export const PARALLAX_CONSTANTS = {
  // IntersectionObserver configuration
  DEFAULT_THRESHOLD: 0.1,
  DEFAULT_ROOT_MARGIN: '50px',

  // Performance settings
  UPDATE_THRESHOLD: 0.5, // Minimum pixel change before updating transform

  // Animation timing
  FADE_IN_DELAY: '0.1s',
  FADE_IN_DURATION: '0.4s',

  // Parallax offset range (in pixels)
  OFFSET_MIN: -50,
  OFFSET_MAX: 100,

  // Viewport height adjustment (accounts for fixed header and mobile chrome UI)
  VIEWPORT_HEIGHT_OFFSET: 200,

} as const;

