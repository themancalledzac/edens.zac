"use client";

import Image from 'next/image';
import React, { useEffect, useMemo, useState } from 'react';

import cbStyles from '@/styles/ContentBlockComponent.module.scss';
import styles from '@/styles/Home.module.scss';
import { type AnyContentBlock } from '@/types/ContentBlock';
import {
  type CalculatedContentBlockSize,
  normalizeContentBlock,
  type NormalizedContentBlock,
  processContentBlocksForDisplay,
} from '@/utils/imageUtils';

export type ContentBlockComponentProps = {
  blocks: AnyContentBlock[];
  componentWidth: number;
  isMobile: boolean;
  // optional tuning
  chunkSize?: number;
  defaultAspect?: number;
  baseWidth?: number;
  defaultRating?: number;
};

function isImageBlock(norm: NormalizedContentBlock): boolean {
  return !!norm.imageUrlWeb;
}

function getPositionStyle(index: number, total: number): string {
  if (total === 1) return styles.imageSingle;
  if (index === 0) return styles.imageLeft;
  if (index === total - 1) return styles.imageRight;
  return styles.imageMiddle;
}

export default function ContentBlockComponent(props: ContentBlockComponentProps) {
  const {
    blocks,
    componentWidth,
    isMobile,
    chunkSize = 2,
    defaultAspect = 2 / 3,
    baseWidth = 1000,
    defaultRating = 3,
  } = props;

  const [rows, setRows] = useState<CalculatedContentBlockSize[][]>([]);
  const [loading, setLoading] = useState(true);

  const normalized: NormalizedContentBlock[] = useMemo(() => {
    if (!blocks || blocks.length === 0) return [];
    return blocks.map(b =>
      normalizeContentBlock(b, {
        defaultAspect,
        baseWidth,
        defaultRating,
      })
    );
  }, [blocks, defaultAspect, baseWidth, defaultRating]);

  useEffect(() => {
    try {
      if (normalized.length === 0 || !componentWidth) {
        setRows([]);
        setLoading(false);
        return;
      }
      const sized = processContentBlocksForDisplay(normalized, componentWidth, chunkSize);
      setRows(sized);
    } catch (error) {
      console.error('ContentBlockComponent sizing error:', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [normalized, componentWidth, chunkSize]);

  if (loading) return <div />;
  if (rows.length === 0) return <div />;

  return (
    <div className={cbStyles.wrapper}>
      <div className={cbStyles.inner} style={{ width: '100%' }}>
        {rows.map((row, rowIndex) => {
          const total = row.length;
          return (
            <div
              key={`row-${rowIndex}`}
              className={isMobile ? cbStyles.rowMobile : cbStyles.row}
            >
              {row.map((item, index) => {
              const cls = getPositionStyle(index, total);
              const w = Math.round(item.width);
              const h = Math.round(item.height);
              const block = item.block;

              if (isImageBlock(block) && block.imageUrlWeb) {
                return (
                  <Image
                    key={block.id}
                    src={block.imageUrlWeb}
                    alt={typeof (block as any).originalBlock?.title === 'string' ? (block as any).originalBlock.title : 'content'}
                    width={w}
                    height={h}
                    className={cls}
                    loading="lazy"
                  />
                );
              }

              const original: any = (block as any).originalBlock;
              const previewText =
                original?.text ?? original?.content ?? original?.title ?? 'Text/Code Block';

              return (
                <div
                  key={block.id}
                  className={`${cls} ${cbStyles.blockContainer}`}
                  style={{ width: w, height: h }}
                >
                  <div className={cbStyles.blockInner}>
                    <span>{typeof previewText === 'string' ? previewText : 'Block'}</span>
                  </div>
                </div>
              );
            })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
