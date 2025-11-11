import React from 'react';

import cbStyles from './ContentComponent.module.scss';

interface ImageOverlaysProps {
  contentType: 'IMAGE' | 'TEXT' | 'GIF' | 'COLLECTION';
  isNotVisible: boolean;
  shouldShowOverlay: boolean;
  isSelected: boolean;
}

/**
 * ImageOverlays Component
 * 
 * Renders overlay indicators for image content:
 * - Visibility overlay (gray) for non-visible images
 * - Cover image overlay (checkmark) when selecting cover image
 * - Selected indicator (red circle with X) for selected images
 * 
 * Only renders for IMAGE content type.
 */
export function ImageOverlays({
  contentType,
  isNotVisible,
  shouldShowOverlay,
  isSelected,
}: ImageOverlaysProps): React.ReactElement | null {
  if (contentType !== 'IMAGE') return null;
  
  return (
    <>
      {isNotVisible && <div className={cbStyles.visibilityOverlay} />}
      {shouldShowOverlay && (
        <div className={cbStyles.coverImageOverlay}>
          <svg className={cbStyles.coverImageCheckmark} viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
      {isSelected && (
        <div className={cbStyles.selectedIndicator}>
          <svg className={cbStyles.selectedIndicatorX} viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>
      )}
    </>
  );
}

