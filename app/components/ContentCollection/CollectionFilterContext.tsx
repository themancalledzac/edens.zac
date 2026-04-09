'use client';

import { createContext, useContext } from 'react';

import { type CollectionFilterState, type LensType } from '@/app/types/GalleryFilter';

export interface CollectionFilterOptions {
  tags: string[];
  people: string[];
  cameras: string[];
  lenses: string[];
  lensTypes: LensType[];
  showHighlyRated: boolean;
}

/** Subset of options available after current filters are applied (for grey-out logic). null = no active filters. */
export type FilteredAvailableOptions = {
  tags: string[];
  people: string[];
  cameras: string[];
  lenses: string[];
  lensTypes: LensType[];
} | null;

interface CollectionFilterContextValue {
  filterState: CollectionFilterState;
  filterOptions: CollectionFilterOptions;
  filteredAvailable: FilteredAvailableOptions;
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
