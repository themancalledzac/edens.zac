import CollectionPageWrapper from '@/app/lib/components/CollectionPageWrapper';

export const dynamic = 'force-dynamic';

export default async function AllCollectionsPage() {
  return <CollectionPageWrapper slug="all-collections" />;
}
