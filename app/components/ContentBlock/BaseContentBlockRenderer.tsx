import React from 'react';

import { type AnyContentBlock } from '@/app/types/ContentBlock';

import { BlockWrapper } from './BlockWrapper';

/**
 * Base props shared by all ContentBlock renderers
 */
export interface BaseContentBlockRendererProps {
  block: AnyContentBlock;
  width: number;
  height: number;
  className?: string;
  isMobile?: boolean;
  onClick?: () => void;
}

/**
 * Functional base renderer for ContentBlocks
 * Provides consistent BlockWrapper with shared overlay detection
 */
export interface BaseContentBlockRenderProps extends BaseContentBlockRendererProps {
  renderContent: (block: AnyContentBlock) => React.ReactElement;
}

export function BaseContentBlockRender({
  block,
  width,
  height,
  className = '',
  isMobile = false,
  onClick,
  renderContent
}: BaseContentBlockRenderProps): React.ReactElement {

  const hasOverlays = !!(block.overlayText || block.cardTypeBadge || block.dateBadge);
  const isTextBlock = block.blockType === 'TEXT';

  return (
    <BlockWrapper
      width={width}
      height={height}
      className={className}
      isMobile={isMobile}
      onClick={onClick}
      hasOverlays={hasOverlays}
      isTextBlock={isTextBlock}
    >
      {renderContent(block)}
    </BlockWrapper>
  );
}