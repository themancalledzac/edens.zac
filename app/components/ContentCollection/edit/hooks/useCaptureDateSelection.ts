'use client';

import { type Dispatch, type SetStateAction, useCallback, useState } from 'react';

import { getCollectionUpdateMetadata } from '@/app/lib/api/collections';
import { updateGif } from '@/app/lib/api/content';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import { type CollectionModel, type CollectionUpdateResponseDTO } from '@/app/types/Collection';
import { handleApiError } from '@/app/utils/apiUtils';
import { isContentImage } from '@/app/utils/contentTypeGuards';

import { refreshCollectionAfterOperation, revalidateCollectionCache } from '../collectionEditUtils';

interface UseCaptureDateSelectionParams {
  collection: CollectionModel | null;
  setCurrentState: Dispatch<SetStateAction<CollectionUpdateResponseDTO | null>>;
  setOperationLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
}

/**
 * Grid-click pick mode for copying a capture date onto a GIF/MP4.
 *
 * A GIF carries no EXIF, so its `captureDate` is sourced from a reference image the user picks
 * off the manage grid. `captureDateTargetId` holds the GIF awaiting a source; while it is set the
 * manage surface is in `pick-date` mode and every grid click routes here instead of opening the
 * metadata editor.
 *
 * Like {@link useCoverImageSelection}, the pick persists immediately — there is no staged state to
 * return to, since reaching the grid means the metadata sheet has already closed.
 */
export function useCaptureDateSelection({
  collection,
  setCurrentState,
  setOperationLoading,
  setError,
}: UseCaptureDateSelectionParams) {
  const [captureDateTargetId, setCaptureDateTargetId] = useState<number | null>(null);

  const handleCaptureDateSourceClick = useCallback(
    async (imageId: number) => {
      if (!collection || captureDateTargetId === null) return;

      const source = (collection.content ?? []).find(block => block.id === imageId);
      const captureDate = source && isContentImage(source) ? source.captureDate : null;

      // Undated images, text blocks and other GIFs are not valid sources. Stay in pick mode so
      // the user can simply click a different block.
      if (!captureDate) {
        setError('That block has no capture date - pick an image that does.');
        return;
      }

      const gifId = captureDateTargetId;
      setCaptureDateTargetId(null);

      try {
        setOperationLoading(true);
        setError(null);

        const response = await refreshCollectionAfterOperation(
          collection.slug,
          async () => {
            await updateGif(gifId, { captureDate });
          },
          getCollectionUpdateMetadata,
          collectionStorage
        );
        setCurrentState(response);
        await revalidateCollectionCache(collection.slug);
      } catch (error) {
        setError(handleApiError(error, 'Failed to copy the capture date.'));
      } finally {
        setOperationLoading(false);
      }
    },
    [collection, captureDateTargetId, setCurrentState, setOperationLoading, setError]
  );

  return {
    captureDateTargetId,
    setCaptureDateTargetId,
    handleCaptureDateSourceClick,
  };
}
