'use client';

import React from 'react';

import { useParallax } from '@/app/hooks/useParallax';
import { type ParallaxImageContentBlock } from '@/app/types/ContentBlock';

import { BadgeOverlay, createBadgeConfigs } from './BadgeOverlay';
import {
  BaseContentBlockRender,
  type BaseContentBlockRendererProps,
} from './BaseContentBlockRenderer';
import cbStyles from './ContentBlockComponent.module.scss';

/**
 * Props for ParallaxImageContentBlockRenderer
 */
export interface ParallaxImageContentBlockRendererProps extends BaseContentBlockRendererProps {
  block: ParallaxImageContentBlock;
}

/**
 * Parallax-enabled image block renderer component
 *
 * Extends the BaseContentBlockRenderer with parallax scrolling effects
 * for cover images and other special image blocks. Uses the useParallax
 * hook in single-element mode for optimal performance.
 */
export function ParallaxImageRenderer({
  block,
  width,
  height,
  className = '',
  isMobile = false,
  onClick,
}: ParallaxImageContentBlockRendererProps): React.ReactElement {
  // Setup parallax effect for the background image
  // Single point of control for mobile/desktop speed differences
  const baseSpeed = block.parallaxSpeed || -0.1;
  const effectiveSpeed = isMobile ? baseSpeed * 0.8 : baseSpeed;

  const parallaxRef = useParallax({
    mode: 'single',
    speed: effectiveSpeed,
    selector: '.parallax-bg',
    enableParallax: block.enableParallax,
    threshold: 0.1,
    rootMargin: '50px',
    disableDeviceAttenuation: true, // Bypass useParallax mobile attenuation
  });

  const renderParallaxContent = (parallaxBlock: ParallaxImageContentBlock): React.ReactElement => {
    // Extract overlay and badge data
    const { overlayText, cardTypeBadge, dateBadge, imageUrlWeb, enableParallax } = parallaxBlock;

    // Check if parallax is enabled for this render
    const isParallaxEnabled = enableParallax;

    // Create the parallax background element with conditional styling
    const parallaxBackground = (
      <div
        className="parallax-bg"
        style={{
          position: 'absolute',
          top: isParallaxEnabled ? '-10%' : '0', // Normal positioning when parallax disabled
          left: isParallaxEnabled ? '-5%' : '0',
          right: isParallaxEnabled ? '-5%' : '0',
          bottom: isParallaxEnabled ? '-10%' : '0', // Normal positioning when parallax disabled
          backgroundImage: `url(${imageUrlWeb})`,
          backgroundSize: isParallaxEnabled ? '110%' : '100%', // Normal scaling when parallax disabled
          backgroundPosition: isParallaxEnabled ? '50% 100%' : '50% 80%', // Start at bottom when parallax enabled
          backgroundRepeat: 'no-repeat',
          willChange: isParallaxEnabled ? 'transform' : 'auto',
          cursor: onClick ? 'pointer' : 'default',
        }}
        onClick={onClick}
      />
    );

    // Create badge configurations
    const badges = createBadgeConfigs(cardTypeBadge, dateBadge);

    // Render content with parallax background and overlays
    return (
      <div
        ref={parallaxRef}
        className={cbStyles.imageWrapper}
        style={{
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          height: '100%',
        }}
      >
        {parallaxBackground}
        {overlayText && (
          <div className={cbStyles.textOverlay} style={{ zIndex: 2 }}>
            {overlayText}
          </div>
        )}
        <BadgeOverlay badges={badges} />
      </div>
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
      renderContent={() => renderParallaxContent(block)}
    />
  );
}
