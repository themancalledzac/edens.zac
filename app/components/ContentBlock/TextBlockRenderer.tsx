import React from 'react';

import { type NormalizedContentBlock } from '@/app/utils/imageUtils';

import { BadgeOverlay, createBadgeConfigs } from './BadgeOverlay';
import { BlockWrapper } from './BlockWrapper';
import cbStyles from './ContentBlockComponent.module.scss';
import { type EnhancedOriginalBlock, type TextBlockRendererProps } from './types';

/**
 * Utility function to safely extract original block data
 */
function getOriginalBlock(block: NormalizedContentBlock): EnhancedOriginalBlock {
  return (block.originalBlock as EnhancedOriginalBlock) || {};
}

/**
 * Determine the appropriate CSS class based on text alignment and badge presence
 */
function getTextBlockClass(
  isLeftAligned: boolean,
  hasBadge: boolean
): string {
  if (!isLeftAligned) {
    return cbStyles.blockInner || ''; // default centered
  }

  return (hasBadge ? cbStyles.blockInnerLeftWithBadge : cbStyles.blockInnerLeft) || '';
}

/**
 * Specialized component for rendering text blocks with badges and proper alignment
 */
export function TextBlockRenderer({
  block,
  width,
  height,
  className,
  isMobile = false
}: TextBlockRendererProps): React.ReactElement {
  const originalBlock = getOriginalBlock(block);

  // Extract text content and configuration
  const previewText = (originalBlock.text ||
                      originalBlock.content ||
                      originalBlock.title ||
                      'Text/Code Block') as string;

  const isLeftAligned = originalBlock.align === 'left';
  const { dateBadge } = originalBlock;
  const hasBadge = !!dateBadge;

  // Create badge configurations
  const badges = createBadgeConfigs(undefined, dateBadge);

  // Determine the appropriate inner class
  const innerClass = getTextBlockClass(isLeftAligned, hasBadge);

  // Create the text content with proper styling and positioning
  const content = (
    <div
      className={cbStyles.blockContainer}
      style={{ position: hasBadge ? 'relative' : undefined }}
    >
      <BadgeOverlay badges={badges} />
      <div className={innerClass}>
        <span>{previewText}</span>
      </div>
    </div>
  );

  return (
    <BlockWrapper
      width={width}
      height={height}
      className={className}
      isMobile={isMobile}
    >
      {content}
    </BlockWrapper>
  );
}