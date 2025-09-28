import React from 'react';

import { type TextContentBlock } from '@/app/types/ContentBlock';

import {
  type BaseContentBlockRendererProps,
  BlockWrapper,
} from './BlockWrapper';
import cbStyles from './ContentBlockComponent.module.scss';

/**
 * Props for TextContentBlockRenderer
 */
export interface TextContentBlockRendererProps extends BaseContentBlockRendererProps {
  block: TextContentBlock;
}

/**
 * Specialized component for rendering text blocks with proper alignment
 * Extends BaseContentBlockRenderer for consistent behavior
 */
export function TextBlockRenderer({
  block,
  width,
  height,
  className = '',
  isMobile = false,
}: TextContentBlockRendererProps): React.ReactElement {
  const renderTextContent = (textBlock: TextContentBlock): React.ReactElement => {
    // Extract text content - use content field from proper type
    const displayText = textBlock.content;
    const isLeftAligned = textBlock.align === 'left';

    // Create the text content with proper styling and positioning
    return (
      <div className={cbStyles.blockContainer}>
        <div className={isLeftAligned ? cbStyles.blockInnerLeft : cbStyles.blockInner}>
            <span>{displayText}</span>
        </div>
      </div>
    );
  };

  return (
    <BlockWrapper
      block={block}
      width={width}
      height={height}
      className={className}
      isMobile={isMobile}
      renderContent={() => renderTextContent(block)}
    />
  );
}
