import React from 'react';

import cbStyles from '@/app/components/ContentBlock/ContentBlockComponent.module.scss';

import { type BlockWrapperProps } from './types';

/**
 * Unified wrapper component for all block types (images, text, etc.)
 * Provides consistent sizing, padding, and click handling
 */
export function BlockWrapper({
  children,
  width,
  height,
  className,
  isMobile = false,
  onClick,
  hasOverlays = false
}: BlockWrapperProps): React.ReactElement {
  return (
    <div
      className={`${className} ${hasOverlays ? cbStyles.imageContainer : ''}`}
      onClick={onClick}
      style={{
        // Skip fixed dimensions on mobile to allow responsive behavior
        ...(isMobile ? {} : { width, height }),
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
}