'use client';

import { createContext, useContext } from 'react';

import { type FilterState, type LensType } from '@/app/types/GalleryFilter';

/**
 * Per-dimension data used by the collection filter bar.
 * `filterable` drives rendering: true -> filter dropdown, false -> inline info chip.
 */
export interface DimensionData<T = string> {
  values: readonly T[];
  filterable: boolean;
}

export interface CollectionInfoOptions {
  tags: DimensionData;
  people: DimensionData;
  cameras: DimensionData;
  lenses: DimensionData;
  locations: DimensionData;
  lensTypes: DimensionData<LensType>;
  showHighlyRated: boolean;
  showDateSort: boolean;
}

/** Subset of options available after current filters are applied (for grey-out logic). null = no active filters. */
export type FilteredAvailableOptions = {
  tags: readonly string[];
  people: readonly string[];
  cameras: readonly string[];
  lenses: readonly string[];
  lensTypes: readonly LensType[];
  locations: readonly string[];
} | null;

interface CollectionFilterContextValue {
  filterState: FilterState;
  filterOptions: CollectionInfoOptions;
  filteredAvailable: FilteredAvailableOptions;
  onFilterChange: (update: Partial<FilterState>) => void;
  /** Density value in the active viewport's scale (desktop 1-10, mobile 1-5). */
  density: number;
  /** Upper bound of the density slider for the active viewport (10 or 5). */
  densityMax: number;
  /** Receives a value in the active viewport's scale; see {@link density}. */
  onDensityChange: (value: number) => void;
}

const CollectionFilterContext = createContext<CollectionFilterContextValue | null>(null);

/**
 * `value` may be null: providing null is observationally identical to not mounting the provider
 * (consumers null-check), which lets owners gate the filter UI on a value that changes over time
 * (e.g. edit mode, where options appear after an upload) WITHOUT reparenting the subtree — a
 * mount/unmount of the provider would remount every child and reset their state.
 */
export function CollectionFilterProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: CollectionFilterContextValue | null;
}) {
  return <CollectionFilterContext value={value}>{children}</CollectionFilterContext>;
}

export function useCollectionFilter(): CollectionFilterContextValue | null {
  return useContext(CollectionFilterContext);
}
