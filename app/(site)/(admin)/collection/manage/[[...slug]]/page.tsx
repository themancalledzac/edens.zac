import { redirect } from 'next/navigation';

import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { meServer } from '@/app/lib/api/auth';
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

  const me = await meServer().catch(() => null);

  return (
    <PageShell backHref="/admin" me={me}>
      <CreateCollectionForm />
    </PageShell>
  );
}
