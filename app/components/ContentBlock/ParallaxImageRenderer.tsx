'use client';

import React from 'react';

import { useParallax } from '@/app/hooks/useParallax';
import { type ParallaxImageContentBlock } from '@/app/types/ContentBlock';

import { type BadgeContentType, BadgeOverlay } from './BadgeOverlay';
import cbStyles from './ContentBlockComponent.module.scss';
import variantStyles from './ParallaxImageRenderer.module.scss';


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
}: ParallaxImageContentBlockRendererProps): React.ReactElement {
  const { imageUrlWeb, overlayText, collectionDate } = block;
  const dateSimple = new Date(collectionDate || new Date()).toLocaleDateString();

  // Setup parallax effect for this image using defaults
  const parallaxRef = useParallax();

  // Complete parallax container with image, overlays, and badges
  return (
    <div ref={parallaxRef}>
      <img
        src={imageUrlWeb}
        alt={overlayText || 'Parallax image'}
        className={`parallax-bg ${variantStyles.parallaxImage}`}
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
