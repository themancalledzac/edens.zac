'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ContentGifModel, ContentImageModel } from '@/app/types/Content';

/**
 * Any content block that owns first-class metadata (title, rating, etc.) and should open the
 * metadata editor on click. Today: still images and animated GIF/MP4 blocks. Adding new rated
 * content types means adding them here, not at every callsite — the click handler and modal
 * dispatch already key off the runtime contentType.
 */
export type EditableContent = ContentImageModel | ContentGifModel;

/**
 * Hook for managing metadata editor state.
 *
 * Handles:
 * - Opening/closing the metadata editor modal (image or gif)
 * - Body scroll prevention while modal is open
 *
 * @returns Editor state and control functions
 */
export function useMetadataEditor() {
  const [editingContent, setEditingContent] = useState<EditableContent | null>(null);

  /**
   * Open the metadata editor for a specific content block (image or gif).
   */
  const openEditor = useCallback((content: EditableContent) => {
    setEditingContent(content);
  }, []);

  /**
   * Close the metadata editor.
   */
  const closeEditor = useCallback(() => {
    setEditingContent(null);
  }, []);

  useEffect(() => {
    if (!editingContent) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeEditor();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingContent, closeEditor]);

  return {
    editingContent,
    /** @deprecated use `editingContent` — kept for back-compat until callers migrate. */
    editingImage: editingContent,
    openEditor,
    closeEditor,
    isOpen: !!editingContent,
  };
}
