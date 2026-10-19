import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache, Suspense } from 'react';

import LocationPage from '@/app/components/LocationPage/LocationPage';
import { PageLoading } from '@/app/components/ui/PageLoading/PageLoading';
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

/** Renders on every request rather than at build time; see app/tag/[slug]/page.tsx. */
export const dynamic = 'force-dynamic';

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
 * Fetches the location's collections and images in parallel and renders the page. Runs inside the
 * route's `<Suspense>`, so a location with no content gets the not-found UI with a `noindex` tag
 * but keeps the 200 that has already streamed.
 */
async function LocationPageContent({ location }: { location: ResolvedLocation }) {
  const [collections, images] = await Promise.all([
    getCollectionsByLocation(location.slug),
    searchImages({ locationId: location.id }),
  ]);

  if (collections.length === 0 && images.length === 0) notFound();

  return <LocationPage locationName={location.name} collections={collections} images={images} />;
}

/**
 * Location page route. Resolves the slug against real backend locations and throws `notFound()`
 * before anything streams, so an unknown location answers a real 404. The route sits outside the
 * `(site)` group's `loading.tsx` for that reason; the content streams behind its own `<Suspense>`.
 * The lookup is the read `generateMetadata` already made, deduped by `getCachedLocation`.
 */
export default async function LocationPageRoute({ params }: LocationPageRouteProps) {
  const { slug } = await params;
  if (!slug) notFound();

  const location = await getCachedLocation(slug);
  if (!location) notFound();

  return (
    <Suspense fallback={<PageLoading />}>
      <LocationPageContent location={location} />
    </Suspense>
  );
}
