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
 * Determine the appropriate CSS class based on text alignment
 */
function getTextBlockClass(isLeftAligned: boolean): string {
  if (!isLeftAligned) {
    return cbStyles.blockInner || ''; // default centered
  }

  return cbStyles.blockInnerLeft || '';
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
    const displayText = textBlock.content || textBlock.title || 'Text Block';
    const isLeftAligned = textBlock.align === 'left';
    const { format } = textBlock;

    // Determine the appropriate inner class
    const innerClass = getTextBlockClass(isLeftAligned);

    // Create the text content with proper styling and positioning
    return (
      <div className={cbStyles.blockContainer}>
        <div className={innerClass}>
          {format === 'html' ? (
            <div dangerouslySetInnerHTML={{ __html: displayText }} />
          ) : (format === 'markdown' ? (
            // TODO: Add markdown parser when needed
            <span>{displayText}</span>
          ) : (
            <span>{displayText}</span>
          ))}
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
