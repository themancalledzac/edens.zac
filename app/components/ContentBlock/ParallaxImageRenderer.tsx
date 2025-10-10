'use client';

import Image from 'next/image';
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
  // Priority loading for above-the-fold images (LCP optimization)
  priority?: boolean;
  // Optional click handler for image interaction
  onClick?: () => void;
}

/**
 * Complete parallax image component with overlays and badges
 *
 * Renders a parallax-enabled image element with text overlays and badges.
 * Handles all parallax logic, overlay rendering, and badge positioning internally.
 * Self-contained component that consolidates all parallax-related functionality.
 *
 * Uses Next.js Image component for optimization and supports priority loading
 * for above-the-fold images to improve LCP (Largest Contentful Paint).
 */
export function ParallaxImageRenderer({
  block,
  blockType = 'contentBlock',
  cardTypeBadge,
  priority = false,
  onClick,
}: ParallaxImageContentBlockRendererProps): React.ReactElement {
  const { imageUrlWeb, overlayText, collectionDate, imageWidth, imageHeight } = block;
  const dateSimple = new Date(collectionDate || new Date()).toLocaleDateString();

  // Setup parallax effect for this image using defaults
  const parallaxRef = useParallax();

  // Complete parallax container with image, overlays, and badges
  return (
    <div
      ref={parallaxRef}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <Image
        src={imageUrlWeb}
        alt={overlayText || 'Parallax image'}
        width={imageWidth || 1200}
        height={imageHeight || 800}
        className={`parallax-bg ${variantStyles.parallaxImage}`}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
      />
      {overlayText && <div className={cbStyles.textOverlay}>{overlayText}</div>}
      <BadgeOverlay
        contentType={blockType}
        badgeValue={blockType === 'contentBlock' ? dateSimple : cardTypeBadge || ''}
      />
    </div>
  );
}
