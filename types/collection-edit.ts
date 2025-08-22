/**
 * Admin Collection Edit Types (Client-Safe)
 *
 * Purpose
 * - Shared TypeScript types used by client-side admin edit/create pages.
 * - Mirrors server DTO shapes where relevant while remaining safe for client usage.
 *
 * Contents
 * - Visibility: public/private flag.
 * - UpdateCollectionDTO: partial update payload including content operations.
 * - CollectionRead: minimal read shape used by the admin edit UI.
 */

import type { CollectionType, ContentBlock } from '@/lib/api/contentCollections';

/** Public or private visibility modes for collections. */
export type Visibility = 'PUBLIC' | 'PRIVATE';

/**
 * DTO for partial collection updates sent from client edit UI.
 * Mirrors backend UpdateCollectionDTO contract.
 */
export type UpdateCollectionDTO = {
  title?: string;
  description?: string;
  visibility?: Visibility;
  password?: string | null; // null clears
  priority?: number;
  blocksPerPage?: number;
  operations?: Array<
    | { op: 'reorder'; blockId: string; toIndex: number }
    | { op: 'remove'; blockId: string }
    | { op: 'addText'; afterBlockId?: string | null; content: string; format: 'markdown' | 'html' | 'plain' }
  >;
};

/** Minimal read shape for client edit page. */
export type CollectionRead = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  type: CollectionType;
  visibility?: Visibility;
  priority?: number;
  blocksPerPage?: number;
  page?: { page: number; size: number; totalPages: number; totalBlocks: number };
  blocks: ContentBlock[];
};
