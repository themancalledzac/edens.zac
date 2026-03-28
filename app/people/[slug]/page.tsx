import { type Metadata } from 'next';
import { notFound } from 'next/navigation';

import PersonPage from '@/app/components/PersonPage/PersonPage';
import { getAllPeople, searchImages } from '@/app/lib/api/content';

interface PersonPageRouteProps {
  params: Promise<{ slug: string }>;
}

function slugToDisplayName(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function generateMetadata({ params }: PersonPageRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const people = await getAllPeople();
  const decoded = decodeURIComponent(slug);
  const person = people?.find(p => p.personName === decoded)
    ?? people?.find(p => p.personName.toLowerCase() === decoded.replace(/-/g, ' ').toLowerCase());
  const personName = person?.personName ?? slugToDisplayName(slug);
  return {
    title: `${personName} — Zac Edens Photography`,
    description: `Photos of ${personName} by Zac Edens`,
    openGraph: { title: `${personName} — Zac Edens Photography`, description: `Photos of ${personName} by Zac Edens`, type: 'website' },
  };
}

export default async function PersonPageRoute({ params }: PersonPageRouteProps) {
  const { slug } = await params;
  if (!slug) notFound();

  const people = await getAllPeople();
  if (!people?.length) notFound();

  const decoded = decodeURIComponent(slug);
  const matchedPerson = people.find(p => p.personName === decoded)
    ?? people.find(p => p.personName.toLowerCase() === decoded.replace(/-/g, ' ').toLowerCase());
  if (!matchedPerson) notFound();

  const images = await searchImages({ personIds: [matchedPerson.id] });

  return <PersonPage personName={matchedPerson.personName} images={images} />;
}
