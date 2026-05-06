import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { resolveTaxonomyBySlug } from '@/app/components/TaxonomyPage/resolveTaxonomy';
import TaxonomyPage from '@/app/components/TaxonomyPage/TaxonomyPage';
import { getAllPeople, searchImages } from '@/app/lib/api/content';

const getCachedPeople = cache(() => getAllPeople());

// Render on every request — see app/tag/[slug]/page.tsx for the rationale.
export const dynamic = 'force-dynamic';

interface PersonPageRouteProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PersonPageRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const people = await getCachedPeople();
  const person = resolveTaxonomyBySlug(people, slug);
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
  const matchedPerson = resolveTaxonomyBySlug(people, slug);
  if (!matchedPerson) notFound();

  const images = await searchImages({ personIds: [matchedPerson.id] });
  return <TaxonomyPage entityName={matchedPerson.name} images={images} />;
}
