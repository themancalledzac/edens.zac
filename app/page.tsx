import type { Metadata } from 'next';

import CollectionPageWrapper from '@/app/lib/components/CollectionPageWrapper';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Photography portfolio by Zac Eden — landscape, portrait, and event photography',
  openGraph: {
    title: 'Edens Zac — Photography Portfolio',
    description: 'Photography portfolio by Zac Eden — landscape, portrait, and event photography',
    type: 'website',
  },
};

/**
 * Landing page; renders the 'home' collection via the shared CollectionPageWrapper.
 *
 * @todo Remove force-dynamic once backend removes the `blocks_per_page` column reference.
 *   Restore: `export const revalidate = 3600; export const dynamic = 'error';`
 */
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  return <CollectionPageWrapper slug="home" />;
}
