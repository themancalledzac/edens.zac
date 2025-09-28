'use client';

import React, { useMemo } from 'react';

import { useViewport } from '@/app/hooks/useViewport';
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
import { ParallaxImageRenderer } from './ParallaxImageRenderer';
import { TextBlockRenderer } from './TextBlockRenderer';

/**
 * Determines base props for a content block including width, height, className, and block
 * @param item - The processed content block item with calculated dimensions
 * @param totalInRow - Total number of items in the row
 * @param index - Current item's index in the row (0-based)
 * @returns Object containing width, height, className, and block
 */
function determineBaseProps(
  item: { block: AnyContentBlock; width: number; height: number },
  totalInRow: number,
  index: number,
) {
  let className = '';
  if (totalInRow === 1) className = cbStyles.imageSingle || '';
  else if (index === 0) className = cbStyles.imageLeft || '';
  else if (index === totalInRow - 1) className = cbStyles.imageRight || '';
  else className = cbStyles.imageMiddle || '';

  return {
    width: Math.round(item.width),
    height: Math.round(item.height),
    className,
    block: item.block,
  };
}

/**
 * Content Block Component
 *
 * High-performance content rendering system that processes and displays
 * mixed content blocks (images, text, etc.) in optimized responsive layouts.
 * Features memoized calculations, responsive chunking, and type-safe specialized renderers.
 */
export default function ContentBlockComponent({ blocks }: { blocks: AnyContentBlock[] }) {
  const chunkSize = 2;
  const { contentWidth, isMobile } = useViewport();

  const rows = useMemo(() => {
    if (!blocks || blocks.length === 0 || !contentWidth) {
      return [];
    }

    try {
      return processContentBlocksForDisplay(blocks, contentWidth, chunkSize);
    } catch (error) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('ContentBlockComponent sizing error:', error);
      }
      return [];
    }
  }, [blocks, contentWidth, chunkSize]);

  // Early return for empty state
  if (rows.length === 0) return <div />;

  return (
    <div className={cbStyles.wrapper}>
      <div className={cbStyles.inner}>
        {rows.map((row, _rowIndex) => {
          const totalInRow = row.length;

          return (
            <div key={`row-${row.map(item => item.block.id).join('-')}`} className={cbStyles.row}>
              {row.map((item, index) => {
                const { block, className, width, height } = determineBaseProps(item, totalInRow, index);

                // Renderer lookup map - check most specific types first
                if (isParallaxImageBlock(block) && block.enableParallax) {
                  // Handle parallax image with proper container structure for collections
                  return (
                    <div
                      key={block.id}
                      className={`${className} ${cbStyles.overlayContainer}`}
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
                          overflow: 'hidden',
                        }}
                      >
                        <ParallaxImageRenderer
                          block={block}
                          blockType="contentBlock"
                          cardTypeBadge={block.cardTypeBadge}
                        />
                      </div>
                    </div>
                  );
                }
                if (isImageBlock(block))
                  return (
                    <ImageContentBlockRenderer
                      key={block.id}
                      block={block}
                      width={width}
                      height={height}
                      className={className}
                      isMobile={isMobile}
                    />
                  );
                if (isGifBlock(block))
                  return (
                    <GifContentBlockRenderer
                      key={block.id}
                      block={block}
                      width={width}
                      height={height}
                      className={className}
                      isMobile={isMobile}
                    />
                  );
                if (isCodeBlock(block))
                  return (
                    <CodeContentBlockRenderer
                      key={block.id}
                      block={block}
                      width={width}
                      height={height}
                      className={className}
                      isMobile={isMobile}
                    />
                  );
                if (isTextBlock(block))
                  return (
                    <TextBlockRenderer
                      key={block.id}
                      block={block}
                      width={width}
                      height={height}
                      className={className}
                      isMobile={isMobile}
                    />
                  );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
