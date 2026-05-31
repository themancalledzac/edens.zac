import { PARALLAX_CONSTANTS } from '@/app/constants/parallax';

/**
 * Available vertical parallax travel, in pixels, derived from the rendered
 * geometry of the parallax background element.
 *
 * The background image is absolutely positioned, taller than its clipping
 * container (e.g. `height: 130%`) and offset upward (e.g. `top: -15%`), so it
 * overflows the container on both edges. Those overflow amounts are the exact
 * distances the image may translate before the grey container shows through.
 *
 * Reading the values from live layout (rather than hard-coding the CSS
 * percentages) keeps the hook correct for any card height and self-correcting
 * if the CSS overflow ever changes.
 *
 * @param restTopPx - Untransformed top offset of the element (`offsetTop`); negative when offset upward.
 * @param imageHeightPx - Rendered height of the element (`offsetHeight`).
 * @param containerHeightPx - Content height of the clipping container.
 * @returns `downBudgetPx` (max downward/positive travel before the TOP edge reveals grey) and
 *          `upBudgetPx` (max upward/negative travel before the BOTTOM edge reveals grey). Both >= 0.
 */
export function getParallaxBudgets(
  restTopPx: number,
  imageHeightPx: number,
  containerHeightPx: number
): { upBudgetPx: number; downBudgetPx: number } {
  return {
    downBudgetPx: Math.max(0, -restTopPx),
    upBudgetPx: Math.max(0, restTopPx + imageHeightPx - containerHeightPx),
  };
}

/**
 * Parallax `translateY` (px) for a given scroll progress, bounded so the image
 * never travels further than its available overflow. This guarantees the grey
 * container is never revealed, at any card height or scroll position.
 *
 * Maps `scrollProgress` 0 -> full upward travel (`-up`) and 1 -> full downward
 * travel (`+down`); the neutral (0) position sits where the up/down budgets
 * balance (the card's center for symmetric overflow).
 *
 * @param scrollProgress - 0..1 visibility progress through the viewport (clamped).
 * @param upBudgetPx - Max upward (negative) travel before bottom grey, in px.
 * @param downBudgetPx - Max downward (positive) travel before top grey, in px.
 * @param safety - Fraction of the budget actually used; < 1 leaves a sub-pixel margin so rounding never reveals grey.
 */
export function computeParallaxOffset(
  scrollProgress: number,
  upBudgetPx: number,
  downBudgetPx: number,
  safety: number = PARALLAX_CONSTANTS.TRAVEL_SAFETY
): number {
  const progress = Math.max(0, Math.min(1, scrollProgress));
  const up = Math.max(0, upBudgetPx) * safety;
  const down = Math.max(0, downBudgetPx) * safety;
  return -up + progress * (up + down);
}
