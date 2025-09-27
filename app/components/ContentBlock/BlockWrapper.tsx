import React, { forwardRef } from 'react';

import { type AnyContentBlock } from '@/app/types/ContentBlock';

import cbStyles from './ContentBlockComponent.module.scss';

export interface BaseContentBlockRendererProps {
  block: AnyContentBlock;
  width: number;
  height: number;
  className?: string;
  isMobile?: boolean;
  onClick?: () => void;
}

export interface BlockWrapperProps {
  children?: React.ReactNode;
  width: number;
  height: number;
  className: string;
  isMobile?: boolean;
  onClick?: () => void;
  hasOverlays?: boolean;
  isTextBlock?: boolean;
  block?: AnyContentBlock;
  renderContent?: (block: AnyContentBlock) => React.ReactElement;
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
  hasOverlays,
  isTextBlock,
  // BaseContentBlockRenderer props
  block,
  renderContent
}, ref) {
  // Auto-detect hasOverlays and isTextBlock if block is provided
  const finalHasOverlays = hasOverlays ?? (block ? !!(block.overlayText || block.cardTypeBadge || block.dateBadge) : false);
  const finalIsTextBlock = isTextBlock ?? (block ? block.blockType === 'TEXT' : false);

  // Calculate aspect ratio for mobile responsive sizing
  const aspectRatio = width / height;

  // Determine content to render
  const content = renderContent && block ? renderContent(block) : children;

  return (
    <div
      ref={ref}
      className={`${className} ${finalHasOverlays ? cbStyles.imageContainer : ''}`}
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