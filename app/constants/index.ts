/**
 * Application Constants - Single Source of Truth
 *
 * IMPORTANT: Keep in sync with CSS variables in app/styles/globals.css
 * When updating layout values, change BOTH locations.
 */

// =============================================================================
// LAYOUT & DIMENSIONS
// =============================================================================

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
} as const;

export const LAYOUT = {
  // Maximum widths
  pageMaxWidth: 1300, // CSS: --page-max-width
  contentMaxWidth: 800, // CSS: --content-max-width
  contentMinWidth: 766, // CSS: --content-min-width

  // Padding values (in pixels)
  desktopPadding: 25.6, // 0.8rem each side at ≥768px (0.8 * 16px * 2 = 25.6px)
  mobilePadding: 0, // mobile full-bleed, edge-to-edge

  // Content grid
  defaultChunkSize: 4, // Max items per row (1-2 star images get 1 slot, 3+ star get 2 slots)
  minChunkSize: 2, // Minimum chunk size (ensures halfSlot is at least 1)

  // Grid gap between items (CSS: 0.4rem from each adjacent item = 0.8rem total)
  // This is the visual gap between adjacent items in a row or stacked column
  gridGap: 12.8, // 0.8rem = 12.8px (0.4rem padding on each side)
  mobileGridGap: 6.4, // 0.4rem = 6.4px (half of desktop gap)

  // Pattern detection
  patternWindowSize: 5, // Items to look ahead for pattern detection
  patternMaxMovement: 2, // Max positions an item can move during pattern matching

  // Slot-based layout system
  // Slot width determines how many abstract "slots" fit in a row
  // Desktop: 5 slots allows for finer-grained layout (5-star = full row, 4-star = ~2.5 slots)
  // Mobile: 2 slots provides simpler binary layout (full width or half width)
  desktopSlotWidth: 5,
  mobileSlotWidth: 2,

  // Header row constraints (cover image + description block)
  headerRowHeightRatio: 0.45, // Max row height as ratio of componentWidth (e.g., 0.45 = 45%)
  headerCoverMinRatio: 0.3, // Minimum cover image width as ratio of row width
  headerCoverMaxRatio: 0.5, // Maximum cover image width as ratio of row width
} as const;

// =============================================================================
// INTERACTION & TIMING
// =============================================================================

export const INTERACTION = {
  swipeThreshold: 50, // Minimum px to trigger swipe gesture
  intersectionMargin: 400, // px before element visible to start loading
} as const;

export const TIMING = {
  debounceResize: 100, // ms for resize event debouncing
  revalidateCache: 3600, // seconds (1 hour) for Next.js cache
  apiMockDelay: 500, // ms for simulating API calls in dev
} as const;

// =============================================================================
// IMAGE DEFAULTS
// =============================================================================

export const IMAGE = {
  // Fallback dimensions when actual dimensions unavailable
  defaultWidth: 1300, // Matches pageMaxWidth
  defaultHeight: 867, // Maintains ~3:2 aspect ratio with defaultWidth

  // Aspect ratio (w/h) bounds for parallax collection covers
  // Clamps cover images to a [4:5, 5:4] range so they're never too tall or too wide
  minParallaxAR: 4 / 5, // 0.8 — never taller than 5:4
  maxParallaxAR: 5 / 4, // 1.25 — never wider than 5:4

  // Grid/thumbnail dimensions
  gridWidth: 800,
  gridHeightCatalog: 800, // 1:1 for catalog cards
  gridHeightBlog: 457, // ~1.75:1 for blog cards
} as const;

// =============================================================================
// PAGINATION
// =============================================================================

export const PAGINATION = {
  defaultPageSize: 50, // Most common - API default
  collectionPageSize: 35, // Initial load for collection pages
  homePageSize: 12, // Home page card limit
  adminManageMax: 200, // Max items in admin management interface
} as const;

// =============================================================================
// Z-INDEX LAYERS
// =============================================================================

/**
 * Systematic z-index layering to prevent conflicts and ensure predictable stacking.
 * Use these constants instead of arbitrary numbers throughout the app.
 *
 * Layer hierarchy:
 * - Base (1-9): Content and base elements
 * - Elevated (10-99): Overlays, badges, tooltips
 * - Navigation (100-499): Dropdowns, menus, sticky headers
 * - Modal (500-999): Modal overlays and content
 * - Critical (1000+): Fullscreen modals, notifications, alerts
 */
export const Z_INDEX = {
  // Base layer (1-9)
  base: 1, // Base content layer
  content: 2, // Content elements that need to sit above base
  overlay: 3, // Text overlays, badges on images

  // Elevated layer (10-99)
  dropdown: 100, // Dropdown menus, context menus
  sticky: 500, // Sticky headers, floating elements

  // Modal layer (500-999)
  modal: 1000, // Modal backdrops and containers
  modalControls: 1002, // Modal close buttons and controls (above modal content)

  // Critical layer (1000+)
  fullscreen: 9999, // Fullscreen overlays, critical UI
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate content width based on viewport width and mobile state
 * Used by useViewport hook
 *
 * For desktop: Accounts for container padding (25.6px total) on both sides.
 * The container has max-width: 1300px with 0.8rem (12.8px) padding on each side,
 * so the actual content width is 1300 - 25.6 = 1274.4px.
 */
export const getContentWidth = (viewportWidth: number, isMobile: boolean): number => {
  if (isMobile) {
    return Math.max(0, viewportWidth - LAYOUT.mobilePadding);
  }
  return Math.max(
    0,
    Math.min(viewportWidth - LAYOUT.desktopPadding, LAYOUT.pageMaxWidth - LAYOUT.desktopPadding)
  );
};

// =============================================================================
// REMAINING OPPORTUNITIES - Future Centralization Candidates
// =============================================================================

/**
 * ✅ COMPLETED IMPROVEMENTS:
 * - Fixed useFullScreenImage DEFAULT_IMAGE_WIDTH (1200 → 1300) ✓
 * - Fixed useFullScreenImage DEFAULT_IMAGE_HEIGHT (800 → 867) ✓
 * - Established Z_INDEX system and migrated all z-index values ✓
 * - Created BREAKPOINTS, LAYOUT, IMAGE, INTERACTION, TIMING, PAGINATION constants ✓
 *
 * 📋 REMAINING - Values that could be centralized if needed:
 *
 * VALIDATION (if form validation becomes centralized):
 *   - TITLE_MIN_LENGTH: 3 (characters)
 *   - TITLE_MAX_LENGTH: 100 (characters)
 *   - PASSWORD_MIN_LENGTH: 8 (characters)
 *
 * UI DIMENSIONS (currently used in specific contexts):
 *   - PERSPECTIVE_DEPTH: 800 (px for 3D transforms)
 *   - FORM_GAP: 12 (px spacing in forms)
 *   - BUTTON_SIZE_LARGE: 40 (px for nav buttons)
 *   - ADMIN_CONTAINER_MAX: 960 (px)
 *   - FORM_MAX_WIDTH: 800 (px)
 *   - MENU_DROPDOWN_WIDTH: 400 (px)
 *   - HOME_MAX_WIDTH: 600 (px)
 *   - ABOUT_IMAGE: 300x400 (specific component)
 *
 * ANIMATIONS (currently consistent, but could be centralized):
 *   - TRANSITION_STANDARD: 0.2s ease (most common)
 *   - TRANSITION_SLOW: 0.3s ease (ContactForm only)
 *
 * 💡 NOTES:
 * - Many of these values are component-specific and may not benefit from centralization
 * - Consider adding them only if they're reused across 3+ files
 * - Current system provides good balance between DRY and over-abstraction
 */
