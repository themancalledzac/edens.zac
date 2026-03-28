import { type Metadata } from 'next';
import { notFound } from 'next/navigation';

import TagPage from '@/app/components/TagPage/TagPage';
import { getAllTags, searchImages } from '@/app/lib/api/content';

interface TagPageRouteProps {
  params: Promise<{ slug: string }>;
}

// Helper to convert slug back to display name
function slugToDisplayName(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function generateMetadata({ params }: TagPageRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const tags = await getAllTags();
  const decoded = decodeURIComponent(slug);
  const tag = tags?.find(t => t.tagName === decoded)
    ?? tags?.find(t => t.tagName.toLowerCase() === decoded.replace(/-/g, ' ').toLowerCase());
  const tagName = tag?.tagName ?? slugToDisplayName(slug);
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

  // Resolve slug to tag entity
  const tags = await getAllTags();
  if (!tags?.length) notFound();

  const decoded = decodeURIComponent(slug);
  // Try exact match first, then normalized (dash-to-space, case-insensitive)
  const matchedTag = tags.find(t => t.tagName === decoded)
    ?? tags.find(t => t.tagName.toLowerCase() === decoded.replace(/-/g, ' ').toLowerCase());
  if (!matchedTag) notFound();

  // Fetch images with this tag
  const images = await searchImages({ tagIds: [matchedTag.id] });

  return <TagPage tagName={matchedTag.tagName} images={images} />;
}
