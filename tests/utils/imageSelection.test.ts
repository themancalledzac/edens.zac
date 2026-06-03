/**
 * Unit tests for toggleImageSelection — the shared multi-select toggle used by both the admin
 * manage page and the public client-gallery "Select" download flow.
 */

import { toggleImageSelection } from '@/app/utils/imageSelection';

describe('toggleImageSelection', () => {
  it('adds an id that is not yet selected (appended last)', () => {
    expect(toggleImageSelection(3, [1, 2])).toEqual([1, 2, 3]);
  });

  it('removes an id that is already selected', () => {
    expect(toggleImageSelection(2, [1, 2, 3])).toEqual([1, 3]);
  });

  it('selects the first image from an empty selection', () => {
    expect(toggleImageSelection(1, [])).toEqual([1]);
  });

  it('deselects the last image back to empty', () => {
    expect(toggleImageSelection(1, [1])).toEqual([]);
  });

  it('preserves the order of the other ids', () => {
    expect(toggleImageSelection(2, [1, 3, 5])).toEqual([1, 3, 5, 2]);
    expect(toggleImageSelection(3, [1, 2, 3, 4, 5])).toEqual([1, 2, 4, 5]);
  });

  it('does not mutate the input array', () => {
    const input = [1, 2];
    const result = toggleImageSelection(3, input);
    expect(input).toEqual([1, 2]);
    expect(result).not.toBe(input);
  });
});
