'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ImageContentModel } from '@/app/types/Content';

/**
 * Hook for managing image metadata editor state
 *
 * Handles:
 * - Opening/closing the metadata editor modal
 * - Scroll position management
 * - Body scroll prevention while modal is open
 *
 * @returns Editor state and control functions
 */
export function useImageMetadataEditor() {
  const [editingImage, setEditingImage] = useState<ImageContentModel | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  /**
   * Open the metadata editor for a specific image
   */
  const openEditor = useCallback((image: ImageContentModel) => {
    // Capture current scroll position BEFORE opening editor
    const currentScroll = window.scrollY;
    setScrollPosition(currentScroll);
    setEditingImage(image);
  }, []);

  /**
   * Close the metadata editor
   */
  const closeEditor = useCallback(() => {
    setEditingImage(null);
  }, []);

  // Prevent body scrolling while editor is open
  useEffect(() => {
    if (!editingImage) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Handle Escape key to close
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeEditor();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingImage, closeEditor]);

  return {
    editingImage,
    scrollPosition,
    openEditor,
    closeEditor,
    isOpen: !!editingImage,
  };
}
