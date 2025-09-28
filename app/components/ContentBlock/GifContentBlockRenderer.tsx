import Image from 'next/image';
import React from 'react';

import { type GifContentBlock } from '@/app/types/ContentBlock';

import { BadgeOverlay } from './BadgeOverlay';
import {
  type BaseContentBlockRendererProps,
  BlockWrapper,
} from './BlockWrapper';
import cbStyles from './ContentBlockComponent.module.scss';

/**
 * Props for GifContentBlockRenderer
 */
export interface GifContentBlockRendererProps extends BaseContentBlockRendererProps {
  block: GifContentBlock;
}

/**
 * Specialized component for rendering GIF blocks with overlays and badges
 * Extends BaseContentBlockRenderer for consistent behavior
 */
export function GifContentBlockRenderer({
  block,
  width,
  height,
  className = '',
  isMobile = false,
  onClick,
}: GifContentBlockRendererProps): React.ReactElement {
  const renderGifContent = (gifBlock: GifContentBlock): React.ReactElement => {
    const alt = gifBlock.alt || gifBlock.title || gifBlock.caption || 'animated gif';

    // Extract overlay and badge data
    const { overlayText, cardTypeBadge, dateBadge, imageUrlWeb } = gifBlock;
    const hasOverlays = !!(overlayText || cardTypeBadge || dateBadge);

    // Configure image styling based on mobile/desktop
    const imageStyle: React.CSSProperties = {
      cursor: onClick ? 'pointer' : 'default',
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block',
      ...(isMobile
        ? {
            height: 'auto',
          }
        : {}),
    };

    // Create the base gif element (using Image component for optimization)
    const gifElement = (
      <Image
        src={imageUrlWeb}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        style={imageStyle}
        onClick={onClick}
        unoptimized // GIFs need to remain unoptimized to preserve animation
      />
    );

    // Render content based on whether overlays are needed
    return hasOverlays ? (
      <div className={cbStyles.imageWrapper}>
        {gifElement}
        {overlayText && <div className={cbStyles.textOverlay}>{overlayText}</div>}
        <BadgeOverlay contentType="contentBlock" badgeValue={null} />
      </div>
    ) : (
      gifElement
    );
  };

  return (
    <BlockWrapper
      block={block}
      width={width}
      height={height}
      className={className}
      isMobile={isMobile}
      onClick={onClick}
      renderContent={() => renderGifContent(block)}
    />
  );
}
