/**
 * @jest-environment node
 *
 * Tests for the JSON-LD builders.
 *
 * Two things here are load-bearing rather than cosmetic: a password-protected collection must
 * produce no node at all (structured data is crawlable without the password, exactly like the OG
 * tags `generateMetadata` already suppresses), and the serializer must escape `<` so a title
 * containing `</script>` cannot close the tag it is embedded in.
 */

import { type CollectionModel } from '@/app/types/Collection';
import { buildCollectionJsonLd, serializeJsonLd } from '@/app/utils/structuredData';

const ORIGIN = 'https://zacedens.com';

function makeCollection(overrides: Partial<CollectionModel> = {}): CollectionModel {
  return {
    id: 1,
    title: 'Dolomites',
    slug: 'dolomites',
    description: 'Five days above the treeline.',
    locations: [],
    content: [],
    ...overrides,
  } as CollectionModel;
}

describe('buildCollectionJsonLd', () => {
  it('builds an ImageGallery node from a public collection', () => {
    const node = buildCollectionJsonLd(makeCollection(), ORIGIN);

    expect(node).toEqual({
      '@context': 'https://schema.org',
      '@type': 'ImageGallery',
      name: 'Dolomites',
      author: { '@type': 'Person', name: 'Zac Edens' },
      description: 'Five days above the treeline.',
      url: 'https://zacedens.com/dolomites',
    });
  });

  it('carries the collection date and cover image when present', () => {
    const node = buildCollectionJsonLd(
      makeCollection({
        collectionDate: '2026-06-14',
        coverImage: { imageUrl: 'https://cdn.example.com/cover.jpg' } as never,
      }),
      ORIGIN
    );

    expect(node?.datePublished).toBe('2026-06-14');
    expect(node?.image).toBe('https://cdn.example.com/cover.jpg');
  });

  it('emits nothing for a password-protected collection', () => {
    const node = buildCollectionJsonLd(
      makeCollection({ isPasswordProtected: true } as Partial<CollectionModel>),
      ORIGIN
    );

    expect(node).toBeNull();
  });

  it('emits nothing when the collection has no usable title', () => {
    expect(buildCollectionJsonLd(makeCollection({ title: undefined }), ORIGIN)).toBeNull();
    expect(buildCollectionJsonLd(makeCollection({ title: '   ' }), ORIGIN)).toBeNull();
  });

  it('drops url rather than guessing one when the origin is unconfigured', () => {
    const node = buildCollectionJsonLd(makeCollection(), null);

    expect(node).not.toBeNull();
    expect(node).not.toHaveProperty('url');
  });

  it('drops url when the collection has no slug', () => {
    const node = buildCollectionJsonLd(makeCollection({ slug: undefined }), ORIGIN);

    expect(node).not.toHaveProperty('url');
  });

  it('omits an empty description rather than emitting a blank one', () => {
    const node = buildCollectionJsonLd(makeCollection({ description: '  ' }), ORIGIN);

    expect(node).not.toHaveProperty('description');
  });
});

describe('serializeJsonLd', () => {
  it('escapes < so a title cannot close the script tag', () => {
    const serialized = serializeJsonLd({ name: 'Ski </script><img onerror=alert(1)>' });

    expect(serialized).not.toContain('</script>');
    expect(serialized).toContain('\\u003c');
  });

  it('round-trips back to the original value', () => {
    const node = buildCollectionJsonLd(makeCollection({ title: 'A < B' }), ORIGIN);

    expect(JSON.parse(serializeJsonLd(node as object))).toEqual(node);
  });
});

describe('buildCollectionJsonLd — home collection url', () => {
  it('F1: the home collection url is the origin with a trailing slash', () => {
    const node = buildCollectionJsonLd(makeCollection({ slug: 'home', title: 'Home' }), ORIGIN);

    expect(node?.url).toBe('https://zacedens.com/');
    expect(node?.url).not.toBe('https://zacedens.com/home');
  });

  it('F1: other collections keep origin/slug', () => {
    const node = buildCollectionJsonLd(makeCollection({ slug: 'homestead' }), ORIGIN);

    expect(node?.url).toBe('https://zacedens.com/homestead');
  });

  it('F1 twin: the home collection url is origin/home when the home check is off', async () => {
    jest.resetModules();
    jest.doMock('@/app/utils/collectionSlugs', () => ({
      ...jest.requireActual('@/app/utils/collectionSlugs'),
      HOME_SLUG: '__no-home__',
    }));
    const mod = await import('@/app/utils/structuredData');
    const node = mod.buildCollectionJsonLd(makeCollection({ slug: 'home', title: 'Home' }), ORIGIN);
    jest.dontMock('@/app/utils/collectionSlugs');
    jest.resetModules();

    expect(node?.url).toBe('https://zacedens.com/home');
  });
});
