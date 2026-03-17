import { type Metadata } from 'next';
import { notFound } from 'next/navigation';

import LocationPage from '@/app/components/LocationPage/LocationPage';

interface LocationPageRouteProps {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * Generate SEO metadata for location pages.
 * Uses the slug to create a human-readable title.
 */
export async function generateMetadata({ params }: LocationPageRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const locationName = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    title: `${locationName} — Zac Edens Photography`,
    description: `Photography from ${locationName} by Zac Edens`,
    openGraph: {
      title: `${locationName} — Zac Edens Photography`,
      description: `Photography from ${locationName} by Zac Edens`,
      type: 'website',
    },
  };
}

/**
 * Location Page Route
 *
 * Displays images from a specific location in a collection-like layout.
 * This is a POC/placeholder — the backend endpoint does not exist yet.
 * See todo/backend-requirements-location.md for backend requirements.
 *
 * @param params - Next.js dynamic route params containing location slug
 */
export default async function LocationPageRoute({ params }: LocationPageRouteProps) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  return <LocationPage slug={slug} />;
}
