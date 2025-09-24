import Image from 'next/image';
import React from 'react';

import { BadgeOverlay, createBadgeConfigs } from './BadgeOverlay';
import { BlockWrapper } from './BlockWrapper';
import cbStyles from './ContentBlockComponent.module.scss';
import { type ImageBlockRendererProps } from './types';
import { getOriginalBlock } from './utils';

/**
 * Specialized component for rendering image blocks with overlays and badges
 */
export function ImageBlockRenderer({
  block,
  width,
  height,
  className,
  isMobile = false,
  onClick
}: ImageBlockRendererProps): React.ReactElement {
  const originalBlock = getOriginalBlock(block);
  const alt = originalBlock.title || 'content';

  // Extract overlay and badge data
  const { overlayText, cardTypeBadge, dateBadge } = originalBlock;
  const hasOverlays = !!(overlayText || cardTypeBadge || dateBadge);

  // Configure image styling based on mobile/desktop
  const imageStyle: React.CSSProperties = {
    cursor: onClick ? 'pointer' : 'default',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    ...(isMobile ? {
      height: 'auto'
    } : {})
  };

  // Create the base image element
  const imageElement = (
    <Image
      src={block.imageUrlWeb!}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      style={imageStyle}
      onClick={onClick}
    />
  );

  // Create badge configurations
  const badges = createBadgeConfigs(cardTypeBadge, dateBadge);

  // Render content based on whether overlays are needed
  const content = hasOverlays ? (
    <div className={cbStyles.imageWrapper}>
      {imageElement}
      {overlayText && (
        <div className={cbStyles.textOverlay}>
          {overlayText}
        </div>
      )}
      <BadgeOverlay badges={badges} />
    </div>
  ) : imageElement;

  return (
    <BlockWrapper
      width={width}
      height={height}
      className={className}
      isMobile={isMobile}
      onClick={onClick}
      hasOverlays={hasOverlays}
    >
      {content}
    </BlockWrapper>
  );
}