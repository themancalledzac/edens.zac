import React, { forwardRef } from 'react';

import cbStyles from './ContentBlockComponent.module.scss';

// Block wrapper props
export interface BlockWrapperProps {
  children: React.ReactNode;
  width: number;
  height: number;
  className: string;
  isMobile?: boolean;
  onClick?: () => void;
  hasOverlays?: boolean;
  isTextBlock?: boolean;
}

/**
 * Unified wrapper component for all block types (images, text, etc.)
 * Provides consistent sizing, padding, and click handling
 * Supports ref forwarding for parallax and other interactions
 */
export const BlockWrapper = forwardRef<HTMLDivElement, BlockWrapperProps>(function BlockWrapper({
  children,
  width,
  height,
  className,
  isMobile = false,
  onClick,
  hasOverlays = false,
  isTextBlock = false
}, ref) {
  // Calculate aspect ratio for mobile responsive sizing
  const aspectRatio = width / height;

  return (
    <div
      ref={ref}
      className={`${className} ${hasOverlays ? cbStyles.imageContainer : ''}`}
      onClick={onClick}
      style={{
        // Text blocks on mobile: no fixed dimensions (auto height)
        // Image blocks with overlays on mobile: full width with aspect ratio
        // Desktop: calculated width and height for all blocks
        // Mobile without overlays: no fixed dimensions (responsive)
        width: isMobile ?
          (isTextBlock ? undefined : (hasOverlays ? '100%' : undefined)) :
          width,
        height: isMobile ?
          (isTextBlock ? undefined : (hasOverlays ? undefined : undefined)) :
          height,
        aspectRatio: isMobile && hasOverlays && !isTextBlock ? aspectRatio : undefined,
        cursor: onClick ? 'pointer' : 'default',
        boxSizing: 'border-box' // Ensure padding is included in width/height
      }}
    >
      {/* Inner container to constrain content within padding boundaries */}
      <div style={{ width: '100%', height: '100%', boxSizing: 'border-box' }}>
        {children}
      </div>
    </div>
  );
});