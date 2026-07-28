import {
  type AnyContentModel,
  type ContentGifModel,
  type ContentImageModel,
} from '@/app/types/Content';
import { sortByDate, toChronologicalOrder } from '@/app/utils/sortByDate';

// ─── Test Fixtures ───
// Mirrors tests/utils/contentFilter.test.ts's makeImage/makeGif conventions.

function makeImage(overrides: Partial<ContentImageModel> = {}): ContentImageModel {
  return {
    id: 1,
    contentType: 'IMAGE',
    orderIndex: 0,
    imageUrl: 'https://example.com/test.jpg',
    imageWidth: 1600,
    imageHeight: 1067,
    locations: [],
    ...overrides,
  };
}

function makeGif(overrides: Partial<ContentGifModel> = {}): ContentGifModel {
  return {
    id: 200,
    contentType: 'GIF',
    orderIndex: 0,
    gifUrl: 'https://example.com/test.gif',
    ...overrides,
  };
}

describe('sortByDate', () => {
  it('sorts by captureDate ascending, tiebreaking on createdAt', () => {
    const a = makeImage({ id: 1, captureDate: '2024-01-05', createdAt: '2024-06-01' });
    const b = makeImage({ id: 2, captureDate: '2024-01-01', createdAt: '2024-06-02' });
    expect(sortByDate([a, b], 'asc').map(i => i.id)).toEqual([2, 1]);
  });
});

describe('toChronologicalOrder', () => {
  it('places dateables by captureDate, keeps others put', () => {
    const img1 = makeImage({ id: 1, captureDate: '2024-01-03', createdAt: '2024-06-01' });
    const gifDated = makeGif({ id: 2, captureDate: '2024-01-01', createdAt: '2024-06-02' });
    const img2 = makeImage({ id: 3, captureDate: '2024-01-05', createdAt: '2024-06-03' });
    const gifUndated = makeGif({ id: 4, createdAt: '2024-06-04' });
    const processed: AnyContentModel[] = [img1, gifDated, img2, gifUndated];

    expect(toChronologicalOrder(processed).map(c => c.id)).toEqual([2, 1, 3, 4]);
  });

  it('returns content unchanged when nothing is dateable', () => {
    const gif1 = makeGif({ id: 1 });
    const gif2 = makeGif({ id: 2 });
    const processed: AnyContentModel[] = [gif1, gif2];
    expect(toChronologicalOrder(processed).map(c => c.id)).toEqual([1, 2]);
  });
});

describe('toChronologicalOrder — collection cards (R9)', () => {
  /** A child-collection card as produced by convertCollectionContentToParallax. */
  function makeCollectionCard(id: number, slug: string): ContentImageModel {
    return {
      id,
      contentType: 'IMAGE',
      orderIndex: 0,
      imageUrl: `https://example.com/cover-${id}.jpg`,
      locations: [],
      slug,
    } as ContentImageModel & { slug: string };
  }

  it('leaves a trailing collection card in its slot instead of hoisting it to epoch 0', () => {
    // NB the card must NOT sit first in the input: an undated card sorts to position 0 anyway,
    // so a leading card cannot distinguish fixed from broken. It sits last here.
    const img1 = makeImage({ id: 1, captureDate: '2024-01-05', createdAt: '2024-06-01' });
    const img2 = makeImage({ id: 3, captureDate: '2024-01-01', createdAt: '2024-06-02' });
    const card = makeCollectionCard(900, 'child-gallery');
    const processed: AnyContentModel[] = [img1, img2, card];

    // The card holds the last slot; only the two images swap between the two dateable slots.
    expect(toChronologicalOrder(processed).map(c => c.id)).toEqual([3, 1, 900]);
  });

  it('does not let a card displace an image when the card sits mid-list', () => {
    const img1 = makeImage({ id: 1, captureDate: '2024-01-05', createdAt: '2024-06-01' });
    const card = makeCollectionCard(900, 'child-gallery');
    const img2 = makeImage({ id: 3, captureDate: '2024-01-01', createdAt: '2024-06-02' });
    const processed: AnyContentModel[] = [img1, card, img2];

    expect(toChronologicalOrder(processed).map(c => c.id)).toEqual([3, 900, 1]);
  });
});
