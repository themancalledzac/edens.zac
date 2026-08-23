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

  // Padding values (in pixels)
  desktopPadding: 25.6, // 0.8rem each side at ≥768px (0.8 * 16px * 2 = 25.6px)
  mobilePadding: 0, // mobile full-bleed, edge-to-edge

  // Content grid
  // Default density, matching the 'medium' DENSITY_TIERS preset. Feeds
  // rowWidth = round(chunkSize * DENSITY_ROW_WIDTH_MULTIPLIER).
  defaultChunkSize: 4,

  minDensity: 1,
  maxDensityDesktop: 10,
  maxDensityMobile: 5,

  // Grid gap between items (CSS: 0.4rem from each adjacent item = 0.8rem total)
  // This is the visual gap between adjacent items in a row or stacked column
  gridGap: 12.8, // 0.8rem = 12.8px (0.4rem padding on each side)
  mobileGridGap: 6.4, // 0.4rem = 6.4px (half of desktop gap)

  // Slot-based layout system
  // Slot width determines how many abstract "slots" fit in a row
  // Desktop: 8 slots for prominence-based layout (finer-grained weight distribution)
  // Mobile: 3 slots for prominence-based layout (coarser but rating-aware)
  desktopSlotWidth: 8,
  mobileSlotWidth: 3,

  // Header row constraints (cover image + description block)
  headerRowHeightRatio: 0.38, // Max row height as ratio of componentWidth (e.g., 0.38 = 38%)
  headerCoverMinRatio: 0.3, // Minimum cover image width as ratio of row width
  headerCoverMaxRatio: 0.5, // Maximum cover image width as ratio of row width

  // SSR fallback viewport, picked by UA detection in resolveSsrViewport().
  // Desktop width is picked above pageMaxWidth so getContentWidth() returns
  // the capped value any viewport ≥ pageMaxWidth would measure.
  ssrDefaultViewportWidthDesktop: 1440,
  ssrDefaultViewportWidthMobile: 390,
  ssrDefaultViewportHeightDesktop: 900,
  ssrDefaultViewportHeightMobile: 844,
  // Component keeps the server-side layout as long as the measured
  // contentWidth is within this many px of the server fallback. Beyond it,
  // the client recomputes once against the real viewport.
  ssrRecomputeToleranceWidth: 64,
} as const;

// Density → row-width multiplier: rowWidth = round(chunkSize × this). The packing
// cost is the width-cost Hv = √(P·AR) (orientation-agnostic), so K is calibrated
// against Hv, not cv. At K below, a default 4-chunk collection of normal 3★
// landscapes (Hv ≈ 2.108) packs the same 4-per-row it did under the old cv scale
// (cv 2.5, rowWidth 10). Used by contentLayout.ts (desktop + mobile) and referenced
// by the calibration test so code and test never drift.
export const DENSITY_ROW_WIDTH_MULTIPLIER = 2.1;

/**
 * Visitor-facing density presets, labelled by PHOTO SIZE.
 *
 * Size runs INVERSE to density: `rowWidth = round(density × DENSITY_ROW_WIDTH_MULTIPLIER)`, and the
 * viewport-derived target aspect ratio holds row AREA roughly constant ("one row per screen"), so
 * photo size ≈ constant ÷ density. Density 2 yields large photos, density 7 small ones — which is
 * why this control must never be labelled with the raw number or the word "Density".
 *
 * The values land at roughly 2 / 4 / 7 photos across (rowWidth ÷ ~2.108, the width-cost of a normal
 * 3★ landscape). Medium reproduces the historical default exactly. `desktop` and `mobile` are
 * values on their respective density scales — see {@link toMobileDensity}.
 */
export const DENSITY_TIERS = [
  { key: 'large', label: 'Large photos', desktop: 2, mobile: 1 },
  { key: 'medium', label: 'Medium photos', desktop: 4, mobile: 2 },
  { key: 'small', label: 'Small photos', desktop: 7, mobile: 4 },
] as const;

