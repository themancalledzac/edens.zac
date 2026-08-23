/**
 * Characterization tests for the four hand-rolled parallax-card builders (E1).
 *
 * These pin TODAY's output byte-for-byte before the builders are collapsed into one shared
 * `buildParallaxCard`. They are the safety net for that refactor: every one of them must keep
 * passing UNMODIFIED through the migration. A failure means the refactor changed behavior, and
 * the fix belongs in the builder, never in this file.
 *
 * Equality is `toEqual`, not `toStrictEqual`, deliberately. The shared builder sets the full
 * union of card keys and leaves the unused ones `undefined`, where today's hand-rolled objects
 * simply omit them. `toEqual` ignores undefined-valued keys, which is the right notion of
 * sameness here: nothing downstream reads these objects with `Object.keys` or `in`, JSON drops
 * undefined, and the follow toggle checks `collectionId === undefined` either way.
 *
 * Two invariants the whole card system rests on, asserted at the bottom:
 *   1. Sentinel tiles never set `collectionId`, so the follow toggle cannot attach to them.
 *   2. `isCollectionCard` keys on slug presence, so all four must keep emitting a `slug`.
 */

import { collectionToContentModel } from '@/app/components/ContentCollection/CollectionPage';
import { type CollectionModel } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import {
  type ContentCollectionModel,
  type ContentImageModel,
  type ContentParallaxImageModel,
} from '@/app/types/Content';
import {
  ALL_COLLECTIONS_TILE_ID,
  buildAllCollectionsContentBlock,
} from '@/app/utils/allCollectionsContentBlock';
import { convertCollectionContentToParallax } from '@/app/utils/contentLayout';
import { isCollectionCard } from '@/app/utils/contentRatingUtils';
import { buildMeContentBlock, ME_TILE_ID } from '@/app/utils/meContentBlock';

// CollectionPage transitively pulls next/cache (SiteHeader -> MenuDropdown -> clearCacheAction),
// which needs a request runtime this suite does not have.
jest.mock('@/app/lib/actions/clearCache', () => ({ clearCacheAction: jest.fn() }));

function cover(overrides: Partial<ContentImageModel> = {}): ContentImageModel {
  return {
    id: 900,
    contentType: 'IMAGE',
    orderIndex: 0,
    imageUrl: 'https://example.com/cover.jpg',
    imageWidth: 1200,
    imageHeight: 1000,
    locations: [],
    ...overrides,
  };
}

function contentCollection(
  overrides: Partial<ContentCollectionModel> = {}
): ContentCollectionModel {
  return {
    id: 10,
    contentType: 'COLLECTION',
    orderIndex: 3,
    slug: 'smith-wedding',
    title: 'Smith Wedding',
    referencedCollectionId: 42,
    coverImage: cover(),
    ...overrides,
  } as ContentCollectionModel;
}

function collection(overrides: Partial<CollectionModel> = {}): CollectionModel {
  return {
    id: 42,
    slug: 'smith-wedding',
    title: 'Smith Wedding',
    description: 'A description',
    visibility: CollectionVisibility.LISTED,
    coverImage: cover(),
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    collectionDate: '2026-01-01',
    ...overrides,
  } as CollectionModel;
}

