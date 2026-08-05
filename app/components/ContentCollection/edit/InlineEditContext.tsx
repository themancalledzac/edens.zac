'use client';

import { createContext, useContext } from 'react';

/** Collection fields that can be committed from an inline on-page editor. */
export type InlineEditField = 'title' | 'description';

export interface InlineEditContextValue {
  /** Current title buffer value (mirrors the edit hook's updateData.title). */
  title: string;
  /** Current description buffer value (mirrors the edit hook's updateData.description). */
  description: string;
  /** Write a field to the shared edit buffer and persist (save-on-blur). */
  onCommitField: (field: InlineEditField, value: string) => void;
  /** Open the location picker so locations can be edited. */
  onEditLocation: () => void;
  /**
   * Enter or leave cover-pick mode, where a click on any grid image commits it as the cover.
   * Null when the active manage mode already owns grid clicks (reorder, select, pick-date), which
   * is what gates the affordance — the renderer has no other view of the manage state machine.
   */
  onTogglePickCover: (() => void) | null;
  /** True while cover-pick mode is active; flips the affordance to its cancel label. */
  isPickingCover: boolean;
  /**
   * Whether the collection has a cover image. False means no cover block is laid out at all, so
   * the metadata rail — not the (absent) cover — has to carry the entry point into cover-pick.
   */
  hasCover: boolean;
}

const InlineEditContext = createContext<InlineEditContextValue | null>(null);

export const InlineEditProvider = InlineEditContext.Provider;

/** Returns the inline-edit surface when on-page editing is active, else null (public view). */
export function useInlineEdit(): InlineEditContextValue | null {
  return useContext(InlineEditContext);
}

export default InlineEditContext;
