'use client';

import React, { useMemo } from 'react';

import cbStyles from '@/app/components/ContentBlock/ContentBlockComponent.module.scss';
import { type AnyContentBlock } from '@/app/types/ContentBlock';
import {
  normalizeContentBlock,
  processContentBlocksForDisplay,
} from '@/app/utils/imageUtils';

import { getPositionStyle, ImageBlockRenderer, isImageBlock, TextBlockRenderer } from './index';

export type ContentBlockDisplayOptions = {
  chunkSize: number;
  defaultAspect: number;
  baseWidth: number;
  defaultRating: number;
};

export type ContentBlockComponentProps = {
  blocks: AnyContentBlock[];
  componentWidth: number;
  isMobile: boolean;
  options?: Partial<ContentBlockDisplayOptions>;
};

const DEFAULT_OPTIONS: ContentBlockDisplayOptions = {
  chunkSize: 2,
  defaultAspect: 2 / 3,
  baseWidth: 1000,
  defaultRating: 3,
};

/**
 * Content Block Component
 *
 * High-performance content rendering system that processes and displays
 * mixed content blocks (images, text, etc.) in optimized responsive layouts.
 * Features memoized calculations, responsive chunking, and specialized renderers.
 *
 * @dependencies
 * - React useMemo for performance optimization
 * - ContentBlock utilities for normalization and processing
 * - Specialized block renderers (Image, Text)
 * - ContentBlockComponent.module.scss for styling
 *
 * @param props - Component props object containing:
 * @param props.blocks - Array of content blocks to render
 * @param props.componentWidth - Available width for layout calculations
 * @param props.isMobile - Mobile breakpoint flag for responsive behavior
 * @param props.options - Optional display configuration overrides
 * @returns Client component rendering optimized content block layout
 */
export default function ContentBlockComponent(props: ContentBlockComponentProps) {
  const { blocks, componentWidth, isMobile, options = {} } = props;

  const {
    chunkSize,
    defaultAspect,
    baseWidth,
    defaultRating,
  } = { ...DEFAULT_OPTIONS, ...options };

  // Memoize block normalization and layout processing for optimal performance
  const normalizedBlocks = useMemo(() => {
    if (!blocks || blocks.length === 0) return [];
    return blocks.map(block =>
      normalizeContentBlock(block, {
        defaultAspect,
        baseWidth,
        defaultRating,
      })
    );
  }, [blocks, defaultAspect, baseWidth, defaultRating]);

  // Memoize layout calculations to prevent unnecessary recalculations
  const rows = useMemo(() => {
    if (normalizedBlocks.length === 0 || !componentWidth) {
      return [];
    }

    try {
      return processContentBlocksForDisplay(normalizedBlocks, componentWidth, chunkSize);
    } catch (error) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('ContentBlockComponent sizing error:', error);
      }
      return [];
    }
  }, [normalizedBlocks, componentWidth, chunkSize]);

  // Early return for empty state
  if (rows.length === 0) return <div />;

  return (
    <div className={cbStyles.wrapper}>
      <div className={cbStyles.inner} style={{ width: '100%' }}>
        {rows.map((row, _rowIndex) => {
          const totalInRow = row.length;

          return (
            <div key={`row-${row.map(item => item.block.id).join('-')}`} className={isMobile ? cbStyles.rowMobile : cbStyles.row}>
              {row.map((item, index) => {
                const className = getPositionStyle(index, totalInRow);
                const width = Math.round(item.width);
                const height = Math.round(item.height);
                const block = item.block;

                // Render image blocks using specialized renderer
                if (isImageBlock(block) && block.imageUrlWeb) {
                  return (
                    <ImageBlockRenderer
                      key={block.id}
                      block={block}
                      width={width}
                      height={height}
                      className={className}
                      isMobile={isMobile}
                    />
                  );
                }

                // Render text blocks using specialized renderer
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
