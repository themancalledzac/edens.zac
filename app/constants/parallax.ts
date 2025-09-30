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
  // Threshold array for granular intersection detection (0-100% in 10% increments)
  THRESHOLD_ARRAY: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],

  // Performance settings
  // Minimum pixel change before updating transform (0.5px provides smooth animation)
  // Note: Increasing to 1-2px reduces repaints but may appear less smooth
  UPDATE_THRESHOLD: 0.5,

  // Animation timing
  FADE_IN_DELAY: '0.1s',
  FADE_IN_DURATION: '0.4s',

  // Parallax offset range (in pixels)
  OFFSET_MIN: -50,
  OFFSET_MAX: 100,

  // Viewport height adjustment (accounts for fixed header and mobile chrome UI)
  VIEWPORT_HEIGHT_OFFSET: 200,

};

