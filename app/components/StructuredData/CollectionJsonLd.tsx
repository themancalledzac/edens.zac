import { getCollectionBySlug } from '@/app/lib/api/collections';
import { logger } from '@/app/utils/logger';
import { configuredAppOrigin } from '@/app/utils/originAllowlist';
import { buildCollectionJsonLd, serializeJsonLd } from '@/app/utils/structuredData';

interface CollectionJsonLdProps {
  slug: string;
}

/**
 * Emits the `ImageGallery` JSON-LD for a collection page, or nothing at all.
 *
 * The collection is refetched rather than threaded down because `getCollectionBySlug` carries
 * its own `next: { revalidate, tags }`, so this shares the single fetch the route's
 * `generateMetadata` and `CollectionPageWrapper` already make.
 *
 * A read failure renders nothing: structured data is an enhancement, and failing the page over
 * it would trade a working gallery for a search-engine hint.
 */
export async function CollectionJsonLd({ slug }: CollectionJsonLdProps) {
  let node: ReturnType<typeof buildCollectionJsonLd> = null;

  try {
    const collection = await getCollectionBySlug(slug, 0, 500);
    node = buildCollectionJsonLd(collection, configuredAppOrigin());
  } catch (error) {
    logger.warn('CollectionJsonLd', 'Skipping structured data; collection read failed', {
      slug,
      error,
    });
    return null;
  }

  if (!node) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(node) }}
    />
  );
}

export default CollectionJsonLd;
