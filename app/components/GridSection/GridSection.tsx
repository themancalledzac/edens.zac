'use client';

import React from 'react';

import { ParallaxImageRenderer } from '@/app/components/Content/ParallaxImageRenderer';
import pageStyles from '@/app/page.module.scss';
import { type AnyContentModel } from '@/app/types/Content';
import { buildParallaxImageFromContent } from '@/app/utils/parallaxImageUtils';

interface GridSectionProps {
  content: AnyContentModel;
  desktopRowIndex: number;
  mobileRowIndex: number;
  priority?: boolean; // For LCP optimization of above-the-fold images
}

/**
 * Grid Section
 *
 * Individual card component with responsive design, parallax background effects,
 * and dynamic routing based on content type. Adapts layout and animations based
 * on screen size with debounced resize handling for performance.
 *
 * @dependencies
 * - Next.js Link for client-side navigation
 * - React hooks for state and lifecycle management
 * - AnyContentModel type for content data structure
 * - useParallax hook for scroll-based background animations
 * - page.module.scss for grid styling
 *
 * @param props - Component props object containing:
 * @param props.content - Content block data (CollectionContentModel, ImageContentModel, etc.)
 * @param props.desktopRowIndex - Row position for desktop layout (2 columns)
 * @param props.mobileRowIndex - Row position for mobile layout (1 column)
 * @returns Client component rendering interactive card with parallax effects
 */
export function GridSection({
  content,
  desktopRowIndex: _desktopRowIndex,
  mobileRowIndex: _mobileRowIndex,
  priority = false,
}: GridSectionProps) {
  // Convert content to ParallaxImageContentBlock
  const parallaxBlock = buildParallaxImageFromContent(content);

  const getHref = () => {
    // Handle routing based on content type
    if (content.contentType === 'COLLECTION') {
      // Map CollectionType enum values to URL paths
      switch (content.collectionType) {
        case 'BLOG':
          return `/blogs/${content.slug}`;
        case 'PORTFOLIO':
          return `/portfolio/${content.slug}`;
        case 'ART_GALLERY':
          return `/art-gallery/${content.slug}`;
        case 'CLIENT_GALLERY':
          return `/client-gallery/${content.slug}`;
        default:
          // Fallback to lowercase version of the type
          return `/${content.collectionType.toLowerCase()}/${content.slug}`;
      }
    }

    // For IMAGE content, link to the image detail page (if applicable)
    // TODO: Define routing strategy for standalone images
    return '#';
  };

  const getCardTypeBadge = () => {
    if (content.contentType === 'COLLECTION') {
      return content.collectionType;
    }
    return content.contentType;
  };

  return (
    <div className={pageStyles.gridSection}>
      <a href={getHref()}>
        <ParallaxImageRenderer
          content={parallaxBlock}
          contentType={content.contentType === 'COLLECTION' ? 'collection' : 'content'}
          cardTypeBadge={getCardTypeBadge()}
          priority={priority}
        />
      </a>
    </div>
  );
}
