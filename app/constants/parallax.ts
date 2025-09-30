/**
 * Parallax Configuration Constants
 *
 * Centralized constants for parallax behavior across the application.
 * Ensures consistent parallax effects and makes configuration changes easier.
 */

export const PARALLAX_CONSTANTS = {
  // Default parallax speed (negative for upward movement)
  DEFAULT_SPEED: -0.1,

  // IntersectionObserver configuration
  DEFAULT_THRESHOLD: 0.1,
  DEFAULT_ROOT_MARGIN: '50px',

  // Image sizing for parallax effect
  // IMAGE_HEIGHT_PERCENTAGE: '130%', // Saved for if we ever want to Use this as a specific value
  // IMAGE_TOP_OFFSET: '-15%', // Start positioned higher

  // Performance settings
  UPDATE_THRESHOLD: 0.5, // Minimum pixel change before updating transform

  // Animation timing
  FADE_IN_DELAY: '0.1s',
  FADE_IN_DURATION: '0.4s',

  // Parallax offset range (in pixels)
  OFFSET_MIN: -50,
  OFFSET_MAX: 50,

} as const;

/**
 * Default parallax hook configuration
 */
export const DEFAULT_PARALLAX_CONFIG = {
  mode: 'single' as const,
  speed: PARALLAX_CONSTANTS.DEFAULT_SPEED,
  selector: '.parallax-bg',
  threshold: PARALLAX_CONSTANTS.DEFAULT_THRESHOLD,
  rootMargin: PARALLAX_CONSTANTS.DEFAULT_ROOT_MARGIN,
} as const;

