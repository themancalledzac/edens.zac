'use client';

import React from 'react';

import { getParallaxConfig } from '@/app/constants/parallax';
import { useParallax } from '@/app/hooks/useParallax';
import { type ParallaxImageContentBlock } from '@/app/types/ContentBlock';

import { type BadgeContentType, BadgeOverlay } from './BadgeOverlay';
import cbStyles from './ContentBlockComponent.module.scss';
import variantStyles from './ParallaxImageRenderer.module.scss';

/**
 * Get dynamic image styles for parallax behavior
 * Only returns styles that need to be dynamic based on props
 */
function getImageStyles(enableParallax: boolean) {
  return {
    willChange: enableParallax ? 'transform' : 'auto',
  };
}

/**
 * Props for ParallaxImageRenderer - complete parallax image component with overlays
 * Handles all parallax logic, text overlays, and badge rendering internally
 */
export interface ParallaxImageContentBlockRendererProps {
  block: ParallaxImageContentBlock;
  blockType?: BadgeContentType;
  // Optional props for badge customization
  cardTypeBadge?: string;
  dateBadge?: string;
}

/**
 * Complete parallax image component with overlays and badges
 *
 * Renders a parallax-enabled img element with text overlays and badges.
 * Handles all parallax logic, overlay rendering, and badge positioning internally.
 * Self-contained component that consolidates all parallax-related functionality.
 */
export function ParallaxImageRenderer({
  block,
  blockType = 'contentBlock',
  cardTypeBadge,
  dateBadge,
}: ParallaxImageContentBlockRendererProps): React.ReactElement {
  const { imageUrlWeb, enableParallax, overlayText, parallaxSpeed, collectionDate } = block;
  const dateSimple = new Date(collectionDate || new Date()).toLocaleDateString();

  // Get complete configuration for this block type
  const config = getParallaxConfig(parallaxSpeed, enableParallax);

  // Setup parallax effect for this image
  const parallaxRef = useParallax(config);

  // Get optimized image styles
  const imageStyles = getImageStyles(enableParallax);
  console.log(dateBadge);

  // Complete parallax container with image, overlays, and badges
  return (
    <div ref={parallaxRef}>
      <img
        src={imageUrlWeb}
        alt={overlayText || 'Parallax image'}
        className={`parallax-bg ${variantStyles.parallaxImage}`}
        style={imageStyles}
        loading="lazy"
        decoding="async"
      />
      {overlayText && <div className={cbStyles.textOverlay}>{overlayText}</div>}
      <BadgeOverlay
        contentType={blockType}
        badgeValue={blockType === 'contentBlock' ? dateSimple : cardTypeBadge || ''}
      />
    </div>
  );
}
