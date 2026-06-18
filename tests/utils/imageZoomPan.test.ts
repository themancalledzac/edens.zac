import {
  buildTransform,
  clampScale,
  clampTranslate,
  touchDistance,
  ZOOM,
} from '@/app/utils/imageZoomPan';

describe('imageZoomPan helpers', () => {
  describe('touchDistance', () => {
    it('computes the Euclidean distance between two points', () => {
      expect(touchDistance({ clientX: 0, clientY: 0 }, { clientX: 3, clientY: 4 })).toBe(5);
    });

    it('is zero for coincident points', () => {
      expect(touchDistance({ clientX: 10, clientY: 20 }, { clientX: 10, clientY: 20 })).toBe(0);
    });
  });

  describe('clampScale', () => {
    it('passes through a value inside the range', () => {
      expect(clampScale(2)).toBe(2);
    });

    it('clamps below min and above max', () => {
      expect(clampScale(0.2)).toBe(ZOOM.min);
      expect(clampScale(99)).toBe(ZOOM.max);
    });
  });

  describe('clampTranslate', () => {
    it('returns 0 when not zoomed (nothing to pan)', () => {
      expect(clampTranslate(500, 1, 1000)).toBe(0);
      expect(clampTranslate(-500, 0.5, 1000)).toBe(0);
    });

    it('allows offsets up to half the overflow at the current scale', () => {
      // scale 2, size 1000 → overflow 1000 → half = 500 each side.
      expect(clampTranslate(300, 2, 1000)).toBe(300);
      expect(clampTranslate(800, 2, 1000)).toBe(500);
      expect(clampTranslate(-800, 2, 1000)).toBe(-500);
    });
  });

  describe('buildTransform', () => {
    it('lists translate before scale so the offset stays in screen px', () => {
      expect(buildTransform(2, 10, -20)).toBe('translate3d(10px, -20px, 0) scale(2)');
    });

    it('renders the identity transform at rest', () => {
      expect(buildTransform(1, 0, 0)).toBe('translate3d(0px, 0px, 0) scale(1)');
    });
  });
});
