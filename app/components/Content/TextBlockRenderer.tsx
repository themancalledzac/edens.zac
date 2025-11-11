import React from 'react';

import { type ContentTextModel } from '@/app/types/Content';

import cbStyles from './ContentComponent.module.scss';
import {
  type BaseContentRendererProps,
  ContentWrapper,
} from './ContentWrapper';

/**
 * Props for TextContentBlockRenderer
 */
export interface TextContentBlockRendererProps extends BaseContentRendererProps {
  block: ContentTextModel;
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
  const renderTextContent = (textBlock: ContentTextModel): React.ReactElement => {
    // Extract text content - use content field from proper type
    const displayText = textBlock.content;
    const isLeftAligned = textBlock.align === 'left';

    // Split content by newlines to render each line as a separate div
    const lines = displayText.split('\n');

    // Create the text content with proper styling and positioning
    return (
      <div className={cbStyles.blockContainer}>
        <div className={isLeftAligned ? cbStyles.blockInnerLeft : cbStyles.blockInner}>
          {lines.map((line, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={index} style={{ width: '100%' }}>{line}</div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <ContentWrapper
      block={block}
      width={width}
      height={height}
      className={className}
      isMobile={isMobile}
      renderContent={() => renderTextContent(block)}
    />
  );
}
