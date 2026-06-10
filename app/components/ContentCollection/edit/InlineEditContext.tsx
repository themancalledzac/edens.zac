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
}

const InlineEditContext = createContext<InlineEditContextValue | null>(null);

export const InlineEditProvider = InlineEditContext.Provider;

/** Returns the inline-edit surface when on-page editing is active, else null (public view). */
export function useInlineEdit(): InlineEditContextValue | null {
  return useContext(InlineEditContext);
}

export default InlineEditContext;
