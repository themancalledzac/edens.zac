'use client';

import React from 'react';

import { useParallax } from '@/app/hooks/useParallax';
import { type ParallaxImageContentBlock } from '@/app/types/ContentBlock';

import { BadgeOverlay, createBadgeConfigs } from './BadgeOverlay';
import cbStyles from './ContentBlockComponent.module.scss';
import variantStyles from './ParallaxImageRenderer.module.scss';

/**
 * Variant types for different parallax image use cases
 */
export type ParallaxImageBlockType = 'home' | 'collection';

/**
 * Props for ParallaxImageRenderer - complete parallax image component with overlays
 * Handles all parallax logic, text overlays, and badge rendering internally
 */
export interface ParallaxImageContentBlockRendererProps {
  block: ParallaxImageContentBlock;
  blockType?: ParallaxImageBlockType;
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
  blockType = 'collection',
  cardTypeBadge,
  dateBadge
}: ParallaxImageContentBlockRendererProps): React.ReactElement {

  const { imageUrlWeb, enableParallax, overlayText, parallaxSpeed } = block;

  // Determine badge positioning based on block type
  const isHomeGrid = blockType === 'home';

  // Setup parallax effect for this image
  const parallaxRef = useParallax({
    mode: 'single',
    speed: parallaxSpeed || -0.1,
    selector: '.parallax-bg',
    enableParallax: enableParallax,
    threshold: 0.1,
    rootMargin: '50px',
  });

  // Create badge configurations - use props if provided, otherwise fall back to block data
  // For home grid, position cardType badge on top-right instead of top-left
  const badges = isHomeGrid ?
    // Home grid: swap parameters to move cardType to top-right position
    createBadgeConfigs(
      undefined, // No badge on top-left for home grid
      cardTypeBadge || block.cardTypeBadge // Move cardType to top-right position
    ) :
    // Regular positioning for collection pages
    createBadgeConfigs(
      cardTypeBadge || block.cardTypeBadge,
      dateBadge || block.dateBadge
    );

  // Unified image styles for consistent parallax behavior
  const imageStyles = {
    display: 'block' as const,
    objectFit: 'cover' as const,
    willChange: enableParallax ? 'transform' : 'auto',
    width: '100%',
    height: '130%', // 30% extra content for parallax movement
    position: 'absolute' as const,
    top: '-15%', // Start positioned higher to align bottom properly
    left: '0',
  };

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
      {overlayText && (
        <div className={cbStyles.textOverlay}>
          {overlayText}
        </div>
      )}
      <BadgeOverlay badges={badges} />
    </div>
  );
}
