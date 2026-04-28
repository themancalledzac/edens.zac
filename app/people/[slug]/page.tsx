import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import TaxonomyPage from '@/app/components/TaxonomyPage/TaxonomyPage';
import { getAllPeople, searchImages } from '@/app/lib/api/content';

const getCachedPeople = cache(() => getAllPeople());

export const revalidate = 3600;

export async function generateStaticParams() {
  const people = await getAllPeople();
  return (people ?? []).map(person => ({ slug: person.slug }));
}

interface PersonPageRouteProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate SEO metadata for person pages.
 *
 * @remarks Resolves the slug by exact API slug first, then falls back to a
 *   case-insensitive name match for backwards-compatible URLs.
 */
export async function generateMetadata({ params }: PersonPageRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const people = await getCachedPeople();

  const person =
    people?.find(p => p.slug === slug) ??
    people?.find(
      p => p.name.toLowerCase() === decodeURIComponent(slug).replace(/-/g, ' ').toLowerCase()
    );
  const personName = person?.name ?? decodeURIComponent(slug).replace(/-/g, ' ');

  return {
    title: `${personName} — Zac Edens Photography`,
    description: `Photos of ${personName} by Zac Edens`,
    openGraph: {
      title: `${personName} — Zac Edens Photography`,
      description: `Photos of ${personName} by Zac Edens`,
      type: 'website',
    },
  };
}

/**
 * Person Page Route
 *
 * Fetches all images associated with a person resolved from the URL slug.
 *
 * @remarks Resolves the slug by exact API slug first, then falls back to a
 *   case-insensitive name match for backwards-compatible URLs.
 */
export default async function PersonPageRoute({ params }: PersonPageRouteProps) {
  const { slug } = await params;
  if (!slug) notFound();

  const people = await getCachedPeople();
  if (!people?.length) notFound();

  const matchedPerson =
    people.find(p => p.slug === slug) ??
    people.find(
      p => p.name.toLowerCase() === decodeURIComponent(slug).replace(/-/g, ' ').toLowerCase()
    );
  if (!matchedPerson) notFound();

  const images = await searchImages({ personIds: [matchedPerson.id] });

  return <TaxonomyPage entityName={matchedPerson.name} images={images} />;
}
