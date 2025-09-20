'use client';

import { notFound } from 'next/navigation';
import { use, useEffect, useState } from 'react';

import SiteHeader from '@/app/components/site-header';
import { type ContentCollectionNormalized } from '@/lib/api/contentCollections';
import { fetchCollectionBySlug } from '@/lib/api/home';

import blogData from '../../../Data/getBlogById.json';
import styles from '../../page.module.scss';

interface ContentCollectionPageProps {
  params: Promise<{
    cardType: string;
    slug: string;
  }>;
}

export default function ContentCollectionPage({ params }: ContentCollectionPageProps) {
  const { cardType, slug } = use(params);
  const [content, setContent] = useState<ContentCollectionNormalized | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setIsLoading(true);

        console.log(`Attempting to fetch collection: cardType=${cardType}, slug=${slug}`);
        const collectionData = await fetchCollectionBySlug(slug);
        setContent(collectionData);
      } catch (error_) {
        console.error('Error fetching content:', error_);
        // Fallback to local JSON sample normalized to the expected shape
        const fallback: ContentCollectionNormalized = {
          id: (blogData as any).id,
          title: (blogData as any).title,
          description: (blogData as any).description,
          slug: (blogData as any).slug,
          type: (blogData as any).type,
          blocks: (blogData as any).contentBlocks ?? [],
          pagination: {
            currentPage: (blogData as any).currentPage ?? 0,
            totalPages: (blogData as any).totalPages ?? 1,
            totalBlocks: (blogData as any).totalBlocks ?? ((blogData as any).contentBlocks?.length ?? 0),
            pageSize: (blogData as any).blocksPerPage ?? 30,
          },
        };
        setContent(fallback);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [slug, cardType]);

  if (isLoading) {
    return (
      <div>
        <SiteHeader />
        <div className={styles.main}>
          <p>Loading {cardType} content...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return notFound();
  }

  // TODO:
  //  - I believe we are using the incorrect shape of data being 'getBlogById.json'
  //  -
  //  -
  //  -

  return (
    <div>
      <SiteHeader />
      <div className={styles.contentPadding}>
        <div className={styles.gridContainer}>
          <div className={styles.coverImage}>
            {content.coverImageUrl && (
              <img
                src={content.coverImageUrl}
                alt={content.title}
                className={styles.coverImageTag}
              />
            )}
          </div>
          <div className={styles.metadata}>
            <p>
              <strong>Card Type:</strong> {cardType}
            </p>
            <p>
              <strong>Title:</strong> {content.title}
            </p>
            <p>
              <strong>Slug:</strong> {slug}
            </p>
            {content.location && (
              <p>
                <strong>Location:</strong> {content.location}
              </p>
            )}
            {content.collectionDate && (
              <p>
                <strong>Date:</strong> {new Date(content.collectionDate).toLocaleDateString()}
              </p>
            )}
            {content.description && (
              <p>
                <strong>Description:</strong> {content.description}
              </p>
            )}
          </div>
        </div>
        {(() => {
          const imageBlocks = (content.blocks || []).filter((b: any) => b.blockType === 'IMAGE') as any[];
          return imageBlocks.length > 0 ? (
            <div className={styles.blockGroup}>
              <div className={styles.gridContainer}>
                {imageBlocks.map((image: any) => (
                  <div key={image.id} className={styles.slug_gridSection}>
                    <div className={styles.slug_gridBackground}>
                      <img
                        src={image.imageUrlWeb}
                        alt={image.title || `Image ${image.id}`}
                        className={styles.blockImage}
                      />
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ) : null;
        })()}
      </div>
    </div>
  );
}
