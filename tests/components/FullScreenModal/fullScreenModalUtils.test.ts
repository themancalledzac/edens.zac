/**
 * Unit tests for the pure helpers extracted from FullScreenModal.
 */

import {
  isGifBlock,
  resolveDisplayDate,
  resolveDisplayFilmStock,
  resolveDisplayLocations,
} from '@/app/components/FullScreenModal/fullScreenModalUtils';
import type { CollectionModel, LocationModel } from '@/app/types/Collection';
import type { ContentGifModel, ContentImageModel } from '@/app/types/Content';

const img = (overrides: Partial<ContentImageModel> = {}): ContentImageModel =>
  ({
    id: 1,
    contentType: 'IMAGE',
    imageUrl: 'https://cdn.example/1.jpg',
    imageWidth: 1000,
    imageHeight: 800,
    orderIndex: 1,
    visible: true,
    locations: [],
    ...overrides,
  }) as ContentImageModel;

const gif = (overrides: Partial<ContentGifModel> = {}): ContentGifModel =>
  ({
    id: 2,
    contentType: 'GIF',
    gifUrl: 'https://cdn.example/2.mp4',
    width: 800,
    height: 600,
    orderIndex: 2,
    visible: true,
    ...overrides,
  }) as ContentGifModel;

const collection = (overrides: Partial<CollectionModel> = {}): CollectionModel =>
  ({
    id: 9,
    title: 'Trip',
    slug: 'trip',
    locations: [],
    ...overrides,
  }) as CollectionModel;

const loc = (id: number, name: string): LocationModel => ({ id, name, slug: name.toLowerCase() });

describe('isGifBlock', () => {
  it('returns true for GIF blocks', () => {
    expect(isGifBlock(gif())).toBe(true);
  });

  it('returns false for image blocks', () => {
    expect(isGifBlock(img())).toBe(false);
  });
});

describe('resolveDisplayLocations', () => {
  it('uses the image locations when present', () => {
    const image = img({ locations: [loc(1, 'Banff')] });
    const result = resolveDisplayLocations(
      image,
      collection({ locations: [loc(2, 'Elsewhere')] }),
      false
    );
    expect(result).toEqual([loc(1, 'Banff')]);
  });

  it('falls back to collection locations when the image has an empty array', () => {
    const result = resolveDisplayLocations(
      img({ locations: [] }),
      collection({ locations: [loc(2, 'Elsewhere')] }),
      false
    );
    expect(result).toEqual([loc(2, 'Elsewhere')]);
  });

  it('returns an empty array when neither the image nor the collection has locations', () => {
    expect(
      resolveDisplayLocations(img({ locations: [] }), collection({ locations: [] }), false)
    ).toEqual([]);
  });

  it('returns an empty array when collectionData is undefined and the image has none', () => {
    expect(resolveDisplayLocations(img({ locations: [] }), undefined, false)).toEqual([]);
  });

  it('GIF blocks ignore image fields and fall back to collection locations', () => {
    const result = resolveDisplayLocations(
      gif(),
      collection({ locations: [loc(2, 'Elsewhere')] }),
      true
    );
    expect(result).toEqual([loc(2, 'Elsewhere')]);
  });
});

describe('resolveDisplayDate', () => {
  it('uses the image captureDate when present', () => {
    const result = resolveDisplayDate(
      img({ captureDate: '2024-03-01' }),
      collection({ collectionDate: '2020-01-01' }),
      false
    );
    expect(result).toBe('2024-03-01');
  });

  it('falls back to the collection collectionDate when captureDate is null', () => {
    const result = resolveDisplayDate(
      img({ captureDate: null }),
      collection({ collectionDate: '2020-01-01' }),
      false
    );
    expect(result).toBe('2020-01-01');
  });

  it('falls back to the collection collectionDate when captureDate is undefined', () => {
    const result = resolveDisplayDate(img(), collection({ collectionDate: '2020-01-01' }), false);
    expect(result).toBe('2020-01-01');
  });

  it('returns null when neither captureDate nor collectionDate is set', () => {
    expect(resolveDisplayDate(img({ captureDate: null }), collection(), false)).toBeNull();
  });

  it('returns null when collectionData is undefined and the image has no captureDate', () => {
    expect(resolveDisplayDate(img({ captureDate: null }), undefined, false)).toBeNull();
  });

  it('GIF blocks ignore image fields and fall back to the collection collectionDate', () => {
    expect(resolveDisplayDate(gif(), collection({ collectionDate: '2019-06-15' }), true)).toBe(
      '2019-06-15'
    );
  });

  it('GIF blocks return null when the collection has no collectionDate', () => {
    expect(resolveDisplayDate(gif(), collection(), true)).toBeNull();
  });
});

describe('resolveDisplayFilmStock', () => {
  it('joins the film stock and the labelled format', () => {
    expect(
      resolveDisplayFilmStock(
        img({ isFilm: true, filmType: 'Kodak Portra 400', filmFormat: 'MM_35' }),
        false
      )
    ).toBe('Kodak Portra 400 · 35mm');
  });

  it('renders whichever half is present on its own', () => {
    expect(resolveDisplayFilmStock(img({ isFilm: true, filmType: 'Ilford HP5' }), false)).toBe(
      'Ilford HP5'
    );
    expect(resolveDisplayFilmStock(img({ isFilm: true, filmFormat: 'MM_120' }), false)).toBe('120');
  });

  it('returns nothing for a digital frame, even one carrying stale film fields', () => {
    expect(resolveDisplayFilmStock(img({ isFilm: false, filmType: 'Kodak Gold 200' }), false)).toBe(
      ''
    );
    expect(resolveDisplayFilmStock(img({ filmFormat: 'MM_35' }), false)).toBe('');
  });

  it('returns nothing for GIF/MP4 blocks, which carry no film metadata', () => {
    expect(resolveDisplayFilmStock(gif(), true)).toBe('');
  });

  it('returns nothing when the image is film but has neither field set', () => {
    expect(resolveDisplayFilmStock(img({ isFilm: true }), false)).toBe('');
  });
});
