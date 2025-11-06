import React, { forwardRef } from 'react';

import { type AnyContentModel } from '@/app/types/Content';

import cbStyles from './ContentComponent.module.scss';

export interface BaseContentRendererProps {
  block: AnyContentModel;
  width: number;
  height: number;
  className?: string;
  isMobile?: boolean;
  onClick?: () => void;
}

export interface ContentWrapperProps {
  children?: React.ReactNode;
  width: number;
  height: number;
  className: string;
  isMobile?: boolean;
  onClick?: () => void;
  hasOverlays?: boolean;
  isTextBlock?: boolean;
  block?: AnyContentModel;
  renderContent?: (block: AnyContentModel) => React.ReactElement;
}

/**
 * Unified wrapper component for all block types (images, text, etc.)
 * Provides consistent sizing, padding, and click handling
 * Supports ref forwarding for parallax and other interactions
 */
export const ContentWrapper = forwardRef<HTMLDivElement, ContentWrapperProps>(function BlockWrapper({
  children,
  width,
  height,
  className,
  isMobile = false,
  onClick,
  hasOverlays = false,
  isTextBlock,
  // BaseContentBlockRenderer props
  block,
  renderContent
}, ref) {
  // Auto-detect hasOverlays and isTextBlock if block is provided
  const finalHasOverlays = hasOverlays ?? (block ? !!(block.overlayText || block.cardTypeBadge || block.dateBadge) : false);
  const finalIsTextBlock = isTextBlock ?? (block ? block.contentType === 'TEXT' : false);

  // Calculate aspect ratio for mobile responsive sizing
  const aspectRatio = width / height;

  // Determine content to render
  const content = renderContent && block ? renderContent(block) : children;

  return (
    <div
      ref={ref}
      className={className}
      onClick={onClick}
      style={{
        // Text blocks on mobile: no fixed dimensions (auto height)
        // Image blocks with overlays on mobile: full width with aspect ratio
        // Desktop: calculated width and height for all blocks
        // Mobile without overlays: no fixed dimensions (responsive)
        width: (() => {
          if (!isMobile) return width;
          if (finalIsTextBlock) return;
          return finalHasOverlays ? '100%' : undefined;
        })(),
        height: (() => {
          if (!isMobile) return height;
          return;
        })(),
        aspectRatio: isMobile && finalHasOverlays && !finalIsTextBlock ? aspectRatio : undefined,
        cursor: onClick ? 'pointer' : 'default',
        boxSizing: 'border-box' // Ensure padding is included in width/height
      }}
    >
      {/* Inner container to constrain content within padding boundaries */}
      <div style={{ width: '100%', height: '100%', boxSizing: 'border-box' }}>
        {finalHasOverlays ? (
          // Add imageWrapper for proper overlay positioning on images with overlays
          <div className={cbStyles.imageWrapper}>
            {content}
          </div>
        ) : (
          content
        )}
      </div>
    </div>
  );
});