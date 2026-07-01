'use client';

import { type ReactElement } from 'react';

import { useFollows } from '@/app/components/Personal/FollowsContext';

import styles from './FollowButton.module.scss';

interface FollowButtonProps {
  collectionId: number;
}

/**
 * Follow/unfollow toggle for a collection. Self-gates on an active FollowsProvider (mounted only
 * for logged-in viewers), so it renders nothing for anonymous viewers. Mirrors the SaveHeart
 * context-not-props pattern.
 */
export function FollowButton({ collectionId }: FollowButtonProps): ReactElement | null {
  const follows = useFollows();

  if (!follows) {
    return null;
  }

  const following = follows.isFollowing(collectionId);

  return (
    <button
      type="button"
      className={`${styles.followButton} ${following ? styles.followButtonActive : ''}`}
      aria-pressed={following}
      aria-label={following ? 'Unfollow collection' : 'Follow collection'}
      onClick={event => {
        // Don't let the click bubble to the card link (which navigates to the collection).
        event.preventDefault();
        event.stopPropagation();
        follows.toggle(collectionId);
      }}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
