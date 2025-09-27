import Image from 'next/image';
import React from 'react';

import { type ImageContentBlock } from '@/app/types/ContentBlock';

import { BadgeOverlay } from './BadgeOverlay';
import {
  BaseContentBlockRender,
  type BaseContentBlockRendererProps,
} from './BaseContentBlockRenderer';
import cbStyles from './ContentBlockComponent.module.scss';

/**
 * Props for ImageContentBlockRenderer
 */
export interface ImageContentBlockRendererProps extends BaseContentBlockRendererProps {
  block: ImageContentBlock;
}

/**
 * Specialized component for rendering image blocks with overlays and badges
 * Extends BaseContentBlockRenderer for consistent behavior
 */
export function ImageContentBlockRenderer({
  block,
  width,
  height,
  className = '',
  isMobile = false,
  onClick,
}: ImageContentBlockRendererProps): React.ReactElement {
  const renderImageContent = (imageBlock: ImageContentBlock): React.ReactElement => {
    const alt = imageBlock.title || imageBlock.caption || 'image content';

    // Extract overlay and badge data
    const { overlayText, cardTypeBadge, dateBadge, imageUrlWeb, imageWidth, imageHeight } =
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
        src={imageUrlWeb}
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
        <BadgeOverlay contentType="contentBlock" badgeValue={null} />
      </div>
    ) : (
      imageElement
    );
  };

  return (
    <BaseContentBlockRender
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