export type DensityTierKey = (typeof DENSITY_TIERS)[number]['key'];

/**
 * The tier whose value sits closest to `density` on the given viewport's scale.
 *
 * Purely a display decision: it picks which segment renders active and NEVER rewrites the density.
 * Collections carry off-tier stored `rowsWide` values (5, 6) that must keep driving their layout
 * untouched, so an off-tier collection highlights its nearest segment and only snaps when a visitor
 * actually clicks one. Ties resolve to the lower (larger-photo) tier, since {@link DENSITY_TIERS}
 * is ordered ascending and a strict `<` comparison keeps the first of an equal pair.
 */
export const nearestDensityTier = (density: number, isMobile: boolean): DensityTierKey =>
  DENSITY_TIERS.reduce((closest, tier) => {
    const scale = (t: (typeof DENSITY_TIERS)[number]) => (isMobile ? t.mobile : t.desktop);
    return Math.abs(scale(tier) - density) < Math.abs(scale(closest) - density) ? tier : closest;
  }).key;

// Per-rating base weight feeding the prominence value P = BASE_WEIGHT[rating] ×
// prominenceFactor(extremeness). Higher-rated images get more visual weight.
export const BASE_WEIGHT: Record<number, number> = {
  5: 5.0,
  4: 3.5,
  3: 2.5,
  2: 1.75,
  1: 1.25,
  0: 1.0,
};

// Prominence extremeness ramp: above EXTREMENESS_RAMP_START the prominence factor climbs
// linearly so very wide OR very tall images get extra weight. Keyed on EXTREMENESS = max(AR, 1/AR).
export const EXTREMENESS_RAMP_START = 2.0;
export const EXTREMENESS_RAMP_BASE = 1.4;
export const EXTREMENESS_RAMP_SLOPE = 0.6;

// =============================================================================
// INTERACTION & TIMING
// =============================================================================

export const INTERACTION = {
  swipeThreshold: 50, // Minimum px to trigger swipe gesture
} as const;

export const TIMING = {
  revalidateCache: 3600, // seconds (1 hour) for Next.js cache
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
} as const;

// =============================================================================
// PAGINATION
// =============================================================================

export const PAGINATION = {
  defaultPageSize: 50, // Most common - API default
  collectionPageSize: 35, // Initial load for collection pages
  homePageSize: 12, // Home page card limit
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

/**
 * Map a desktop-scale row density (1-10) onto the mobile slider scale (1-5):
 * half it, round, and clamp. The mobile default is therefore half the
 * collection's saved density (e.g. saved 4 -> 2), and the desktop max (10) maps
 * to the mobile max (5).
 */
export const toMobileDensity = (desktopDensity: number): number =>
  Math.max(LAYOUT.minDensity, Math.min(LAYOUT.maxDensityMobile, Math.round(desktopDensity / 2)));

/**
 * Inverse of {@link toMobileDensity}: map a mobile-scale value (1-5) the user
 * picked on the slider back onto the canonical desktop scale (1-10) that the
 * density state is stored in.
 */
export const fromMobileDensity = (mobileDensity: number): number =>
  Math.max(LAYOUT.minDensity, Math.min(LAYOUT.maxDensityDesktop, Math.round(mobileDensity) * 2));

/**
 * Whether to lay out with the client-measured width rather than the SSR width: true once measured
 * and the client is either narrower than the SSR width (which would otherwise overflow) or wider
 * than it by more than `tolerance` (small differences keep the SSR width to avoid a reflow).
 */
export const shouldUseMeasuredWidth = (
  measuredContentWidth: number,
  serverContentWidth: number | null | undefined,
  tolerance: number
): boolean =>
  measuredContentWidth > 0 &&
  (serverContentWidth == null ||
    measuredContentWidth < serverContentWidth ||
    measuredContentWidth - serverContentWidth > tolerance);
