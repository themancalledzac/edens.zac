'use client';

import { notFound } from 'next/navigation';
import { use, useEffect, useState } from 'react';

import { fetchCollectionBySlug } from '@/lib/api/home';
import SiteHeader from '@/app/components/site-header';

interface ContentCollectionPageProps {
  params: Promise<{
    cardType: string;
    slug: string;
  }>;
}

export default function ContentCollectionPage({ params }: ContentCollectionPageProps) {
  const { cardType, slug } = use(params);
  const [content, setContent] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setIsLoading(true);

        console.log(`Attempting to fetch collection: cardType=${cardType}, slug=${slug}`);
        const collectionData = await fetchCollectionBySlug(slug);
        setContent(collectionData);
      } catch (error_) {
        console.error('Error fetching content:', error_);
        setError(`Failed to fetch content: ${error_?.message || error_}`);
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
        <div style={{ padding: '2rem' }}>
          <p>Loading {cardType} content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <SiteHeader />
        <div style={{ padding: '2rem' }}>
          <h1>Error Loading Content</h1>
          <p><strong>Card Type:</strong> {cardType}</p>
          <p><strong>Slug:</strong> {slug}</p>
          <p><strong>Error:</strong> {error}</p>
          <p>This helps debug the API call. The content might not exist or the API endpoint might be different.</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return notFound();
  }

  return (
    <div>
      <SiteHeader />
      <div style={{ padding: '2rem' }}>
        <h1>{content.title}</h1>
        {content.coverImageUrl && (
          <img
            src={content.coverImageUrl}
            alt={content.title}
            style={{ width: '100%', maxWidth: '600px', height: 'auto' }}
          />
        )}
        <p><strong>Card Type:</strong> {cardType}</p>
        <p><strong>Slug:</strong> {slug}</p>
        {content.location && <p><strong>Location:</strong> {content.location}</p>}
        {content.date && <p><strong>Date:</strong> {new Date(content.date).toLocaleDateString()}</p>}
        {content.description && <p>{content.description}</p>}

        {content.images && content.images.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h2>Images ({content.images.length})</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {content.images.map((image) => (
                <img
                  key={image.id}
                  src={image.url}
                  alt={image.filename || `Image ${image.id}`}
                  style={{ width: '100%', height: 'auto', borderRadius: '4px' }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}