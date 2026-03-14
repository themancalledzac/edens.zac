'use client';

import { useRouter } from 'next/navigation';
import { type Dispatch, type SetStateAction, useCallback } from 'react';

import { type CollectionModel } from '@/app/types/Collection';
import { type AnyContentModel, type ContentImageModel } from '@/app/types/Content';

import { handleCollectionNavigation, handleSingleImageEdit } from './manageUtils';

interface UseImageClickHandlerParams {
  isSelectingCoverImage: boolean;
  isMultiSelectMode: boolean;
  handleCoverImageClick: (imageId: number) => void;
  handleMultiSelectToggle: (imageId: number) => void;
  collection: CollectionModel | null;
  processedContent: AnyContentModel[];
  openEditor: (image: ContentImageModel) => void;
  setSelectedImageIds: Dispatch<SetStateAction<number[]>>;
  setIsMultiSelectMode: Dispatch<SetStateAction<boolean>>;
}

export function useImageClickHandler({
  isSelectingCoverImage,
  isMultiSelectMode,
  handleCoverImageClick,
  handleMultiSelectToggle,
  collection,
  processedContent,
  openEditor,
  setSelectedImageIds,
  setIsMultiSelectMode,
}: UseImageClickHandlerParams) {
  const router = useRouter();

  const handleImageClick = useCallback(
    (imageId: number) => {
      if (isSelectingCoverImage) {
        // Mode 1: Cover image selection
        handleCoverImageClick(imageId);
        return;
      }

      // Mode 2: Collection navigation
      const collectionSlug = handleCollectionNavigation(imageId, collection?.content);
      if (collectionSlug) {
        router.push(`/collection/manage/${collectionSlug}`);
        return;
      }

      if (isMultiSelectMode) {
        // Mode 3: Multi-select toggle
        handleMultiSelectToggle(imageId);
      } else {
        // Mode 4: Single image edit
        const imageBlock = handleSingleImageEdit(imageId, collection?.content, processedContent);
        if (imageBlock) {
          setSelectedImageIds([imageId]);
          setIsMultiSelectMode(false);
          openEditor(imageBlock);
        }
      }
    },
    [
      isSelectingCoverImage,
      isMultiSelectMode,
      handleCoverImageClick,
      handleMultiSelectToggle,
      collection?.content,
      processedContent,
      openEditor,
      setSelectedImageIds,
      setIsMultiSelectMode,
      router,
    ]
  );

  return { handleImageClick };
}
