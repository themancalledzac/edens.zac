import { type CollectionModel } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import { type ContentImageModel } from '@/app/types/Content';
import { processContentBlocks } from '@/app/utils/contentLayout';
import { buildMeContentBlock, ME_TILE_ID } from '@/app/utils/meContentBlock';

function makeUserPage(overrides: Partial<CollectionModel> = {}): CollectionModel {
  return {
    id: 99,
    slug: 'user',
    title: 'Jane Eden',
    isClient: false,
    isBlog: false,
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

  /**
   * The public path sorts by `orderIndex` after filtering, so the tile leads the home page only
   * because its index is below every backend child's, not because the wrapper listed it first.
   */
  it('sorts ahead of a backend child at orderIndex 0 on the public path', () => {
    const child: ContentImageModel = {
      id: 10,
      contentType: 'IMAGE',
      orderIndex: 0,
      imageUrl: 'https://cdn.example.com/child.jpg',
      imageWidth: 1600,
      imageHeight: 1000,
      visible: true,
      locations: [],
    };

    const processed = processContentBlocks(
      [child, buildMeContentBlock(makeUserPage())],
      true,
      34,
      'ORDERED'
    );

    expect(processed.map(item => item.id)).toEqual([ME_TILE_ID, 10]);
  });
});
