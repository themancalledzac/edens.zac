import { PageLoading } from '@/app/components/ui/PageLoading/PageLoading';

/**
 * Route fallback for every route in the `(site)` group. The collection, tag and location pages sit
 * outside this group on purpose: a boundary above them streams a 200 before their `notFound()` can
 * run, so they place their own `<Suspense>` after the slug check instead.
 */
export default function Loading() {
  return <PageLoading />;
}
