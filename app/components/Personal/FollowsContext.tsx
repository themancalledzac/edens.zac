'use client';

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { addFollow, removeFollow } from '@/app/lib/api/personal';
import { logger } from '@/app/utils/logger';

/**
 * Followed-collections state for the CURRENT viewer. Owns the Set of followed collection ids,
 * seeded server-side from the viewer's follows, and exposes an optimistic `toggle` that updates
 * the Set immediately and rolls back if the persist call fails. Mirrors {@link SavesProvider}.
 */
export interface FollowsContextValue {
  /** Collection ids the viewer follows. */
  followedIds: ReadonlySet<number>;
  /** True if the collection is currently followed. */
  isFollowing: (collectionId: number) => boolean;
  /** Optimistically follow/unfollow; persists and rolls back on failure. */
  toggle: (collectionId: number) => void;
}

const FollowsContext = createContext<FollowsContextValue | null>(null);

export function FollowsProvider({
  initialFollowedIds,
  children,
}: {
  initialFollowedIds: number[];
  children: ReactNode;
}) {
  const [followedIds, setFollowedIds] = useState<Set<number>>(() => new Set(initialFollowedIds));

  const isFollowing = useCallback(
    (collectionId: number) => followedIds.has(collectionId),
    [followedIds]
  );

  const toggle = useCallback(
    (collectionId: number) => {
      const wasFollowing = followedIds.has(collectionId);

      // Optimistic update.
      setFollowedIds(prev => {
        const next = new Set(prev);
        if (wasFollowing) {
          next.delete(collectionId);
        } else {
          next.add(collectionId);
        }
        return next;
      });

      const persist = wasFollowing ? removeFollow(collectionId) : addFollow(collectionId);
      persist.catch((error: unknown) => {
        setFollowedIds(prev => {
          const next = new Set(prev);
          if (wasFollowing) {
            next.add(collectionId);
          } else {
            next.delete(collectionId);
          }
          return next;
        });
        logger.error('FollowsContext', 'toggle failed; rolled back', error, {
          collectionId,
          wasFollowing,
        });
      });
    },
    [followedIds]
  );

  const value = useMemo<FollowsContextValue>(
    () => ({ followedIds, isFollowing, toggle }),
    [followedIds, isFollowing, toggle]
  );

  return <FollowsContext value={value}>{children}</FollowsContext>;
}

/** The viewer's follows state, or null when rendered outside a provider. */
export function useFollows(): FollowsContextValue | null {
  return useContext(FollowsContext);
}
