import { type AdminPanelSeed } from '@/app/components/ListPanel/AdminPanelSeedContext';
import { getAdminHomeTiles } from '@/app/lib/api/adminHome';
import { getMetadata } from '@/app/lib/api/collections';
import { getAdminMessages } from '@/app/lib/api/messages';
import { listRoles } from '@/app/lib/api/roles';
import { listUsers } from '@/app/lib/api/users';
import { type AnyContentModel } from '@/app/types/Content';

import { buildAdminHubContent } from './adminHubContent';

export interface AdminHub {
  content: AnyContentModel[];
  seed: AdminPanelSeed;
}

/**
 * The hub's server reads in one round trip: tiles plus the four row counts the packer needs before
 * the first pack, with the full lists handed on as the panels' seed so nothing is fetched twice.
 * Resolving the counts server-side keeps that first pack the only one — a count arriving after
 * paint would re-pack the page, remount every panel, and re-fire their fetches in a loop.
 * Each read fails soft on its own; a failed list seeds `null`, never `[]`.
 */
export async function loadAdminHub(viewportHeight: number | undefined): Promise<AdminHub> {
  const [tiles, users, messages, roles, metadata] = await Promise.all([
    getAdminHomeTiles().catch(() => []),
    listUsers().catch(() => null),
    getAdminMessages(1, 0).catch(() => null),
    listRoles().catch(() => null),
    getMetadata().catch(() => null),
  ]);
  const collections = metadata?.collections ?? null;
  const content = buildAdminHubContent(
    tiles,
    {
      users: users?.length ?? 0,
      messages: messages?.total ?? 0,
      roles: roles?.length ?? 0,
      collections: collections?.length ?? 0,
    },
    viewportHeight
  );
  return { content, seed: { users, roles, collections } };
}
