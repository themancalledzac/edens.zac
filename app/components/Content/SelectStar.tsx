'use client';

import { type ReactElement } from 'react';

import { useMe } from '@/app/components/auth/MeProvider';
import { useSelects } from '@/app/components/ContentCollection/SelectsContext';
import { isClientOfCollection } from '@/app/utils/galleryAccess';

import cbStyles from './ContentComponent.module.scss';

interface SelectStarProps {
  contentId: number;
}

/**
 * Corner star that adds/removes an image from the viewer's personal Selects. Reads `useMe()` and
 * `useSelects()` directly (the same context-not-props pattern `CollectionContentRenderer` already
 * uses for `useCollectionFilter`/`useInlineEdit`), so no props thread through the generic renderer
 * chain. The collection id comes from the SelectsProvider on the context. Renders nothing unless a
 * SelectsProvider is mounted AND the viewer holds a CLIENT membership on that collection. Distinct from the download
 * "select mode".
 */
export function SelectStar({ contentId }: SelectStarProps): ReactElement | null {
  const me = useMe();
  const selects = useSelects();

  if (!selects || !isClientOfCollection(me, selects.collectionId, false)) {
    return null;
  }

  const selected = selects.isSelected(contentId);

  return (
    <button
      type="button"
      className={`${cbStyles.selectStar} ${selected ? cbStyles.selectStarActive : ''}`}
      aria-pressed={selected}
      aria-label={selected ? 'Remove from Your Selects' : 'Add to Your Selects'}
      onClick={event => {
        // Don't let the star click bubble to the image wrapper (which opens fullscreen).
        event.stopPropagation();
        selects.toggle(contentId);
      }}
    >
      <svg className={cbStyles.selectStarIcon} viewBox="0 0 24 24" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
}
