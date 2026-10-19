import { type ContentTextModel } from '@/app/types/Content';
import { createHeaderRow, processContentBlocks } from '@/app/utils/contentLayout';
import {
  buildLocationCollection,
  LOCATION_COLLECTION_SLUG,
  LOCATION_REF_ID_OFFSET,
  pickLocationCover,
  toCollectionRefs,
} from '@/app/utils/locationCollection';
import { createCollectionModel, createImageContent } from '@/tests/fixtures/contentFixtures';

const ferry = createCollectionModel(7, { title: 'Ferry Days', slug: 'ferry-days', rating: 4 });
const rain = createCollectionModel(8, { title: 'Rain', slug: 'rain', isPasswordProtected: true });
const collections = [ferry, rain];
const lowRated = createImageContent(7, { orderIndex: 99, rating: 2 });
const topRated = createImageContent(11, { orderIndex: 0, rating: 5 });
const lowest = createImageContent(12, { orderIndex: 50, rating: 1 });
const images = [lowRated, topRated, lowest];

describe('pickLocationCover', () => {
  it('picks the first image rated 4 or higher', () => {
    expect(pickLocationCover(images)?.id).toBe(11);
  });

  it('falls back to the first image when none is rated 4 or higher', () => {
    expect(pickLocationCover([lowRated, lowest])?.id).toBe(7);
  });

  it('returns null with no images', () => {
    expect(pickLocationCover([])).toBeNull();
  });
});

describe('toCollectionRefs', () => {
  it('maps each collection to a collection ref in the order given', () => {
    const [first, second] = toCollectionRefs(collections);

    expect(first).toMatchObject({
      contentType: 'COLLECTION',
      referencedCollectionId: 7,
      slug: 'ferry-days',
      title: 'Ferry Days',
      rating: 4,
      orderIndex: 0,
      visible: true,
      coverImage: ferry.coverImage,
      locations: ferry.locations,
    });
    expect(second).toMatchObject({
      referencedCollectionId: 8,
      orderIndex: 1,
      isPasswordProtected: true,
    });
  });

  it('gives each ref a negative id that cannot collide with an image id', () => {
    const refs = toCollectionRefs(collections);
    expect(refs.map(ref => ref.id)).toEqual([
      -(LOCATION_REF_ID_OFFSET + 7),
      -(LOCATION_REF_ID_OFFSET + 8),
    ]);
  });
});

describe('buildLocationCollection', () => {
  const collection = buildLocationCollection({ name: 'Seattle, Washington', collections, images });

  it('orders collection refs before images', () => {
    expect(collection.displayMode).toBe('ORDERED');
    expect(collection.content?.map(item => [item.contentType, item.orderIndex])).toEqual([
      ['COLLECTION', 0],
      ['COLLECTION', 1],
      ['IMAGE', 2],
      ['IMAGE', 3],
      ['IMAGE', 4],
    ]);
  });

  it('keeps collection cards ahead of images through the standard block pipeline', () => {
    const blocks = processContentBlocks(
      collection.content ?? [],
      true,
      collection.id,
      collection.displayMode
    );

    expect(blocks.map(block => block.id)).toEqual([
      -(LOCATION_REF_ID_OFFSET + 7),
      -(LOCATION_REF_ID_OFFSET + 8),
      7,
      11,
      12,
    ]);
  });

  it('carries the location name, chosen cover and a photo count', () => {
    expect(collection.title).toBe('Seattle, Washington');
    expect(collection.slug).toBe(LOCATION_COLLECTION_SLUG);
    expect(collection.coverImage?.id).toBe(11);
    expect(collection.description).toBe('3 photos');
    expect(collection.contentCount).toBe(5);
  });

  it('uses the singular for one photo', () => {
    const single = buildLocationCollection({ name: 'X', collections: [], images: [lowRated] });
    expect(single.description).toBe('1 photo');
  });

  it('builds a standard cover header with only the count line: no date, location or related row', () => {
    const row = createHeaderRow(collection, 1200, { forceRail: true });
    if (row === null || Array.isArray(row)) throw new Error('expected a single desktop header row');

    const [cover, metadata] = row.items;
    expect(cover?.content).toMatchObject({
      overlayText: 'Seattle, Washington',
      imageUrl: topRated.imageUrl,
    });
    expect((metadata?.content as ContentTextModel | undefined)?.items).toEqual([
      { type: 'description', value: '3 photos' },
    ]);
  });
});
