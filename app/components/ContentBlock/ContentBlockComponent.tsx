'use client';

import React, { useMemo } from 'react';

import { type AnyContentBlock } from '@/app/types/ContentBlock';
import { processContentBlocksForDisplay } from '@/app/utils/contentBlockLayout';
import {
  isCodeBlock,
  isGifBlock,
  isImageBlock,
  isParallaxImageBlock,
  isTextBlock,
} from '@/app/utils/contentBlockTypeGuards';

import { CodeContentBlockRenderer } from './CodeContentBlockRenderer';
import cbStyles from './ContentBlockComponent.module.scss';
import { GifContentBlockRenderer } from './GifContentBlockRenderer';
import { ImageContentBlockRenderer } from './ImageBlockRenderer';
import { getPositionStyle } from './index';
import { ParallaxImageRenderer } from './ParallaxImageRenderer';
import { TextBlockRenderer } from './TextBlockRenderer';

export type ContentBlockDisplayOptions = {
  chunkSize: number;
};

export type ContentBlockComponentProps = {
  blocks: AnyContentBlock[];
  componentWidth: number;
  isMobile: boolean;
  options?: Partial<ContentBlockDisplayOptions>;
};

const DEFAULT_OPTIONS: ContentBlockDisplayOptions = {
  chunkSize: 2,
};

/**
 * Content Block Component
 *
 * High-performance content rendering system that processes and displays
 * mixed content blocks (images, text, etc.) in optimized responsive layouts.
 * Features memoized calculations, responsive chunking, and type-safe specialized renderers.
 */
export default function ContentBlockComponent(props: ContentBlockComponentProps) {
  const { blocks, componentWidth, isMobile, options = {} } = props;

  const { chunkSize } = { ...DEFAULT_OPTIONS, ...options };

  // Memoize layout calculations to prevent unnecessary recalculations
  const rows = useMemo(() => {
    if (!blocks || blocks.length === 0 || !componentWidth) {
      return [];
    }

    try {
      return processContentBlocksForDisplay(blocks, componentWidth, chunkSize);
    } catch (error) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('ContentBlockComponent sizing error:', error);
      }
      return [];
    }
  }, [blocks, componentWidth, chunkSize]);

  // Early return for empty state
  if (rows.length === 0) return <div />;

  return (
    <div className={cbStyles.wrapper}>
      <div className={cbStyles.inner} style={{ width: '100%' }}>
        {rows.map((row, _rowIndex) => {
          const totalInRow = row.length;

          return (
            <div
              key={`row-${row.map(item => item.block.id).join('-')}`}
              className={isMobile ? cbStyles.rowMobile : cbStyles.row}
            >
              {row.map((item, index) => {
                const className = getPositionStyle(index, totalInRow);
                const width = Math.round(item.width);
                const height = Math.round(item.height);
                const block = item.block;

                // Type-safe dispatching to appropriate renderer
                const baseProps = { key: block.id, width, height, className, isMobile };

                // Renderer lookup map - check most specific types first
                if (isParallaxImageBlock(block)) {

                  console.log(block.collectionDate);
                  console.log(JSON.stringify(block));
                  // Handle parallax image with proper container structure for collections
                  return (
                    <div
                      key={block.id}
                      className={`${className} ${cbStyles.imageContainer}`}
                      style={{
                        width: isMobile ? '100%' : width,
                        height: isMobile ? 'auto' : height,
                        aspectRatio: isMobile ? width / height : undefined,
                        cursor: 'default',
                        boxSizing: 'border-box',
                        position: 'relative',
                      }}
                    >
                      <div
                        className={cbStyles.imageWrapper}
                        style={{
                          width: '100%',
                          height: '100%',
                          boxSizing: 'border-box',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        <ParallaxImageRenderer
                          block={block}
                          blockType="contentBlock"
                          cardTypeBadge={block.cardTypeBadge}
                          dateBadge={block.dateBadge}
                        />
                      </div>
                    </div>
                  );
                }
                if (isImageBlock(block))
                  return <ImageContentBlockRenderer {...baseProps} block={block} />;
                if (isGifBlock(block))
                  return <GifContentBlockRenderer {...baseProps} block={block} />;
                if (isCodeBlock(block))
                  return <CodeContentBlockRenderer {...baseProps} block={block} />;
                if (isTextBlock(block)) return <TextBlockRenderer {...baseProps} block={block} />;

                // Fallback for unknown block types
                console.warn(
                  'Unknown block type:',
                  (block as AnyContentBlock).blockType,
                  'rendering as text'
                );
                return <TextBlockRenderer {...baseProps} block={block as any} />;
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
