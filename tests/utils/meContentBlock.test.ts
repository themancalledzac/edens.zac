import { type CollectionModel, CollectionType } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import { buildMeContentBlock,ME_TILE_ID } from '@/app/utils/meContentBlock';

function makeUserPage(overrides: Partial<CollectionModel> = {}): CollectionModel {
  return {
    id: 99,
    slug: 'user',
    title: 'Jane Eden',
    type: CollectionType.PORTFOLIO,
    locations: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    visibility: CollectionVisibility.LISTED,
    coverImage: {
      id: 5,
      contentType: 'IMAGE',
      orderIndex: 0,
      imageUrl: 'https://cdn.example.com/cover.jpg',
      imageWidth: 1600,
      imageHeight: 1000,
      locations: [],
    },
    ...overrides,
  };
}

describe('buildMeContentBlock', () => {
  it('builds an IMAGE parallax block that links to /user via slug', () => {
    const block = buildMeContentBlock(makeUserPage());
    expect(block.contentType).toBe('IMAGE');
    expect(block.enableParallax).toBe(true);
    expect(block.slug).toBe('user');
    expect(block.id).toBe(ME_TILE_ID);
    expect(block.imageUrl).toBe('https://cdn.example.com/cover.jpg');
    expect(block.overlayText).toBe('Jane Eden');
  });

  it('falls back to an empty imageUrl (placeholder) when there is no cover', () => {
    const block = buildMeContentBlock(makeUserPage({ coverImage: null }));
    expect(block.imageUrl).toBe('');
    expect(block.overlayText).toBe('Jane Eden');
  });

  it('uses the "You" label and empty image when userPage is null', () => {
    const block = buildMeContentBlock(null);
    expect(block.slug).toBe('user');
    expect(block.imageUrl).toBe('');
    expect(block.overlayText).toBe('You');
    expect(block.id).toBe(ME_TILE_ID);
  });
});