describe('parallax-card builders - characterization', () => {
  describe('convertCollectionContentToParallax (contentLayout.ts)', () => {
    it('builds the full card for a collection with a cover', () => {
      const result = convertCollectionContentToParallax(
        contentCollection({
          collectionDate: '2026-01-01',
          isClient: true,
          isBlog: false,
          rating: 4,
          description: 'A description',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-02T00:00:00Z',
        } as Partial<ContentCollectionModel>)
      );

      expect(result).toEqual({
        contentType: 'IMAGE',
        enableParallax: true,
        id: 10,
        collectionId: 42,
        title: 'Smith Wedding',
        slug: 'smith-wedding',
        collectionDate: '2026-01-01',
        rating: 4,
        isClient: true,
        isBlog: false,
        tags: undefined,
        description: 'A description',
        imageUrl: 'https://example.com/cover.jpg',
        overlayText: 'Smith Wedding',
        imageWidth: 1200,
        imageHeight: 1000,
        width: 1200,
        height: 1000,
        orderIndex: 3,
        visible: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
        locations: [],
      });
    });

    it('falls back to a 1000x1000 square when the cover has no dimensions', () => {
      const result = convertCollectionContentToParallax(
        contentCollection({ coverImage: cover({ imageWidth: undefined, imageHeight: undefined }) })
      );

      expect(result.imageWidth).toBe(1000);
      expect(result.imageHeight).toBe(1000);
      expect(result.width).toBe(1000);
      expect(result.height).toBe(1000);
    });

    it('falls back to the id of the referenced collection when the content id is null', () => {
      const result = convertCollectionContentToParallax(
        contentCollection({ id: null as unknown as number })
      );

      expect(result.id).toBe(42);
      expect(result.collectionId).toBe(42);
    });

    it('reads the layout width/height fields when imageWidth/imageHeight are absent', () => {
      const result = convertCollectionContentToParallax(
        contentCollection({
          coverImage: cover({
            imageWidth: undefined,
            imageHeight: undefined,
            width: 1200,
            height: 1000,
          }),
        })
      );

      expect(result.imageWidth).toBe(1200);
      expect(result.imageHeight).toBe(1000);
    });

    it('clamps a cover wider than the 5:4 parallax band', () => {
      const result = convertCollectionContentToParallax(
        contentCollection({ coverImage: cover({ imageWidth: 1600, imageHeight: 1000 }) })
      );

      expect(result.imageWidth).toBe(1600);
      expect(result.imageHeight).toBe(1280);
    });

    it('carries tags', () => {
      const tags = [{ id: 1, name: 'art-gallery', slug: 'art-gallery' }];
      const result = convertCollectionContentToParallax(
        contentCollection({ tags } as Partial<ContentCollectionModel>)
      );

      expect(result.tags).toEqual(tags);
    });

    it('honours an explicit visible=false', () => {
      const result = convertCollectionContentToParallax(contentCollection({ visible: false }));

      expect(result.visible).toBe(false);
    });
  });

  describe('collectionToContentModel (CollectionPage.tsx)', () => {
    it('builds the full card for a LISTED collection with a cover', () => {
      const result = collectionToContentModel(
        collection({ isClient: true, isBlog: false } as Partial<CollectionModel>),
        false
      );

      expect(result).toEqual({
        contentType: 'IMAGE',
        enableParallax: true,
        id: 42,
        collectionId: 42,
        title: 'Smith Wedding',
        slug: 'smith-wedding',
        isClient: true,
        isBlog: false,
        description: 'A description',
        imageUrl: 'https://example.com/cover.jpg',
        overlayText: 'Smith Wedding',
        imageWidth: 1200,
        imageHeight: 1000,
        width: 1200,
        height: 1000,
        orderIndex: 0,
        visible: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
        collectionDate: '2026-01-01',
        locations: [],
      });
    });

    it('does NOT carry tags even when the model has them', () => {
      const result = collectionToContentModel(
        collection({ tags: ['art-gallery'] } as unknown as Partial<CollectionModel>),
        false
      );

      expect(result.tags).toBeUndefined();
    });

    it('strips the cover of a password-protected collection when covers are not opted in', () => {
      const result = collectionToContentModel(
        collection({ isPasswordProtected: true, isClient: true } as Partial<CollectionModel>),
        false
      );

      expect(result.imageUrl).toBe('');
      expect(result.imageWidth).toBeUndefined();
      expect(result.imageHeight).toBeUndefined();
    });

    it('keeps the cover of a password-protected collection when showProtectedCovers is true', () => {
      const result = collectionToContentModel(
        collection({ isPasswordProtected: true, isClient: true } as Partial<CollectionModel>),
        true
      );

      expect(result.imageUrl).toBe('https://example.com/cover.jpg');
      expect(result.imageWidth).toBe(1200);
    });

    it('clamps a cover wider than the 5:4 parallax band', () => {
      const result = collectionToContentModel(
        collection({ coverImage: cover({ imageWidth: 1600, imageHeight: 1000 }) }),
        false
      );

      expect(result.imageWidth).toBe(1600);
      expect(result.imageHeight).toBe(1280);
    });

    it('maps UNLISTED visibility to visible=false', () => {
      const result = collectionToContentModel(
        collection({ visibility: CollectionVisibility.UNLISTED }),
        false
      );

      expect(result.visible).toBe(false);
    });

    it('treats undefined visibility as visible', () => {
      const result = collectionToContentModel(collection({ visibility: undefined }), false);

      expect(result.visible).toBe(true);
    });

    it('ignores the layout width/height fields when imageWidth/imageHeight are absent', () => {
      const result = collectionToContentModel(
        collection({
          coverImage: cover({
            imageWidth: undefined,
            imageHeight: undefined,
            width: 1200,
            height: 1000,
          }),
        }),
        false
      );

      expect(result.imageWidth).toBeUndefined();
      expect(result.imageHeight).toBeUndefined();
    });

    it('applies no square fallback when the cover has no dimensions', () => {
      const result = collectionToContentModel(
        collection({ coverImage: cover({ imageWidth: undefined, imageHeight: undefined }) }),
        false
      );

      expect(result.imageWidth).toBeUndefined();
      expect(result.imageHeight).toBeUndefined();
    });
  });

  describe('buildMeContentBlock (meContentBlock.ts)', () => {
    it('builds the tile from a user page with a cover', () => {
      const result = buildMeContentBlock(collection({ title: 'Zac' }));

      expect(result).toEqual({
        contentType: 'IMAGE',
        enableParallax: true,
        id: ME_TILE_ID,
        title: 'Zac',
        slug: 'user',
        description: null,
        imageUrl: 'https://example.com/cover.jpg',
        overlayText: 'Zac',
        alt: 'Your page',
        imageWidth: 1200,
        imageHeight: 1000,
        width: 1200,
        height: 1000,
        orderIndex: 1,
        visible: true,
        locations: [],
      });
    });

    it('falls back to the "You" label and an empty imageUrl for a null user page', () => {
      const result = buildMeContentBlock(null);

      expect(result.title).toBe('You');
      expect(result.overlayText).toBe('You');
      expect(result.imageUrl).toBe('');
      expect(result.imageWidth).toBeUndefined();
    });

    it('ignores the layout width/height fields when imageWidth/imageHeight are absent', () => {
      const result = buildMeContentBlock(
        collection({
          coverImage: cover({
            imageWidth: undefined,
            imageHeight: undefined,
            width: 1200,
            height: 1000,
          }),
        })
      );

      expect(result.imageWidth).toBeUndefined();
      expect(result.imageHeight).toBeUndefined();
    });
  });

  describe('buildAllCollectionsContentBlock (allCollectionsContentBlock.ts)', () => {
    it('builds the tile', () => {
      expect(buildAllCollectionsContentBlock()).toEqual({
        contentType: 'IMAGE',
        enableParallax: true,
        id: ALL_COLLECTIONS_TILE_ID,
        title: 'All Collections',
        slug: 'collections',
        description: null,
        imageUrl: '',
        overlayText: 'All Collections',
        alt: 'Browse all collections',
        imageWidth: undefined,
        imageHeight: undefined,
        width: undefined,
        height: undefined,
        orderIndex: 1,
        visible: true,
        locations: [],
      });
    });
  });

  describe('cross-builder invariants', () => {
    const all: Array<[string, ContentParallaxImageModel]> = [
      [
        'convertCollectionContentToParallax',
        convertCollectionContentToParallax(contentCollection()),
      ],
      ['collectionToContentModel', collectionToContentModel(collection(), false)],
      ['buildMeContentBlock', buildMeContentBlock(collection())],
      ['buildAllCollectionsContentBlock', buildAllCollectionsContentBlock()],
    ];

    it.each(all)('%s emits a slug so isCollectionCard recognises it', (_name, card) => {
      expect(card.slug).toBeTruthy();
      expect(isCollectionCard(card)).toBe(true);
    });

    it('sentinel tiles never set collectionId, so the follow toggle cannot attach', () => {
      expect(buildMeContentBlock(collection()).collectionId).toBeUndefined();
      expect(buildAllCollectionsContentBlock().collectionId).toBeUndefined();
    });

    it('real collection cards DO set collectionId', () => {
      expect(convertCollectionContentToParallax(contentCollection()).collectionId).toBe(42);
      expect(collectionToContentModel(collection(), false).collectionId).toBe(42);
    });
  });
});
