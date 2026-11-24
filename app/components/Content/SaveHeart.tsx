'use client';

import { type ReactElement } from 'react';

import { useMe } from '@/app/components/Auth/MeProvider';
import { CornerToggle } from '@/app/components/Content/CornerToggle';
import { useSaves } from '@/app/components/Personal/SavesContext';
import { IconButton } from '@/app/components/ui/IconButton/IconButton';

import styles from './SaveHeart.module.scss';

interface SaveHeartProps {
  contentId: number;
  /** `tile` is the edge-flush corner toggle on a grid tile; `viewer` is a round button for the fullscreen action row. */
  variant?: 'tile' | 'viewer';
}

/**
 * Heart that bookmarks/un-bookmarks an image for the current viewer. Reads `useMe()` and
 * `useSaves()` directly (the same context-not-props pattern the renderer uses for the Selects star),
 * so no props thread through the generic renderer chain.
 *
 * Unlike `SelectStar`, this renders for ANY logged-in viewer (bookmark semantics) — it gates on
 * `useMe()` truthy plus an active SavesProvider, NOT on client membership.
 */
export function SaveHeart({ contentId, variant = 'tile' }: SaveHeartProps): ReactElement | null {
  const me = useMe();
  const saves = useSaves();

  if (!me || !saves) {
    return null;
  }

  const saved = saves.isSaved(contentId);
  const label = saved ? 'Remove from Your Space' : 'Save to Your Space';
  const icon = (
    <svg
      className={`${styles.saveHeartIcon} ${saved ? styles.saveHeartIconActive : ''}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M12 21s-7.5-4.6-10-9.2C.6 9.1 1.6 5.7 4.6 4.7 6.6 4 8.7 4.8 10 6.4L12 8.7l2-2.3c1.3-1.6 3.4-2.4 5.4-1.7 3 1 4 4.4 2.6 7.1C19.5 16.4 12 21 12 21z" />
    </svg>
  );

  if (variant === 'viewer') {
    return (
      <IconButton
        variant="scrim"
        aria-pressed={saved}
        aria-label={label}
        onClick={event => {
          event.stopPropagation();
          saves.toggle(contentId);
        }}
      >
        {icon}
      </IconButton>
    );
  }

  return (
    <CornerToggle
      pressed={saved}
      label={label}
      onToggle={() => saves.toggle(contentId)}
      icon={icon}
    />
  );
}
