import type { Metadata } from 'next';

import CollectionPageWrapper from '@/app/lib/components/CollectionPageWrapper';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Photography portfolio by Zac Eden — landscape, portrait, and event photography',
};

// Local-only escape route to the real home page. The middleware (proxy.ts)
// redirects this path to / in non-local environments, so this file never
// renders in prod even though it's part of the build. force-dynamic mirrors
// app/page.tsx so the per-request collection fetch isn't statically rendered.
export const dynamic = 'force-dynamic';

export default async function HomePagePreview() {
  return <CollectionPageWrapper slug="home" />;
}
