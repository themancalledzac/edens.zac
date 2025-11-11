import Image from 'next/image';
import React from 'react';

import { type ContentImageModel } from '@/app/types/Content';

import { BadgeOverlay } from './BadgeOverlay';
import cbStyles from './ContentComponent.module.scss';
import {
  type BaseContentRendererProps,
  ContentWrapper,
} from './ContentWrapper';

/**
 * Props for ImageContentBlockRenderer
 */
export interface ContentImageRendererProps extends BaseContentRendererProps {
  block: ContentImageModel;
}

/**
 * Specialized component for rendering image blocks with overlays and badges
 * Extends BaseContentBlockRenderer for consistent behavior
 */
export function ContentImageRenderer({
  block,
  width,
  height,
  className = '',
  isMobile = false,
  onClick,
}: ContentImageRendererProps): React.ReactElement {
  const renderImageContent = (imageBlock: ContentImageModel): React.ReactElement => {
    const alt = imageBlock.title || imageBlock.caption || 'image content';

    // Extract overlay and badge data
    const { overlayText, cardTypeBadge, dateBadge, imageUrl, imageWidth, imageHeight } =
      imageBlock;
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

    // Create the base image element
    const imageElement = (
      <Image
        src={imageUrl}
        alt={alt}
        width={imageWidth || width}
        height={imageHeight || height}
        loading="lazy"
        style={imageStyle}
        onClick={onClick}
      />
    );

    // Render content based on whether overlays are needed
    return hasOverlays ? (
      <div className={cbStyles.imageWrapper}>
        {imageElement}
        {overlayText && <div className={cbStyles.textOverlay}>{overlayText}</div>}
        <BadgeOverlay contentType="content" badgeValue={null} />
      </div>
    ) : (
      imageElement
    );
  };

  return (
    <ContentWrapper
      block={block}
      width={width}
      height={height}
      className={className}
      isMobile={isMobile}
      onClick={onClick}
      renderContent={() => renderImageContent(block)}
    />
  );
}
