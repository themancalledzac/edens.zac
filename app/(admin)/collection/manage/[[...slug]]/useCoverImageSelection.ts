'use client';

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { updateCollection } from '@/app/lib/api/collections';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import { type CollectionModel, type CollectionUpdateResponseDTO } from '@/app/types/Collection';
import { handleApiError } from '@/app/utils/apiUtils';

import { COVER_IMAGE_FLASH_DURATION, handleCoverImageSelection } from './manageUtils';

interface UseCoverImageSelectionParams {
  collection: CollectionModel | null;
  setCurrentState: Dispatch<SetStateAction<CollectionUpdateResponseDTO | null>>;
  setOperationLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
}

export function useCoverImageSelection({
  collection,
  setCurrentState,
  setOperationLoading,
  setError,
}: UseCoverImageSelectionParams) {
  const [isSelectingCoverImage, setIsSelectingCoverImage] = useState(false);
  const [justClickedImageId, setJustClickedImageId] = useState<number | null>(null);
  const flashTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current);
      }
    };
  }, []);

  const handleCoverImageClick = useCallback(
    async (imageId: number) => {
      if (!collection) return;

      const result = handleCoverImageSelection(imageId, collection.content);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setJustClickedImageId(result.coverImageId);
      setIsSelectingCoverImage(false);

      try {
        setOperationLoading(true);
        setError(null);

        const response = await updateCollection(collection.id, {
          id: collection.id,
          coverImageId: result.coverImageId,
        });

        if (response !== null) {
          setCurrentState(response);
          collectionStorage.update(response.collection.slug, response.collection);
          collectionStorage.updateFull(response.collection.slug, response);
        }
      } catch (error) {
        setError(handleApiError(error, 'Failed to update cover image'));
      } finally {
        setOperationLoading(false);
        if (flashTimerRef.current) {
          clearTimeout(flashTimerRef.current);
        }
        flashTimerRef.current = setTimeout(() => {
          setJustClickedImageId(null);
        }, COVER_IMAGE_FLASH_DURATION);
      }
    },
    [collection, setCurrentState, setOperationLoading, setError]
  );

  return {
    isSelectingCoverImage,
    setIsSelectingCoverImage,
    justClickedImageId,
    handleCoverImageClick,
  };
}
