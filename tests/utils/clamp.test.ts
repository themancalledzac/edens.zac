import { clamp } from '@/app/utils/clamp';

describe('clamp', () => {
  it('returns the value unchanged when within range', () => {
    expect(clamp(3, 0, 5)).toBe(3);
  });

  it('clamps to the max when above range', () => {
    expect(clamp(9, 0, 5)).toBe(5);
  });

  it('clamps to the min when below range', () => {
    expect(clamp(-2, 0, 5)).toBe(0);
  });

  it('returns the boundary values inclusively', () => {
    expect(clamp(0, 0, 5)).toBe(0);
    expect(clamp(5, 0, 5)).toBe(5);
  });
});
