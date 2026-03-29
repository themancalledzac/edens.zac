'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';

import ContentFilter from '@/app/components/ContentFilter/ContentFilter';
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { type AnyContentModel, type ContentImageModel } from '@/app/types/Content';
import { filterContent, parseFilterFromParams } from '@/app/utils/contentFilter';

import styles from './SearchPage.module.scss';
import SearchResults from './SearchResults';

/** Map index modulo to image height for mock data variety */
function getHeightForIndex(i: number): number {
  const mod = i % 4;
  if (mod === 0) return 2400;
  if (mod === 1) return 1067;
  if (mod === 2) return 1600;
  return 900;
}

/**
 * Generate mock images for the search page POC.
 * In production, these would come from GET /api/read/content/search
 */
function getMockSearchContent(): ContentImageModel[] {
  const locations = ['Seattle', 'Portland', 'New York', 'Los Angeles', 'Tokyo'];
  const cameras = ['Sony A7III', 'Nikon Z6', 'Canon R5', 'Fuji X-T5'];
  const tags = ['landscape', 'portrait', 'street', 'architecture', 'nature', 'urban'];
  const people = ['Alice', 'Bob', 'Charlie'];

  return Array.from({ length: 24 }, (_, i): ContentImageModel => {
    // Safe: modulo on non-empty arrays always yields valid indices
    const locationName = locations[i % locations.length] as string;
    const cameraName = cameras[i % cameras.length] as string;
    const tagName1 = tags[i % tags.length] as string;
    const tagName2 = tags[(i + 2) % tags.length] as string;
    const personName = people[i % people.length] as string;

    return {
      id: 2000 + i,
      contentType: 'IMAGE',
      orderIndex: i,
      title: `Search Result ${i + 1}`,
      imageUrl: '',
      imageWidth: 1600,
      imageHeight: getHeightForIndex(i),
      rating: (i % 5) + 1,
      location: { id: i % locations.length, name: locationName, slug: '' },
      camera: { id: i % cameras.length, name: cameraName },
      tags: [
        { id: i % tags.length, name: tagName1, slug: '' },
        { id: (i + 2) % tags.length, name: tagName2, slug: '' },
      ],
      people: i % 3 === 0 ? [{ id: i % people.length, name: personName, slug: '' }] : [],
      createdAt: new Date(2024, i % 12, (i % 28) + 1).toISOString(),
      visible: true,
    };
  });
}

/**
 * Inner search page content — wrapped in Suspense for useSearchParams
 */
function SearchPageContent() {
  const mockContent = useMemo(() => getMockSearchContent(), []);

  const [filteredContent, setFilteredContent] = useState<AnyContentModel[]>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const criteria = parseFilterFromParams(params);
      return filterContent(mockContent, criteria);
    }
    return mockContent;
  });

  const handleFilterChange = useCallback((filtered: AnyContentModel[]) => {
    setFilteredContent(filtered);
  }, []);

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <SiteHeader pageType="default" />

        <div className={styles.searchHeader}>
          <h1 className={styles.searchTitle}>Search</h1>
          <p className={styles.searchDescription}>
            Browse and filter all images. This is a POC — using mock data until the
            backend search endpoint is available.
          </p>
        </div>

        <div className={styles.filterBar}>
          <ContentFilter
            content={mockContent}
            onFilterChange={handleFilterChange}
            variant="bar"
            showTextSearch
            showDateRange
          />
        </div>

        <div className={styles.resultsInfo}>
          <span className={styles.resultCount}>
            {filteredContent.length} {filteredContent.length === 1 ? 'result' : 'results'}
            {filteredContent.length !== mockContent.length && (
              <> of {mockContent.length} total</>
            )}
          </span>
        </div>

        <SearchResults content={filteredContent} />
      </main>
    </div>
  );
}

/**
 * Search Page Component
 *
 * Full-page search and filter interface for browsing all public images.
 * Structure differs from collection pages:
 * - No cover image header — replaced by a filter bar
 * - Denser grid layout (higher chunkSize for more images per row)
 * - Full filter suite: text search, rating, people, location, tags, camera, date range
 *
 * Currently uses mock data. Once the backend search endpoint is available,
 * replace getMockSearchContent() with an API call.
 *
 * Filter state is stored in URL search params via ContentFilter component.
 */
export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageContent />
    </Suspense>
  );
}
