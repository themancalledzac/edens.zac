"use client";

import React from 'react';

import ContentBlockComponent from '@/app/components/ContentBlock/ContentBlockComponent';
import { useViewport } from '@/app/hooks/useViewport';
import { type AnyContentBlock } from '@/types/ContentBlock';

type Props = {
  blocks: AnyContentBlock[];
};

export default function ContentBlocksClient({ blocks }: Props) {
  const { contentWidth, isMobile } = useViewport();

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      {contentWidth > 0 && (
        <ContentBlockComponent
          blocks={blocks}
          componentWidth={contentWidth}
          isMobile={isMobile}
          chunkSize={2}
        />
      )}
    </div>
  );
}
