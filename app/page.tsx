import { fetchCollectionBySlug } from '@/app/lib/api/home';
import { type CollectionType } from '@/app/types/Collection';
import { type HomeCardModel } from '@/app/types/HomeCardModel';

import ContentCollectionPage from './components/ContentCollection/ContentCollectionPage';

/**
 * Home Page
 *
 * Main landing page component that displays the 'home' collection.
 * The home collection contains nested COLLECTION content types that are
 * transformed into HomeCardModel[] for display.
 *
 * @dependencies
 * - fetchCollectionBySlug - API function for retrieving collection data
 * - ContentCollectionPage - Shared component for displaying content collections
 *
 * @returns React Server Component displaying home page content
 */
/**
 * TODO: Move this to the correct Location
 * Nested collection content type from backend
 * Used only in home collection where content contains other collections
 */
interface NestedCollectionContent {
  contentType: 'COLLECTION';
  id: number;
  title: string;
  description: string | null;
  imageUrl: string;
  orderIndex: number;
  visible: boolean;
  slug: string;
  collectionType: string;
  location?: string | null;
  collectionDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default async function HomePage() {
  const homeCollection = await fetchCollectionBySlug('home', 0, 50);

  // 1	2025-09-20	30	10	2025-09-20 17:57:17.866849	Backpacking trip to a hidden gem of the cascades, Oval Lakes. Just outside of Winthrop in north central Washington State,, an initial hike through a recent burn brought us through the Oval Lakes region, summiting Gray Peak, and an eventual campsite at Tuckaway Lake. Highly recommend.	Oval Lakes, Washington State	oval-lakes	Oval Lakes	15	BLOG	2025-09-21 21:00:07.325471	1

  // Example of what the current 'home' endpoint returns:
  // {
  //   "id": 17,
  //   "type": "HOME",
  //   "title": "Home",
  //   "slug": "home",
  //   "description": "Home page - main collection parent",
  //   "location": null,
  //   "collectionDate": null,
  //   "visible": true,
  //   "isPasswordProtected": null,
  //   "hasAccess": null,
  //   "displayMode": "ORDERED",
  //   "tags": null,
  //   "createdAt": "2025-10-28T04:25:20",
  //   "updatedAt": "2025-10-28T04:25:20",
  //   "contentPerPage": 50,
  //   "contentCount": 0,
  //   "currentPage": 0,
  //   "totalPages": 0,
  //   "coverImage": null,
  //   "content": []
  // }

  // Transform nested collection content into HomeCardModel[]
  // Note: Home collection contains COLLECTION content types (not standard IMAGE/TEXT blocks)
  const nestedCollections = homeCollection.content as unknown as NestedCollectionContent[];

  const homeCards: HomeCardModel[] = nestedCollections
    .filter((block) => block.contentType === 'COLLECTION')
    .map((block) => ({
      id: block.id,
      title: block.title,
      cardType: block.collectionType as CollectionType,
      location: block.location || undefined,
      date: block.collectionDate || undefined,
      priority: block.orderIndex,
      coverImageUrl: block.imageUrl || '',
      slug: block.slug,
      text: block.description || undefined,
    }));

  return <ContentCollectionPage cardsPromise={Promise.resolve(homeCards)} />;
}
