"use client";

import React, { useEffect, useMemo, useState } from 'react';

import cbStyles from '@/styles/ContentBlockComponent.module.scss';
import { type AnyContentBlock } from '@/types/ContentBlock';
import {
  type CalculatedContentBlockSize,
  normalizeContentBlock,
  processContentBlocksForDisplay,
} from '@/utils/imageUtils';

import { ImageBlockRenderer, TextBlockRenderer, isImageBlock, getPositionStyle } from './ContentBlock';

export type ContentBlockComponentProps = {
  blocks: AnyContentBlock[];
  componentWidth: number;
  isMobile: boolean;
  // onImageClick?: (image: ImageData) => void;
  // optional tuning
  chunkSize?: number;
  defaultAspect?: number;
  baseWidth?: number;
  defaultRating?: number;
};

export default function ContentBlockComponent(props: ContentBlockComponentProps) {
  const {
    blocks,
    componentWidth,
    isMobile,
    // onImageClick,
    chunkSize = 2,
    defaultAspect = 2 / 3,
    baseWidth = 1000,
    defaultRating = 3,
  } = props;

  const [rows, setRows] = useState<CalculatedContentBlockSize[][]>([]);
  const [loading, setLoading] = useState(true);

  // Memoize block normalization to avoid unnecessary recalculations
  const normalized = useMemo(() => {
    if (!blocks || blocks.length === 0) return [];
    return blocks.map(block =>
      normalizeContentBlock(block, {
        defaultAspect,
        baseWidth,
        defaultRating,
      })
    );
  }, [blocks, defaultAspect, baseWidth, defaultRating]);

  // Process blocks for display layout
  useEffect(() => {
    try {
      if (normalized.length === 0 || !componentWidth) {
        setRows([]);
        setLoading(false);
        return;
      }
      const processedRows = processContentBlocksForDisplay(normalized, componentWidth, chunkSize);
      setRows(processedRows);
    } catch (error) {
      console.error('ContentBlockComponent sizing error:', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [normalized, componentWidth, chunkSize]);

  // Early returns for loading and empty states
  if (loading) return <div />;
  if (rows.length === 0) return <div />;

  return (
    <div className={cbStyles.wrapper}>
      <div className={cbStyles.inner} style={{ width: '100%' }}>
        {rows.map((row, rowIndex) => {
          const totalInRow = row.length;

          return (
            <div
              key={`row-${rowIndex}`}
              className={isMobile ? cbStyles.rowMobile : cbStyles.row}
            >
              {row.map((item, index) => {
                const className = getPositionStyle(index, totalInRow);
                const width = Math.round(item.width);
                const height = Math.round(item.height);
                const block = item.block;

                // Render image blocks using specialized renderer
                if (isImageBlock(block) && block.imageUrlWeb) {
                  return (
                    <React.Fragment key={block.id}>
                      <ImageBlockRenderer
                        block={block}
                        width={width}
                        height={height}
                        className={className}
                        isMobile={isMobile}
                        // onClick={handleImageClick} // TODO: Implement if needed
                      />
                    </React.Fragment>
                  );
                }

                // Render text blocks using specialized renderer
                return (
                  <React.Fragment key={block.id}>
                    <TextBlockRenderer
                      block={block}
                      width={width}
                      height={height}
                      className={className}
                      isMobile={isMobile}
                    />
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
