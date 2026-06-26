'use client';

import { createContext, type ReactNode, useContext } from 'react';

/**
 * Per-image rating control state for a client gallery. The slider is rendered deep in the content
 * tree (inside ImageOverlays, under Component/BoxRenderer/CollectionContentRenderer), but the
 * override map + live drag value it drives are owned by CollectionPageClient. This context bridges
 * the two without prop-drilling — mirroring ClientGalleryDownloadContext for the download control.
 */
export interface RatingControlContextValue {
  /** Whether the slider should render at all (editMode for canonical OR a CLIENT member for override). */
  canEdit: boolean;
  /** Current resolved rating to display for an image (drag > override > canonical). */
  resolveRatingForImage: (contentId: number) => number;
  /** Throttled live drag: re-flows the layout. Does NOT persist. */
  onDrag: (contentId: number, value: number) => void;
  /** Release: persist the final value (optimistic + rollback). Clears the live drag. */
  onCommit: (contentId: number, value: number) => void;
}

const RatingControlContext = createContext<RatingControlContextValue | null>(null);

export function RatingControlProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: RatingControlContextValue;
}) {
  return <RatingControlContext value={value}>{children}</RatingControlContext>;
}

/** Returns the rating-control state, or null when rendered outside a client gallery. */
export function useRatingControl(): RatingControlContextValue | null {
  return useContext(RatingControlContext);
}
