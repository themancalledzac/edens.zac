'use client';

import { createContext, useContext } from 'react';

import { type CollectionFilterState } from '@/app/types/GalleryFilter';

export interface CollectionFilterOptions {
  tags: string[];
  people: string[];
  cameras: string[];
  lenses: string[];
  focalLengthStops: number[];
}

interface CollectionFilterContextValue {
  filterState: CollectionFilterState;
  filterOptions: CollectionFilterOptions;
  onFilterChange: (update: Partial<CollectionFilterState>) => void;
}

const CollectionFilterContext = createContext<CollectionFilterContextValue | null>(null);

export function CollectionFilterProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: CollectionFilterContextValue;
}) {
  return (
    <CollectionFilterContext.Provider value={value}>{children}</CollectionFilterContext.Provider>
  );
}

export function useCollectionFilter(): CollectionFilterContextValue | null {
  return useContext(CollectionFilterContext);
}
