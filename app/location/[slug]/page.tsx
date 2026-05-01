import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import LocationPage from '@/app/components/LocationPage/LocationPage';
import { getCollectionsByLocation } from '@/app/lib/api/collections';
import { getAllLocations, searchImages } from '@/app/lib/api/content';

interface LocationPageRouteProps {
  params: Promise<{ slug: string }>;
}

interface ResolvedLocation {
  id: number;
  name: string;
  slug: string;
}

/**
 * Resolve a URL slug to a real location by matching against the backend location list.
 * Primary: match by API slug field directly.
 * Fallback: exact name match for backwards-compatible URLs.
 * Returns null if no match found.
 */
async function resolveLocationFromSlug(slug: string): Promise<ResolvedLocation | null> {
  const locations = await getAllLocations();
  if (!locations?.length) return null;

  const slugMatch = locations.find(l => l.slug === slug);
  if (slugMatch) return { id: slugMatch.id, name: slugMatch.name, slug: slugMatch.slug };

  const decoded = decodeURIComponent(slug);
  const nameMatch = locations.find(l => l.name === decoded);
  if (nameMatch) return { id: nameMatch.id, name: nameMatch.name, slug: nameMatch.slug };

  return null;
}

const getCachedLocation = cache(resolveLocationFromSlug);

export const revalidate = 3600;

export async function generateStaticParams() {
  // Tolerate backend unreachability at build time. The Amplify build container
  // can't fetch from this site's own not-yet-deployed proxy, so an empty list
  // here means "no prerendered routes" — pages still render on first request
  // and are cached by `revalidate = 3600`. Mirrors the home page pattern in
  // app/[slug]/page.tsx, where getAllCollections() swallows fetch errors.
  try {
    const locations = await getAllLocations();
    return (locations ?? []).map(location => ({ slug: location.slug }));
  } catch {
    return [];
  }
}

/**
 * Generate SEO metadata for location pages.
 */
export async function generateMetadata({ params }: LocationPageRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const location = await getCachedLocation(slug);
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
 *
 * @remarks Cover image is the highest-rated image (rating >= 4), falling back to the first image.
 *   Collection listing endpoints may not include coverImage data, so the image list is used instead.
 */
export default async function LocationPageRoute({ params }: LocationPageRouteProps) {
  const { slug } = await params;
  if (!slug) notFound();

  const location = await getCachedLocation(slug);
  if (!location) notFound();

  const [collections, images] = await Promise.all([
    getCollectionsByLocation(location.slug),
    searchImages({ locationId: location.id }),
  ]);

  if (collections.length === 0 && images.length === 0) notFound();

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
