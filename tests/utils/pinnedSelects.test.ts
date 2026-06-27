/**
 * Tests for buildPinnedSelects — the "Your Selects" prepend builder. It produces SHALLOW CLONES
 * of the selected images (in selection order), stamped with the local PINNED_SELECT marker, never
 * mutating the source and never pinning non-IMAGE content.
 */

import { type AnyContentModel, type ContentImageModel } from '@/app/types/Content';
import { PINNED_SELECT } from '@/app/types/Selects';
import { buildPinnedSelects } from '@/app/utils/pinnedSelects';

function img(id: number): ContentImageModel {
  return {
    id,
    contentType: 'IMAGE',
    imageUrl: `https://cdn.example.com/${id}.jpg`,
    orderIndex: id,
    locations: [],
  };
}

describe('buildPinnedSelects', () => {
  it('returns shallow clones of selected images, marked, in selection (Set iteration) order', () => {
    const content: AnyContentModel[] = [img(1), img(2), img(3)];
    const pinned = buildPinnedSelects(content, new Set([3, 1]));

    expect(pinned.map(p => p.id)).toEqual([3, 1]);
    expect(pinned.every(p => p[PINNED_SELECT] === true)).toBe(true);
  });

  it('does not mutate the source images', () => {
    const original = img(1);
    const pinned = buildPinnedSelects([original], new Set([1]));

    expect(pinned[0]).not.toBe(original);
    expect((original as { [PINNED_SELECT]?: true })[PINNED_SELECT]).toBeUndefined();
  });

  it('ignores selected ids not present in the content', () => {
    const pinned = buildPinnedSelects([img(1)], new Set([1, 99]));
    expect(pinned.map(p => p.id)).toEqual([1]);
  });

  it('returns an empty array when nothing is selected', () => {
    expect(buildPinnedSelects([img(1)], new Set())).toEqual([]);
  });

  it('only pins IMAGE content', () => {
    const text: AnyContentModel = {
      id: 5,
      contentType: 'TEXT',
      orderIndex: 5,
    } as AnyContentModel;
    const pinned = buildPinnedSelects([img(1), text], new Set([1, 5]));
    expect(pinned.map(p => p.id)).toEqual([1]);
  });
});
