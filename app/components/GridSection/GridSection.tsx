'use client';

import React from 'react';

import { ParallaxImageRenderer } from '@/app/components/ContentBlock/ParallaxImageRenderer';
import pageStyles from '@/app/page.module.scss';
import { type HomeCardModel } from '@/app/types/HomeCardModel';
import { buildParallaxImageFromHomeCard } from '@/app/utils/parallaxImageUtils';

interface GridSectionProps {
  card: HomeCardModel;
  desktopRowIndex: number;
  mobileRowIndex: number;
  priority?: boolean; // For LCP optimization of above-the-fold images
}

/**
 * Grid Section
 *
 * Individual card component with responsive design, parallax background effects,
 * and dynamic routing based on card type. Adapts layout and animations based
 * on screen size with debounced resize handling for performance.
 *
 * @dependencies
 * - Next.js Link for client-side navigation
 * - React hooks for state and lifecycle management
 * - HomeCardModel type for card data structure
 * - useParallax hook for scroll-based background animations
 * - page.module.scss for grid styling
 *
 * @param props - Component props object containing:
 * @param props.card - Home card data including title, image, and routing info
 * @param props.desktopRowIndex - Row position for desktop layout (2 columns)
 * @param props.mobileRowIndex - Row position for mobile layout (1 column)
 * @returns Client component rendering interactive card with parallax effects
 */
export function GridSection({
  card,
  desktopRowIndex: _desktopRowIndex,
  mobileRowIndex: _mobileRowIndex,
  priority = false,
}: GridSectionProps) {
  // Convert HomeCardModel to ParallaxImageContentBlock
  const parallaxBlock = buildParallaxImageFromHomeCard(card);

  const getHref = () => {
    if (card.cardType === 'catalog') {
      return `/catalog/${card.slug}`;
    } else if (card.cardType === 'blog') {
      return `/blog/${card.slug}`;
    } else {
      return `/${card.cardType}/${card.slug}`;
    }
  };

  return (
    <div className={pageStyles.gridSection}>
      <a href={getHref()}>
        <ParallaxImageRenderer
          block={parallaxBlock}
          blockType="collection"
          cardTypeBadge={card.cardType?.toUpperCase()}
          priority={priority}
        />
      </a>
    </div>
  );
}
