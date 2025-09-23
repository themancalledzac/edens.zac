"use client";

import React from 'react';

import ContentBlockComponent from '@/app/components/ContentBlock/ContentBlockComponent';
import { useViewport } from '@/app/hooks/useViewport';
import { type AnyContentBlock } from '@/types/ContentBlock';

import styles from '../../styles/layout.module.scss';

type Props = {
  blocks: AnyContentBlock[];
};

/**
 * Content Blocks Client
 *
 * Client-side wrapper component for rendering content blocks with responsive
 * viewport awareness. Waits for viewport measurements before rendering to
 * ensure proper layout calculations on initial load.
 *
 * @dependencies
 * - React for client-side rendering
 * - ContentBlockComponent for block rendering logic
 * - useViewport hook for responsive measurements
 * - AnyContentBlock type for content structure
 *
 * @param props - Component props object containing:
 * @param props.blocks - Array of content blocks to render
 * @returns Client component rendering responsive content blocks
 */
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
