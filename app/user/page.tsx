import { notFound } from 'next/navigation';

import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import { meServer } from '@/app/lib/api/auth';
import { getUserPage } from '@/app/lib/api/user';

export const dynamic = 'force-dynamic';

/**
 * Session-gated self-only aggregation of the signed-in user's galleries and tagged content,
 * rendered through the standard collection pipeline. Anonymous visitors get a 404 (no login
 * surface exists yet — invite/onboarding is a later Phase C slice).
 */
export default async function UserPage() {
  const principal = await meServer();
  if (!principal) notFound();

  const collection = await getUserPage();
  if (!collection) notFound();

  return <CollectionPage collection={collection} />;
}
