import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { type AnyContentModel, type ContentImageModel } from '@/app/types/Content';
import { processContentBlocks } from '@/app/utils/contentLayout';

import styles from './LocationPage.module.scss';

interface LocationPageProps {
  slug: string;
}

/**
 * Generate mock content for a location page placeholder.
 * This will be replaced with actual API data once the backend endpoint exists.
 * See todo/backend-requirements-location.md for the planned API shape.
 */
function getMockLocationData(slug: string): {
  name: string;
  description: string;
  imageCount: number;
  content: AnyContentModel[];
} {
  const locationName = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Create placeholder content to show the page structure
  // In production, this would come from GET /api/read/locations/{slug}
  const mockImages: ContentImageModel[] = Array.from({ length: 6 }, (_, i) => ({
    id: 1000 + i,
    contentType: 'IMAGE' as const,
    orderIndex: i,
    title: `${locationName} Photo ${i + 1}`,
    imageUrl: '', // No real images for placeholder
    imageWidth: 1600,
    imageHeight: i % 3 === 0 ? 2400 : 1067, // Mix of portrait and landscape
    rating: Math.floor(Math.random() * 3) + 3,
    location: { id: 1, name: locationName },
    visible: true,
  }));

  return {
    name: locationName,
    description: `Photography from ${locationName}. This is a placeholder page — the backend location endpoint has not been implemented yet.`,
    imageCount: mockImages.length,
    content: mockImages,
  };
}

/**
 * Location Page Component
 *
 * Displays images from a specific location in a collection-like layout.
 * Currently uses mock data as a POC — the backend getLocation() endpoint
 * does not exist yet.
 *
 * Structure mirrors CollectionPage:
 * - Header section with location name, description, and image count
 * - Content grid of images from this location
 *
 * Once the backend endpoint is available, replace getMockLocationData()
 * with an API call to GET /api/read/locations/{slug}
 *
 * @param slug - Location URL slug (e.g., "seattle", "new-york")
 */
export default function LocationPage({ slug }: LocationPageProps) {
  const locationData = getMockLocationData(slug);
  const contentBlocks = processContentBlocks(locationData.content, true);

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <SiteHeader pageType="default" />

        {/* Location header — replaces collection cover image + metadata */}
        <div className={styles.locationHeader}>
          <div className={styles.locationMeta}>
            <h1 className={styles.locationName}>{locationData.name}</h1>
            <p className={styles.locationDescription}>{locationData.description}</p>
            <span className={styles.imageCount}>
              {locationData.imageCount} {locationData.imageCount === 1 ? 'image' : 'images'}
            </span>
          </div>
        </div>

        {/* Placeholder notice */}
        <div className={styles.placeholderNotice}>
          <p>
            This is a placeholder page. The backend location endpoint is not yet
            available. See <code>todo/backend-requirements-location.md</code> for
            the planned API contract.
          </p>
        </div>

        {/* Content grid */}
        {contentBlocks.length > 0 && (
          <ContentBlockWithFullScreen
            content={contentBlocks}
            priorityBlockIndex={0}
            enableFullScreenView
            initialPageSize={30}
            chunkSize={4}
          />
        )}
      </main>
    </div>
  );
}
