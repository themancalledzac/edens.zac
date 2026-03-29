import { cache } from 'react';
import { type Metadata } from 'next';
import { notFound } from 'next/navigation';

import PersonPage from '@/app/components/PersonPage/PersonPage';
import { getAllPeople, searchImages } from '@/app/lib/api/content';

const getCachedPeople = cache(() => getAllPeople());

interface PersonPageRouteProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PersonPageRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const people = await getCachedPeople();

  // Primary: match by API slug; fallback: case-insensitive name match for backwards compatibility
  const person = people?.find(p => p.slug === slug)
    ?? people?.find(p => p.name.toLowerCase() === decodeURIComponent(slug).replace(/-/g, ' ').toLowerCase());
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

export default async function PersonPageRoute({ params }: PersonPageRouteProps) {
  const { slug } = await params;
  if (!slug) notFound();

  const people = await getCachedPeople();
  if (!people?.length) notFound();

  // Primary: match by API slug; fallback: case-insensitive name match for backwards compatibility
  const matchedPerson = people.find(p => p.slug === slug)
    ?? people.find(p => p.name.toLowerCase() === decodeURIComponent(slug).replace(/-/g, ' ').toLowerCase());
  if (!matchedPerson) notFound();

  const images = await searchImages({ personIds: [matchedPerson.id] });

  return <PersonPage personName={matchedPerson.name} images={images} />;
}
