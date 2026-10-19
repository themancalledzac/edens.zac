import { type CollectionModel } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import { type ContentCollectionModel, type ContentImageModel } from '@/app/types/Content';

/**
 * Offset for the negative content ids given to a location page's collection cards. The layout keys
 * block sizes by content id, so a card must never share an id with one of the page's images; the
 * offset also keeps clear of the -1/-2 header blocks and the -1000/-1001 home tiles.
 */
export const LOCATION_REF_ID_OFFSET = 100_000;

/**
 * Slug of the synthetic location collection. `location` is a shadowed route slug, so the
 * renderer withholds the admin cover-update shortcut, which has no manage page to open here.
 */
export const LOCATION_COLLECTION_SLUG = 'location';

/** Cover for a location page: the first image rated 4 or higher, else the first image. */
export function pickLocationCover(images: ContentImageModel[]): ContentImageModel | null {
  return images.find(img => (img.rating ?? 0) >= 4) ?? images[0] ?? null;
}

/**
 * Maps collections to collection-ref content blocks with `orderIndex` 0..n-1, in the order given.
 * Tags are left off: a collection carries tag names only, and a ref needs full tag models.
 */
export function toCollectionRefs(collections: CollectionModel[]): ContentCollectionModel[] {
  return collections.map((collection, index) => ({
    id: -(LOCATION_REF_ID_OFFSET + collection.id),
    contentType: 'COLLECTION',
    referencedCollectionId: collection.id,
    orderIndex: index,
    slug: collection.slug,
    title: collection.title,
    description: collection.description ?? null,
    coverImage: collection.coverImage ?? null,
    isClient: collection.isClient,
    isBlog: collection.isBlog,
    isPasswordProtected: collection.isPasswordProtected,
    rating: collection.rating ?? null,
    collectionDate: collection.collectionDate,
    collectionEndDate: collection.collectionEndDate,
    people: collection.people,
    locations: collection.locations,
    visibility: collection.visibility,
    visible: true,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
  }));
}

interface LocationCollectionInput {
  name: string;
  collections: CollectionModel[];
  images: ContentImageModel[];
}

/**
 * Builds the synthetic collection a location page renders through `CollectionPage`. Collection
 * cards take `orderIndex` 0..n-1 and images n.., under `ORDERED` display, so cards lead the grid.
 * The header is the standard cover row: no date, location or related row, and the photo count as
 * its description line.
 */
export function buildLocationCollection({
  name,
  collections,
  images,
}: LocationCollectionInput): CollectionModel {
  const refs = toCollectionRefs(collections);
  const orderedImages = images.map((image, index) => ({
    ...image,
    orderIndex: refs.length + index,
  }));
  const timestamp = new Date().toISOString();

  return {
    id: 0,
    isClient: false,
    isBlog: false,
    title: name,
    slug: LOCATION_COLLECTION_SLUG,
    description: `${images.length} ${images.length === 1 ? 'photo' : 'photos'}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    visibility: CollectionVisibility.LISTED,
    displayMode: 'ORDERED',
    coverImage: pickLocationCover(images),
    content: [...refs, ...orderedImages],
    contentCount: refs.length + orderedImages.length,
    locations: [],
  };
}
