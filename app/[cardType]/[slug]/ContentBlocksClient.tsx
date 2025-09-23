"use client";

import React from 'react';

import ContentBlockComponent from '@/app/components/ContentBlock/ContentBlockComponent';
import { useViewport } from '@/app/hooks/useViewport';
import { type AnyContentBlock } from '@/types/ContentBlock';

import styles from '../../styles/layout.module.scss';

type Props = {
  blocks: AnyContentBlock[];
};

export default function ContentBlocksClient({ blocks }: Props) {
  const { contentWidth, isMobile } = useViewport();

  return (
    <div className={styles.wrapper}>
      {contentWidth > 0 && (
        <ContentBlockComponent
          blocks={blocks}
          componentWidth={contentWidth}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}
