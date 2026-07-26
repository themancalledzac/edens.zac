// Public + permission-scoped: the backend widens the synthetic all-collections list
// from the caller's ezac_session (admin => all; signed-in => LISTED + granted
// galleries; anonymous => LISTED), so no route-level gate is needed (0216 — was
// previously in the (admin) group).
import CollectionPageWrapper from '@/app/lib/components/CollectionPageWrapper';
import { BROWSE_EXCLUDED_SLUGS } from '@/app/utils/collectionSlugs';

export const dynamic = 'force-dynamic';

export default async function AllCollectionsPage() {
  // `home` is a standalone page and the others are shadowed by static routes, so none of
  // them are reachable from a list tile — drop them from the synthetic PARENT.
  return (
    <CollectionPageWrapper slug="all-collections" excludeContentSlugs={BROWSE_EXCLUDED_SLUGS} />
  );
}
