import CollectionPageWrapper from '@/app/lib/components/CollectionPageWrapper';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Client Galleries',
  robots: { index: false, follow: false },
};

export default async function AllClientGalleriesPage() {
  return <CollectionPageWrapper slug="all-client-galleries" />;
}
