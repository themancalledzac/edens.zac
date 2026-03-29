import { cache } from 'react';
import { type Metadata } from 'next';
import { notFound } from 'next/navigation';

import TagPage from '@/app/components/TagPage/TagPage';
import { getAllTags, searchImages } from '@/app/lib/api/content';

const getCachedTags = cache(() => getAllTags());

interface TagPageRouteProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TagPageRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const tags = await getCachedTags();

  // Primary: match by API slug; fallback: case-insensitive name match for backwards compatibility
  const tag = tags?.find(t => t.slug === slug)
    ?? tags?.find(t => t.name.toLowerCase() === decodeURIComponent(slug).replace(/-/g, ' ').toLowerCase());
  const tagName = tag?.name ?? decodeURIComponent(slug).replace(/-/g, ' ');

  return {
    title: `${tagName} — Zac Edens Photography`,
    description: `Photos tagged "${tagName}" by Zac Edens`,
    openGraph: {
      title: `${tagName} — Zac Edens Photography`,
      description: `Photos tagged "${tagName}" by Zac Edens`,
      type: 'website',
    },
  };
}

export default async function TagPageRoute({ params }: TagPageRouteProps) {
  const { slug } = await params;
  if (!slug) notFound();

  const tags = await getCachedTags();
  if (!tags?.length) notFound();

  // Primary: match by API slug; fallback: case-insensitive name match for backwards compatibility
  const matchedTag = tags.find(t => t.slug === slug)
    ?? tags.find(t => t.name.toLowerCase() === decodeURIComponent(slug).replace(/-/g, ' ').toLowerCase());
  if (!matchedTag) notFound();

  const images = await searchImages({ tagIds: [matchedTag.id] });

  return <TagPage tagName={matchedTag.name} images={images} />;
}
