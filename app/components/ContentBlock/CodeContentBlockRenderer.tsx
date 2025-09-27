import React from 'react';

import { type CodeContentBlock } from '@/app/types/ContentBlock';

import { BaseContentBlockRender, type BaseContentBlockRendererProps } from './BaseContentBlockRenderer';
import cbStyles from './ContentBlockComponent.module.scss';

/**
 * Props for CodeContentBlockRenderer
 */
export interface CodeContentBlockRendererProps extends BaseContentBlockRendererProps {
  block: CodeContentBlock;
}

/**
 * Specialized component for rendering code blocks with syntax highlighting
 * Extends BaseContentBlockRenderer for consistent behavior
 */
export function CodeContentBlockRenderer({
  block,
  width,
  height,
  className = '',
  isMobile = false
}: CodeContentBlockRendererProps): React.ReactElement {

  const renderCodeContent = (codeBlock: CodeContentBlock): React.ReactElement => {
    const { filename, content, language } = codeBlock;

    // Create the code content with syntax highlighting
    return (
      <div className={cbStyles.blockContainer}>
        <div className={`${cbStyles.blockInnerLeft || ''} ${cbStyles.codeBlock || ''}`}>
          {filename && (
            <div className={cbStyles.codeFilename || ''}>
              {filename}
            </div>
          )}
          <pre className={`language-${language || 'plaintext'}`}>
            <code>{content}</code>
          </pre>
        </div>
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
      renderContent={() => renderCodeContent(block)}
    />
  );
}