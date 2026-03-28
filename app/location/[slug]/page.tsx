import { type Metadata } from 'next';
import { notFound } from 'next/navigation';

import LocationPage from '@/app/components/LocationPage/LocationPage';
import { getCollectionsByLocation } from '@/app/lib/api/collections';
import { getAllLocations, searchImages } from '@/app/lib/api/content';

interface LocationPageRouteProps {
  params: Promise<{ slug: string }>;
}

interface ResolvedLocation {
  id: number;
  name: string;
}

/**
 * Resolve a URL slug to a real location by matching against the backend location list.
 * Handles commas, apostrophes, and other characters that get encoded in URLs.
 * Returns null if no match found.
 */
async function resolveLocationFromSlug(slug: string): Promise<ResolvedLocation | null> {
  const decoded = decodeURIComponent(slug);
  const locations = await getAllLocations();
  if (!locations?.length) return null;

  // Try exact match first (slug IS the location name, just URL-encoded)
  const exactMatch = locations.find(l => l.name === decoded);
  if (exactMatch) return { id: exactMatch.id, name: exactMatch.name };

  // Try normalized match: strip punctuation, lowercase, compare
  const normalize = (s: string) => s.toLowerCase().replace(/[^\d\sa-z]/g, '').replace(/\s+/g, ' ').trim();
  const normalizedSlug = normalize(decoded.replace(/-/g, ' '));
  const fuzzyMatch = locations.find(l => normalize(l.name) === normalizedSlug);
  if (fuzzyMatch) return { id: fuzzyMatch.id, name: fuzzyMatch.name };

  return null;
}

/**
 * Generate SEO metadata for location pages.
 */
export async function generateMetadata({ params }: LocationPageRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const location = await resolveLocationFromSlug(slug);
  const locationName = location?.name ?? decodeURIComponent(slug);

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
 * Resolves the slug against real backend locations, then fetches collections and images in parallel.
 * Calls notFound() when the location doesn't exist or has no content.
 */
export default async function LocationPageRoute({ params }: LocationPageRouteProps) {
  const { slug } = await params;
  if (!slug) notFound();

  const location = await resolveLocationFromSlug(slug);
  if (!location) notFound();

  const [collections, images] = await Promise.all([
    getCollectionsByLocation(location.name),
    searchImages({ locationId: location.id, size: 500 }),
  ]);

  if (collections.length === 0 && images.length === 0) notFound();

  // Use the highest-rated image as cover, falling back to first image.
  // Collection listing endpoints may not include coverImage data.
  const coverImage = images.find(img => (img.rating ?? 0) >= 4) ?? images[0] ?? null;

  return (
    <LocationPage
      locationName={location.name}
      collections={collections}
      images={images}
      coverImage={coverImage}
    />
  );
}
