'use client';

import { useRouter } from 'next/navigation';
import { type Dispatch, type SetStateAction, useCallback } from 'react';

import { type CollectionModel } from '@/app/types/Collection';
import {
  type AnyContentModel,
  type ContentGifModel,
  type ContentImageModel,
} from '@/app/types/Content';
import { COVER_IMAGE_CONTENT_ID } from '@/app/utils/contentLayout';
import { manageHref } from '@/app/utils/manageUrl';

import { handleCollectionNavigation, handleSingleImageEdit } from '../collectionEditUtils';

interface UseImageClickHandlerParams {
  /** True while a GIF is awaiting a capture-date source; every grid click routes to the pick. */
  isPickingCaptureDate: boolean;
  handleCaptureDateSourceClick: (imageId: number) => void;
  isSelectingCoverImage: boolean;
  isMultiSelectMode: boolean;
  handleCoverImageClick: (imageId: number) => void;
  handleMultiSelectToggle: (imageId: number) => void;
  collection: CollectionModel | null;
  processedContent: AnyContentModel[];
  openEditor: (content: ContentImageModel | ContentGifModel) => void;
  setSelectedIds: Dispatch<SetStateAction<number[]>>;
  setIsMultiSelectMode: Dispatch<SetStateAction<boolean>>;
}

export function useImageClickHandler({
  isPickingCaptureDate,
  handleCaptureDateSourceClick,
  isSelectingCoverImage,
  isMultiSelectMode,
  handleCoverImageClick,
  handleMultiSelectToggle,
  collection,
  processedContent,
  openEditor,
  setSelectedIds,
  setIsMultiSelectMode,
}: UseImageClickHandlerParams) {
  const router = useRouter();

  const handleImageClick = useCallback(
    (imageId: number) => {
      if (isPickingCaptureDate) {
        handleCaptureDateSourceClick(imageId);
        return;
      }

      if (isSelectingCoverImage) {
        // The header cover block is a synthetic id, not a content row, so it is never a valid
        // pick — swallow the click rather than let it fail validation and raise an error banner.
        // Its own hover affordance is what cancels the pick.
        if (imageId === COVER_IMAGE_CONTENT_ID) return;
        handleCoverImageClick(imageId);
        return;
      }

      const collectionSlug = handleCollectionNavigation(imageId, collection?.content);
      if (collectionSlug) {
        router.push(manageHref(collectionSlug));
        return;
      }

      if (isMultiSelectMode) {
        handleMultiSelectToggle(imageId);
      } else {
        const imageBlock = handleSingleImageEdit(imageId, collection?.content, processedContent);
        if (imageBlock) {
          setSelectedIds([imageId]);
          setIsMultiSelectMode(false);
          openEditor(imageBlock);
        }
      }
    },
    [
      isPickingCaptureDate,
      handleCaptureDateSourceClick,
      isSelectingCoverImage,
      isMultiSelectMode,
      handleCoverImageClick,
      handleMultiSelectToggle,
      collection?.content,
      processedContent,
      openEditor,
      setSelectedIds,
      setIsMultiSelectMode,
      router,
    ]
  );

  return { handleImageClick };
}
