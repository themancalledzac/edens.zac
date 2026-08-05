'use client';

import { type ReactElement } from 'react';

import { useFollows } from '@/app/components/Personal/FollowsContext';

import styles from './FollowButton.module.scss';

/**
 * Which corner of the card the pill pins to. Both are right-aligned; `bottom` exists for cards
 * that already carry a top-right overlay (the content grid's collection cards put the public
 * `Badge` there).
 */
export type FollowButtonPlacement = 'top' | 'bottom';

interface FollowButtonProps {
  collectionId: number;
  /** Corner to pin to. Defaults to `top`. */
  placement?: FollowButtonPlacement;
}

/**
 * Follow/unfollow toggle for a collection. Self-gates on an active FollowsProvider (mounted only
 * for logged-in viewers), so it renders nothing for anonymous viewers. Mirrors the SaveHeart
 * context-not-props pattern.
 */
export function FollowButton({
  collectionId,
  placement = 'top',
}: FollowButtonProps): ReactElement | null {
  const follows = useFollows();

  if (!follows) {
    return null;
  }

  const following = follows.isFollowing(collectionId);
  const classes = [
    styles.followButton,
    placement === 'bottom' ? styles.followButtonBottom : '',
    following ? styles.followButtonActive : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
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
