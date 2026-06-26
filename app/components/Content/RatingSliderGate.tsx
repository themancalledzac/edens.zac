'use client';

import { type ReactElement } from 'react';

import { RatingSlider } from '@/app/components/Content/RatingSlider';
import { useRatingControl } from '@/app/components/ContentCollection/RatingControlContext';

interface RatingSliderGateProps {
  contentId: number;
}

/**
 * Self-gating rating slider for one image. Reads `useRatingControl()` directly — the
 * context-not-props pattern `CollectionContentRenderer` already uses for {@link SelectStar} — so no
 * props thread through the generic renderer chain. Renders nothing unless a RatingControlProvider
 * is mounted AND the viewer may edit (admin canonical OR a `canTag` client). The resolved value
 * (drag > override > canonical) and the drag/commit callbacks all come from the context.
 */
export function RatingSliderGate({ contentId }: RatingSliderGateProps): ReactElement | null {
  const rating = useRatingControl();
  if (!rating?.canEdit) {
    return null;
  }
  return (
    <RatingSlider
      contentId={contentId}
      value={rating.resolveRatingForImage(contentId)}
      onDrag={rating.onDrag}
      onCommit={rating.onCommit}
    />
  );
}
