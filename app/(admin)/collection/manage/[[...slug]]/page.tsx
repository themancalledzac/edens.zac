import { redirect } from 'next/navigation';

import { manageHref } from '@/app/utils/manageUrl';

import CreateCollectionForm from './CreateCollectionForm';

interface ManageCollectionPageProps {
  params: Promise<{
    slug?: string[];
  }>;
}

export const dynamic = 'force-dynamic';

export default async function ManageCollectionPage({ params }: ManageCollectionPageProps) {
  const { slug: slugArray } = await params;
  const slug = slugArray?.[0];

  if (slug) {
    redirect(manageHref(slug));
  }

  return <CreateCollectionForm />;
}
