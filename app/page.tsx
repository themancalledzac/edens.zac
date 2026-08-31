import type { Metadata } from 'next';

import CollectionPageWrapper from '@/app/components/ContentCollection/CollectionPageWrapper';
import { HOME_SLUG } from '@/app/utils/collectionSlugs';

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
 * Not prerenderable — `CollectionPageWrapper` awaits `headers()` and `cookies()`. `force-dynamic`
 * is explicit so a fetch added here later is not cached with per-viewer data. ISR was investigated
 * and dropped: PF4 in docs/spikes/2026-features/pf-performance-platform.md.
 */
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  return <CollectionPageWrapper slug={HOME_SLUG} />;
}
