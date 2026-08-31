/**
 * schema.org JSON-LD builders.
 *
 * One type on one route today: `ImageGallery` for a collection page. Adding a second type means
 * deciding how the nodes relate (a `@graph`, or independent scripts), which is a larger question
 * than this file answers — see PF8 in docs/spikes/2026-features/pf-performance-platform.md.
 */

import { type CollectionModel } from '@/app/types/Collection';

/** The byline used across route metadata; kept here so the JSON-LD author cannot drift from it. */
const AUTHOR_NAME = 'Zac Edens';

export interface ImageGalleryNode {
  '@context': 'https://schema.org';
  '@type': 'ImageGallery';
  name: string;
  author: { '@type': 'Person'; name: string };
  description?: string;
  url?: string;
  datePublished?: string;
  image?: string;
}

/**
 * Builds the `ImageGallery` node for a collection page, or `null` when the collection must not
 * be described publicly.
 *
 * Returns `null` for a password-protected collection for the same reason `generateMetadata`
 * suppresses its OG image: structured data is crawlable without the password, and the backend
 * still returns `title`/`coverImage` on a locked response. A collection with no title gets no
 * node either, because `name` is the one property the type cannot omit.
 *
 * `origin` is the normalized site origin (see `configuredAppOrigin`). When it is `null` the
 * `url` property is dropped rather than guessed — a wrong canonical URL is worse than none.
 */
export function buildCollectionJsonLd(
  collection: CollectionModel,
  origin: string | null
): ImageGalleryNode | null {
  if (collection.isPasswordProtected === true) return null;

  const name = collection.title?.trim();
  if (!name) return null;

  const node: ImageGalleryNode = {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name,
    author: { '@type': 'Person', name: AUTHOR_NAME },
  };

  const description = collection.description?.trim();
  if (description) node.description = description;

  if (origin && collection.slug) node.url = `${origin}/${collection.slug}`;
  if (collection.collectionDate) node.datePublished = collection.collectionDate;

  const image = collection.coverImage?.imageUrl;
  if (image) node.image = image;

  return node;
}

/**
 * Serializes a node for a `<script type="application/ld+json">` body.
 *
 * `<` is escaped because a `</script>` sequence inside any string property would close the tag
 * early and turn the rest of the payload into markup. `<` is valid JSON and parsers read it
 * back as `<`, so the escape costs nothing downstream.
 */
export function serializeJsonLd(node: object): string {
  return JSON.stringify(node).replace(/</g, '\\u003c');
}
