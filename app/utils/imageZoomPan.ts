/**
 * Pure math helpers for the fullscreen image pinch-to-zoom / pan gesture.
 *
 * Kept side-effect-free (no DOM, no refs) so the gesture state machine in
 * `useFullScreenImage` stays thin and these can be unit-tested directly.
 */

/** Zoom bounds and the double-tap reset trigger. */
export const ZOOM = {
  /** Unzoomed baseline. */
  min: 1,
  /** Hard ceiling so a fast pinch can't blow the image up indefinitely. */
  max: 4,
} as const;

/** Minimal shape of a touch point — `Touch` satisfies this structurally. */
export interface TouchPoint {
  clientX: number;
  clientY: number;
}

/** Euclidean distance between two touch points (used to size a pinch). */
export function touchDistance(a: TouchPoint, b: TouchPoint): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/** Clamp a scale into the allowed [min, max] zoom range. */
export function clampScale(scale: number, min: number = ZOOM.min, max: number = ZOOM.max): number {
  return Math.min(max, Math.max(min, scale));
}

/**
 * Clamp a translate offset so scaled content can't be panned past its own edge.
 *
 * At scale `s` the content overflows its box by `(s - 1) * size`, so it can move at
 * most half that in either direction. Returns 0 when not zoomed (nothing to pan).
 *
 * @param value - proposed translate offset, in screen px
 * @param scale - current scale factor
 * @param size  - unscaled content size along this axis, in px
 */
export function clampTranslate(value: number, scale: number, size: number): number {
  if (scale <= 1) return 0;
  const maxOffset = ((scale - 1) * size) / 2;
  return Math.min(maxOffset, Math.max(-maxOffset, value));
}

/**
 * Build the CSS transform. `translate` is listed before `scale` so the offset stays
 * in unscaled screen px (1px of finger travel = 1px of image travel) regardless of zoom.
 */
export function buildTransform(scale: number, tx: number, ty: number): string {
  return `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
}
