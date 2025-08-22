"use client";

import React, { createContext, useContext, useMemo, useState } from 'react';

import { type PreviewImage } from '@/Components/Catalog/ImageUploadList';
import { type Image } from '@/types/Image';

/**
 * EditLiteContext — minimal client-only context for App Router interactive flows.
 *
 * Scope: Keep only ephemeral UI state that cannot live in the URL or server.
 * - selectedForSwap: drag/drop swap target while reordering images/blocks
 * - previewData: client-side file upload previews prior to submission
 *
 * Do not place route-level flags (like isEditMode) or selection mirrored in URL here.
 */
export type EditLiteContextState = {
  selectedForSwap: Image | null;
  setSelectedForSwap: (img: Image | null) => void;
  previewData: PreviewImage[];
  setPreviewData: (list: PreviewImage[]) => void;
};

const EditLiteContext = createContext<EditLiteContextState | undefined>(undefined);

export const useEditLiteContext = (): EditLiteContextState => {
  const ctx = useContext(EditLiteContext);
  if (!ctx) throw new Error('useEditLiteContext must be used within EditLiteProvider');
  return ctx;
};

export function EditLiteProvider({ children }: { children: React.ReactNode }) {
  const [selectedForSwap, setSelectedForSwap] = useState<Image | null>(null);
  const [previewData, setPreviewData] = useState<PreviewImage[]>([]);

  const value = useMemo(
    () => ({ selectedForSwap, setSelectedForSwap, previewData, setPreviewData }),
    [selectedForSwap, previewData]
  );

  return <EditLiteContext.Provider value={value}>{children}</EditLiteContext.Provider>;
}
