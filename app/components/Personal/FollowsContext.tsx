'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

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

  // Ref mirror of the followed Set, the synchronous source of truth for `toggle`'s follow/unfollow
  // decision. React runs functional state updaters lazily at flush time, so reading membership from
  // a closed-over Set (or from inside setFollowedIds) can't inform the persist/rollback direction
  // that must be chosen on the same synchronous tick. A ref always holds the latest value, so two
  // rapid clicks before a re-render each observe the other's result and stay consistent.
  const followedIdsRef = useRef(followedIds);

  // Write the new Set to the ref and state together so they never drift.
  const commit = useCallback((next: Set<number>) => {
    followedIdsRef.current = next;
    setFollowedIds(next);
  }, []);

  const isFollowing = useCallback(
    (collectionId: number) => followedIds.has(collectionId),
    [followedIds]
  );

  const toggle = useCallback(
    (collectionId: number) => {
      const wasFollowing = followedIdsRef.current.has(collectionId);

      // Optimistic update off the current (ref) membership.
      const optimistic = new Set(followedIdsRef.current);
      if (wasFollowing) {
        optimistic.delete(collectionId);
      } else {
        optimistic.add(collectionId);
      }
      commit(optimistic);

      const persist = wasFollowing ? removeFollow(collectionId) : addFollow(collectionId);
      persist.catch((error: unknown) => {
        // Roll back just this id off the latest membership (other in-flight toggles are preserved).
        const rolledBack = new Set(followedIdsRef.current);
        if (wasFollowing) {
          rolledBack.add(collectionId);
        } else {
          rolledBack.delete(collectionId);
        }
        commit(rolledBack);
        logger.error('FollowsContext', 'toggle failed; rolled back', error, {
          collectionId,
          wasFollowing,
        });
      });
    },
    [commit]
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
