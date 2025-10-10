'use client';

import React from 'react';

import { useFullScreenImage } from '@/app/hooks/useFullScreenImage';
import { type AnyContentBlock } from '@/app/types/ContentBlock';

import ContentBlockComponent from './ContentBlockComponent';

interface ContentBlockWithFullScreenProps {
  blocks: AnyContentBlock[];
  priorityBlockIndex?: number;
  enableFullScreenView?: boolean;
}

/**
 * Wrapper component that provides full screen image functionality
 * to ContentBlockComponent using the new simplified hook
 */
export default function ContentBlockWithFullScreen({ 
  blocks, 
  priorityBlockIndex, 
  enableFullScreenView 
}: ContentBlockWithFullScreenProps) {
  const { showImage, FullScreenModal } = useFullScreenImage();

  return (
    <>
      <ContentBlockComponent 
        blocks={blocks} 
        priorityBlockIndex={priorityBlockIndex} 
        enableFullScreenView={enableFullScreenView}
        onFullScreenImageClick={showImage} // Pass the showImage function for full screen
      />
      {FullScreenModal}
    </>
  );
}