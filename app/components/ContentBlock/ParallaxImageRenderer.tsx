'use client';

import React from 'react';

import { useParallax } from '@/app/hooks/useParallax';
import { type ParallaxImageContentBlock } from '@/app/types/ContentBlock';

import variantStyles from './ParallaxImageRenderer.module.scss';

/**
 * Variant types for different parallax image use cases
 */
export type ParallaxImageVariant = 'home-grid' | 'content-block';

/**
 * Props for ParallaxImageRenderer - pure parallax image that fills its container
 * All layout, sizing, and overlay logic handled by parent components
 */
export interface ParallaxImageContentBlockRendererProps {
  block: ParallaxImageContentBlock;
  className?: string;
  parallaxRef?: React.RefObject<HTMLDivElement>;
}

/**
 * Pure parallax image component that fills its container
 *
 * Renders a parallax-enabled img element that adapts to any container size.
 * All layout, sizing, overlays, and click handling managed by parent components.
 * Applies proper scaling and positioning for parallax effect.
 */
export function ParallaxImageRenderer({
  block,
  className = '',
  parallaxRef
}: ParallaxImageContentBlockRendererProps): React.ReactElement {

  const { imageUrlWeb, enableParallax, overlayText } = block;

  // Determine if this is likely a home grid image based on className
  const isGridBackground = className.includes('gridBackground');

  // Calculate IMG sizing and positioning for parallax
  const getImageStyles = () => {
    const baseStyles = {
      display: 'block' as const,
      objectFit: 'cover' as const,
      willChange: enableParallax ? 'transform' : 'auto',
    };

    if (isGridBackground) {
      // Grid images need extra content for parallax movement
      // Use approach similar to original: more scaling on mobile, positioning on desktop
      return {
        ...baseStyles,
        width: '100%',
        height: '130%', // 30% extra content for parallax movement
        position: 'absolute' as const,
        top: '-15%', // Start positioned higher to align bottom properly
        left: '0',
        // Additional mobile scaling will be handled by transform during parallax
      };
    } else {
      // Collection images - use same approach as grid for consistent parallax
      return {
        ...baseStyles,
        width: '100%',
        height: '130%', // 30% extra content for parallax movement like grid images
        position: 'absolute' as const,
        top: '-15%', // Start positioned higher to align bottom properly
        left: '0',
      };
    }
  };

  // Pure parallax IMG element that fills its container
  // Note: parallaxRef should be attached to parent container by the caller
  return (
    <img
      src={imageUrlWeb}
      alt={overlayText || 'Parallax image'}
      className={`parallax-bg ${variantStyles.parallaxImage} ${className}`}
      style={getImageStyles()}
      loading="lazy"
      decoding="async"
    />
  );
}
