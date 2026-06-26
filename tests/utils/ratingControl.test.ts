/**
 * Tests for ratingControl — the capability helpers (canOverride / canEditRating)
 * and the `resolveRatings` transform that substitutes each image's rating with
 * `drag ?? override ?? canonical` on a shallow clone BEFORE the layout engine runs.
 */

import { type MeResponse } from '@/app/types/Auth';
import { getEffectiveRating, getProminence } from '@/app/utils/contentRatingUtils';
import { canEditRating, canOverride, resolveRatings } from '@/app/utils/ratingControl';
import { createHorizontalImage, createTextContent } from '@/tests/fixtures/contentFixtures';

const clientMe: MeResponse = {
  email: 'client@example.com',
  mfaSatisfied: false,
  galleries: [{ collectionId: 7, role: 'CLIENT' }],
};

const generalMe: MeResponse = {
  email: 'general@example.com',
  mfaSatisfied: false,
  galleries: [{ collectionId: 7, role: 'GENERAL' }],
};

describe('canOverride (non-admin CLIENT membership for THIS collection)', () => {
  it('is true for a CLIENT member of the collection', () => {
    expect(canOverride(clientMe, 7, false)).toBe(true);
  });
  it('is false for a CLIENT member of a DIFFERENT collection', () => {
    expect(canOverride(clientMe, 99, false)).toBe(false);
  });
  it('is false for a GENERAL member', () => {
    expect(canOverride(generalMe, 7, false)).toBe(false);
  });
  it('is false in editMode (admins edit canonical, not overrides)', () => {
    expect(canOverride(clientMe, 7, true)).toBe(false);
  });
  it('is false for an anonymous viewer', () => {
    expect(canOverride(null, 7, false)).toBe(false);
  });
});

describe('canEditRating (editMode OR a CLIENT override)', () => {
  it.each([
    ['editMode (admin perimeter)', null, 7, true, true],
    ['CLIENT member', clientMe, 7, false, true],
    ['GENERAL member', generalMe, 7, false, false],
    ['anon', null, 7, false, false],
  ])('%s -> %s', (_label, me, collectionId, em, expected) => {
    expect(canEditRating(me, collectionId, em)).toBe(expected);
  });
});

describe('resolveRatings', () => {
  it('returns a NEW array with shallow-cloned changed items and never mutates the input', () => {
    const input = [createHorizontalImage(1, 2)];
    const out = resolveRatings(input, new Map([[1, 4]]), null);
    expect(out).not.toBe(input);
    expect(out[0]).not.toBe(input[0]);
    expect((input[0] as { rating: number }).rating).toBe(2); // untouched
    expect((out[0] as { rating: number }).rating).toBe(4);
  });

  it('applies precedence drag > override > canonical', () => {
    const input = [
      createHorizontalImage(1, 2),
      createHorizontalImage(2, 2),
      createHorizontalImage(3, 2),
    ];
    const out = resolveRatings(input, new Map([[2, 4]]), { contentId: 3, value: 5 });
    expect(out.map(i => (i as { rating: number }).rating)).toEqual([2, 4, 5]);
  });

  it('lets a drag win even on an overridden image', () => {
    const input = [createHorizontalImage(1, 1)];
    const out = resolveRatings(input, new Map([[1, 3]]), { contentId: 1, value: 5 });
    expect((out[0] as { rating: number }).rating).toBe(5);
  });

  it('LAYOUT RECOMPUTE: a resolved rating changes getEffectiveRating + prominence', () => {
    const low = createHorizontalImage(1, 1);
    const resolved = resolveRatings([low], new Map([[1, 5]]), null);
    expect(getEffectiveRating(resolved[0]!)).toBe(5);
    expect(getProminence(resolved[0]!)).toBeGreaterThan(getProminence(low));
  });

  it('DRAG-BEFORE-LAYOUT: a drag value feeds getEffectiveRating downstream', () => {
    const img = createHorizontalImage(1, 0);
    const resolved = resolveRatings([img], new Map(), { contentId: 1, value: 4 });
    expect(getEffectiveRating(resolved[0]!)).toBe(4);
  });

  it('leaves non-image content untouched (by reference) even with a matching override + drag', () => {
    const text = createTextContent(5);
    const out = resolveRatings([text], new Map([[5, 3]]), { contentId: 5, value: 4 });
    expect(out[0]).toBe(text);
    expect(out[0]).toEqual(text);
  });
});
