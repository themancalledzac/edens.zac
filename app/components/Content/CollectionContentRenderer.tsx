'use client';

import { useRouter } from 'next/navigation';
import React, { useRef } from 'react';

import { useViewport } from '@/app/hooks/useViewport';
import { type CollectionContentModel } from '@/app/types/Content';
import { prepareCollectionContentRender } from '@/app/utils/contentComponentHandlers';

import cbStyles from './ContentComponent.module.scss';
import { ParallaxImageRenderer } from './ParallaxImageRenderer';

export interface CollectionContentRendererProps {
  itemContent: CollectionContentModel;
  className: string;
  width: number;
  height: number;
  enableDragAndDrop?: boolean;
  draggedImageId?: number | null;
  onImageClick?: (imageId: number) => void;
  enableFullScreenView?: boolean;
  onFullScreenImageClick?: (image: any) => void;
  onDragStart?: (imageId: number) => void;
  onDragOver?: (e: React.DragEvent, imageId: number) => void;
  onDrop?: (e: React.DragEvent, imageId: number) => void;
  onDragEnd?: () => void;
}

export default function CollectionContentRenderer({
  itemContent,
  className,
  width,
  height,
  enableDragAndDrop = false,
  draggedImageId,
  onImageClick,
  enableFullScreenView,
  onFullScreenImageClick,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: CollectionContentRendererProps) {
  const router = useRouter();
  const { isMobile } = useViewport();
  const isDraggingRef = useRef(false);

  const renderData = prepareCollectionContentRender(
    itemContent,
    width,
    height,
    isMobile,
    enableDragAndDrop,
    draggedImageId,
    isDraggingRef,
    onImageClick,
    enableFullScreenView,
    onFullScreenImageClick,
    router.push,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd
  );

  const containerClass = [
    className,
    cbStyles.overlayContainer,
    cbStyles.parallaxContainer,
    isMobile ? cbStyles.mobile : cbStyles.desktop,
    renderData.isDragged ? cbStyles.dragging : '',
    enableDragAndDrop ? '' : (renderData.handleClick ? cbStyles.clickable : cbStyles.default),
  ].filter(Boolean).join(' ');

  return (
    <div
      key={itemContent.id}
      draggable={enableDragAndDrop && !!onDragStart}
      onDragStart={renderData.handleDragStartEvent}
      onDragOver={renderData.handleDragOverEvent}
      onDrop={renderData.handleDropEvent}
      onDragEnd={renderData.handleDragEndEvent}
      className={containerClass}
      style={{
        // Dynamic styles that depend on content dimensions
        width: isMobile ? '100%' : width,
        height: isMobile ? 'auto' : height,
        aspectRatio: isMobile ? width / height : undefined,
      }}
    >
      <div
        className={cbStyles.imageWrapper}
        onClick={renderData.handleClick}
      >
        <ParallaxImageRenderer
          content={renderData.parallaxContent}
          contentType="collection"
          cardTypeBadge={renderData.cardTypeBadge}
          priority={false}
          onClick={renderData.handleClick}
        />
      </div>
    </div>
  );
}

