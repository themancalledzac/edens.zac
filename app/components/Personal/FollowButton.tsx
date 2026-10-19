'use client';

import { Check, Plus } from 'lucide-react';
import { type ReactElement } from 'react';

import { CornerToggle } from '@/app/components/Content/CornerToggle';
import { useFollows } from '@/app/components/Personal/FollowsContext';

/**
 * Which corner of the card the toggle pins to. Both are right-aligned; `bottom` exists for cards
 * that already carry a top-right overlay (the content grid's collection cards put the public
 * `Badge` there).
 */
export type FollowButtonPlacement = 'top' | 'bottom';

interface FollowButtonProps {
  collectionId: number;
  /** Corner to pin to. Defaults to `top`. */
  placement?: FollowButtonPlacement;
  /** Collection title for the aria-label; a missing or blank title falls back to "collection". */
  title?: string;
}

/**
 * Follow/unfollow toggle for a collection, rendered through the shared `CornerToggle` with a Plus
 * icon when not following and a Check icon when following. The aria-label reads "Follow <title>" /
 * "Unfollow <title>", or "Follow collection" / "Unfollow collection" without a title. Self-gates
 * on an active FollowsProvider (mounted only for logged-in viewers), so it renders nothing for
 * anonymous viewers. Mirrors the SaveHeart context-not-props pattern.
 */
export function FollowButton({
  collectionId,
  placement = 'top',
  title,
}: FollowButtonProps): ReactElement | null {
  const follows = useFollows();

  if (!follows) {
    return null;
  }

  const following = follows.isFollowing(collectionId);
  const subject = title?.trim() || 'collection';

  return (
    <CornerToggle
      pressed={following}
      onToggle={() => follows.toggle(collectionId)}
      label={`${following ? 'Unfollow' : 'Follow'} ${subject}`}
      icon={following ? <Check color="white" /> : <Plus color="white" />}
      placement={placement}
    />
  );
}
