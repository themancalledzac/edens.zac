import { PARALLAX_CONSTANTS } from '@/app/constants/parallax';
import { computeParallaxOffset, getParallaxBudgets } from '@/app/utils/parallaxMath';

describe('getParallaxBudgets', () => {
  it('splits overflow evenly for symmetric geometry (height 130%, top -15%)', () => {
    const H = 400;
    const { upBudgetPx, downBudgetPx } = getParallaxBudgets(-0.15 * H, 1.3 * H, H);
    expect(downBudgetPx).toBeCloseTo(0.15 * H); // 60px before top grey
    expect(upBudgetPx).toBeCloseTo(0.15 * H); // 60px before bottom grey
  });

  it('reflects the old asymmetric geometry (top -25%) as a starved bottom budget', () => {
    const H = 400;
    const { upBudgetPx, downBudgetPx } = getParallaxBudgets(-0.25 * H, 1.3 * H, H);
    expect(downBudgetPx).toBeCloseTo(0.25 * H); // 100px top budget
    expect(upBudgetPx).toBeCloseTo(0.05 * H); // only 20px bottom budget — the root of the bug
  });

  it('never returns negative budgets', () => {
    const { upBudgetPx, downBudgetPx } = getParallaxBudgets(0, 100, 200);
    expect(upBudgetPx).toBe(0);
    expect(downBudgetPx).toBe(0);
  });
});

describe('computeParallaxOffset', () => {
  const up = 60;
  const down = 60;

  it('is full upward (negative) at scrollProgress 0', () => {
    expect(computeParallaxOffset(0, up, down, 1)).toBeCloseTo(-60);
  });

  it('is full downward (positive) at scrollProgress 1', () => {
    expect(computeParallaxOffset(1, up, down, 1)).toBeCloseTo(60);
  });

  it('is neutral (0) at scrollProgress 0.5 for symmetric budgets', () => {
    expect(computeParallaxOffset(0.5, up, down, 1)).toBeCloseTo(0);
  });

  it('clamps scrollProgress outside [0, 1]', () => {
    expect(computeParallaxOffset(-1, up, down, 1)).toBeCloseTo(-60);
    expect(computeParallaxOffset(2, up, down, 1)).toBeCloseTo(60);
  });

  it('applies the safety factor', () => {
    expect(computeParallaxOffset(1, up, down, 0.9)).toBeCloseTo(54);
    expect(computeParallaxOffset(0, up, down, 0.9)).toBeCloseTo(-54);
  });

  it('uses the configured safety factor by default', () => {
    expect(computeParallaxOffset(1, up, down)).toBeCloseTo(60 * PARALLAX_CONSTANTS.TRAVEL_SAFETY);
  });

  // Core invariant: the offset NEVER exceeds the available overflow on either
  // edge, so the grey container can never be revealed — at any height/progress.
  it('never exceeds the available budget on either edge (no grey, any height)', () => {
    for (const H of [120, 311, 500, 1500]) {
      const { upBudgetPx, downBudgetPx } = getParallaxBudgets(-0.15 * H, 1.3 * H, H);
      for (let p = 0; p <= 1.0001; p += 0.05) {
        const offset = computeParallaxOffset(p, upBudgetPx, downBudgetPx);
        expect(offset).toBeGreaterThanOrEqual(-upBudgetPx - 1e-9);
        expect(offset).toBeLessThanOrEqual(downBudgetPx + 1e-9);
      }
    }
  });

  it('stays within even the starved bottom budget of the old asymmetric geometry', () => {
    // The old fixed-px code translated to -75px here, far past the ~15px bottom
    // budget of a 311px card — exactly what produced the grey strip.
    const H = 311;
    const { upBudgetPx, downBudgetPx } = getParallaxBudgets(-0.25 * H, 1.3 * H, H);
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const offset = computeParallaxOffset(p, upBudgetPx, downBudgetPx);
      expect(offset).toBeGreaterThanOrEqual(-upBudgetPx - 1e-9);
      expect(offset).toBeLessThanOrEqual(downBudgetPx + 1e-9);
    }
  });
});
