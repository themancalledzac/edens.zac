// Admin = perimeter today (BFF INTERNAL_API_SECRET) → authenticated admin principal later (see docs 009). Gating centralized in app/(admin)/layout.tsx.
import CollectionPageWrapper from '@/app/lib/components/CollectionPageWrapper';

export const dynamic = 'force-dynamic';

export default async function AllCollectionsPage() {
  // `home` is a standalone page, not browsable in a list — exclude it from the synthetic PARENT.
  return <CollectionPageWrapper slug="all-collections" excludeContentSlugs={['home']} />;
}
