'use client';

import { type Dispatch, type SetStateAction, useCallback, useMemo, useState } from 'react';

import { getCollectionUpdateMetadata } from '@/app/lib/api/collections';
import { type CollectionModel, type CollectionUpdateResponseDTO } from '@/app/types/Collection';
import { type AnyContentModel } from '@/app/types/Content';

import {
  applyArrowMove,
  applyPickAndPlace,
  applyReorderChangesOptimistically,
  buildReorderChangesFromFinalOrder,
  cancelImageMoves,
  executeReorderOperation,
  handleApiError,
  type ReorderMove,
  replayMoves,
} from './manageUtils';

interface UseContentReorderingParams {
  collection: CollectionModel | null;
  currentState: CollectionUpdateResponseDTO | null;
  processedContent: AnyContentModel[];
  setCurrentState: Dispatch<SetStateAction<CollectionUpdateResponseDTO | null>>;
  setOperationLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  onExitMultiSelect: () => void;
}

export function useContentReordering({
  collection,
  currentState,
  processedContent,
  setCurrentState,
  setOperationLoading,
  setError,
  onExitMultiSelect,
}: UseContentReorderingParams) {
  const [reorderState, setReorderState] = useState<{
    active: boolean;
    originalOrder: number[];
    moves: ReorderMove[];
    pickedUpImageId: number | null;
  }>({
    active: false,
    originalOrder: [],
    moves: [],
    pickedUpImageId: null,
  });

  const reorderDisplayOrder = useMemo(() => {
    if (!reorderState.active) return [];
    return replayMoves(reorderState.originalOrder, reorderState.moves);
  }, [reorderState.active, reorderState.originalOrder, reorderState.moves]);

  const displayContent = useMemo(() => {
    if (!reorderState.active || !processedContent) return processedContent;
    const orderMap = new Map(reorderDisplayOrder.map((id, i) => [id, i]));
    return [...processedContent].sort((a, b) => {
      const aIdx = orderMap.get(a.id) ?? Infinity;
      const bIdx = orderMap.get(b.id) ?? Infinity;
      return aIdx - bIdx;
    });
  }, [reorderState.active, processedContent, reorderDisplayOrder]);

  const handleCancelReorder = useCallback(() => {
    setReorderState({
      active: false,
      originalOrder: [],
      moves: [],
      pickedUpImageId: null,
    });
  }, []);

  const handleEnterReorderMode = useCallback(() => {
    if (!processedContent) return;
    onExitMultiSelect();
    setReorderState({
      active: true,
      originalOrder: processedContent.map(c => c.id),
      moves: [],
      pickedUpImageId: null,
    });
  }, [processedContent, onExitMultiSelect]);

  const handleSaveReorder = useCallback(async () => {
    if (!collection || !currentState) return;
    const finalOrder = replayMoves(reorderState.originalOrder, reorderState.moves);
    const changes = buildReorderChangesFromFinalOrder(finalOrder, reorderState.originalOrder);

    if (changes.length === 0) {
      handleCancelReorder();
      return;
    }

    try {
      setOperationLoading(true);
      setError(null);

      const optimisticallyUpdatedCollection = applyReorderChangesOptimistically(
        currentState.collection,
        changes
      );
      setCurrentState(prev =>
        prev ? { ...prev, collection: optimisticallyUpdatedCollection } : null
      );

      await executeReorderOperation(collection.id, changes, collection.slug);
      handleCancelReorder();
    } catch (error_) {
      setError(handleApiError(error_, 'Failed to reorder content.'));
      try {
        const response = await getCollectionUpdateMetadata(collection.slug);
        setCurrentState(prev => (prev ? { ...prev, collection: response.collection } : null));
      } catch {
        // Silent fail — state will be stale but user can reload
      }
    } finally {
      setOperationLoading(false);
    }
  }, [
    collection,
    currentState,
    reorderState,
    handleCancelReorder,
    setCurrentState,
    setOperationLoading,
    setError,
  ]);

  const handleArrowMove = useCallback(
    (contentId: number, direction: -1 | 1) => {
      const currentOrder = replayMoves(reorderState.originalOrder, reorderState.moves);
      const result = applyArrowMove(currentOrder, contentId, direction);
      if (!result) return;
      setReorderState(prev => ({
        ...prev,
        moves: [...prev.moves, result.move],
        pickedUpImageId: null,
      }));
    },
    [reorderState.originalOrder, reorderState.moves]
  );

  const handlePickUp = useCallback((contentId: number) => {
    setReorderState(prev => ({
      ...prev,
      pickedUpImageId: prev.pickedUpImageId === contentId ? null : contentId,
    }));
  }, []);

  const handlePlace = useCallback(
    (targetId: number) => {
      if (!reorderState.pickedUpImageId || reorderState.pickedUpImageId === targetId) return;
      const currentOrder = replayMoves(reorderState.originalOrder, reorderState.moves);
      const result = applyPickAndPlace(currentOrder, reorderState.pickedUpImageId, targetId);
      if (!result) return;
      setReorderState(prev => ({
        ...prev,
        moves: [...prev.moves, result.move],
        pickedUpImageId: null,
      }));
    },
    [reorderState.pickedUpImageId, reorderState.originalOrder, reorderState.moves]
  );

  const handleCancelImageMove = useCallback((contentId: number) => {
    setReorderState(prev => ({
      ...prev,
      moves: cancelImageMoves(prev.moves, contentId),
      pickedUpImageId: null,
    }));
  }, []);

  return {
    reorderState,
    reorderDisplayOrder,
    displayContent,
    handleEnterReorderMode,
    handleCancelReorder,
    handleSaveReorder,
    handleArrowMove,
    handlePickUp,
    handlePlace,
    handleCancelImageMove,
  };
}
