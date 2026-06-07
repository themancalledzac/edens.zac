/**
 * Unit tests for the pure helpers extracted from {@link BoxRenderer}.
 */

import { computeReorderFlags } from '@/app/components/Content/boxRendererUtils';

describe('computeReorderFlags', () => {
  describe('when not in reorder mode', () => {
    it('never marks an item picked up or moved', () => {
      const flags = computeReorderFlags(7, {
        isReorderMode: false,
        pickedUpImageId: 7,
        reorderMoves: [{ imageId: 7, toIndex: 0 }],
        reorderDisplayOrder: [7, 8, 9],
      });
      expect(flags.isPickedUp).toBe(false);
      expect(flags.hasMoved).toBe(false);
    });
  });

  describe('isPickedUp', () => {
    it('is true when the item is the picked-up image in reorder mode', () => {
      const flags = computeReorderFlags(7, {
        isReorderMode: true,
        pickedUpImageId: 7,
        reorderMoves: undefined,
        reorderDisplayOrder: undefined,
      });
      expect(flags.isPickedUp).toBe(true);
    });

    it('is false when a different image is picked up', () => {
      const flags = computeReorderFlags(7, {
        isReorderMode: true,
        pickedUpImageId: 8,
        reorderMoves: undefined,
        reorderDisplayOrder: undefined,
      });
      expect(flags.isPickedUp).toBe(false);
    });
  });

  describe('hasMoved', () => {
    it('is true when the item appears in reorderMoves', () => {
      const flags = computeReorderFlags(7, {
        isReorderMode: true,
        pickedUpImageId: null,
        reorderMoves: [
          { imageId: 9, toIndex: 1 },
          { imageId: 7, toIndex: 0 },
        ],
        reorderDisplayOrder: undefined,
      });
      expect(flags.hasMoved).toBe(true);
    });

    it('is false when the item is not in reorderMoves', () => {
      const flags = computeReorderFlags(7, {
        isReorderMode: true,
        pickedUpImageId: null,
        reorderMoves: [{ imageId: 9, toIndex: 1 }],
        reorderDisplayOrder: undefined,
      });
      expect(flags.hasMoved).toBe(false);
    });

    it('is false when reorderMoves is undefined', () => {
      const flags = computeReorderFlags(7, {
        isReorderMode: true,
        pickedUpImageId: null,
        reorderMoves: undefined,
        reorderDisplayOrder: undefined,
      });
      expect(flags.hasMoved).toBe(false);
    });
  });

  describe('isFirstInOrder / isLastInOrder', () => {
    it('marks the first and last items by display order', () => {
      const order = [5, 6, 7];
      expect(
        computeReorderFlags(5, {
          isReorderMode: true,
          reorderDisplayOrder: order,
        }).isFirstInOrder
      ).toBe(true);
      expect(
        computeReorderFlags(7, {
          isReorderMode: true,
          reorderDisplayOrder: order,
        }).isLastInOrder
      ).toBe(true);
    });

    it('marks a middle item as neither first nor last', () => {
      const flags = computeReorderFlags(6, {
        isReorderMode: true,
        reorderDisplayOrder: [5, 6, 7],
      });
      expect(flags.isFirstInOrder).toBe(false);
      expect(flags.isLastInOrder).toBe(false);
    });

    it('treats an id absent from a non-empty order as neither first nor last', () => {
      // indexOf === -1; isFirst (=== 0) false, isLast (=== len-1, i.e. 2) false
      const flags = computeReorderFlags(99, {
        isReorderMode: true,
        reorderDisplayOrder: [5, 6, 7],
      });
      expect(flags.isFirstInOrder).toBe(false);
      expect(flags.isLastInOrder).toBe(false);
    });

    it('treats an empty display order as last (preserving -1 === 0 - 1)', () => {
      // orderIndex = -1, length 0 → isLast === (-1 === -1) → true; isFirst false
      const flags = computeReorderFlags(7, {
        isReorderMode: true,
        reorderDisplayOrder: [],
      });
      expect(flags.isFirstInOrder).toBe(false);
      expect(flags.isLastInOrder).toBe(true);
    });

    it('treats an undefined display order as last (preserving -1 === 0 - 1)', () => {
      const flags = computeReorderFlags(7, {
        isReorderMode: true,
        reorderDisplayOrder: undefined,
      });
      expect(flags.isFirstInOrder).toBe(false);
      expect(flags.isLastInOrder).toBe(true);
    });
  });
});
