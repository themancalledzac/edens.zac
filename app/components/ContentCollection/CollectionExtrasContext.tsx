'use client';

import { createContext, type ReactNode, useContext } from 'react';

import { type ToolbarExtra } from '@/app/components/ui/FilterToolbar/chipWeights';

/** Page-level content for the header: rail nodes beside the cover, and chips for the bar's upper tier. */
export interface CollectionExtras {
  rail: ReactNode;
  toolbar: readonly ToolbarExtra[];
}

const NONE: CollectionExtras = { rail: null, toolbar: [] };

/**
 * A context rather than props because the rail and the bar are rendered from a content MODEL four
 * layers below the page (CollectionPageClient → ContentBlockWithFullScreen → BoxRenderer →
 * CollectionContentRenderer), whose props are all about blocks and sizing.
 */
const CollectionExtrasContext = createContext<CollectionExtras>(NONE);

export function CollectionExtrasProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: CollectionExtras;
}) {
  return (
    <CollectionExtrasContext.Provider value={value}>{children}</CollectionExtrasContext.Provider>
  );
}

export function useCollectionExtras(): CollectionExtras {
  return useContext(CollectionExtrasContext);
}
