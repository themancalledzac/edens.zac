'use client';

import { createContext, useContext } from 'react';

import { type ToolbarSection } from '@/app/components/ui/FilterToolbar/FilterToolbar';
import { type FilterState } from '@/app/types/GalleryFilter';

/**
 * Per-dimension data used by the collection filter bar.
 * `filterable` drives rendering: true -> filter dropdown, false -> inline info chip.
 */
export interface DimensionData<T = string> {
  values: readonly T[];
  filterable: boolean;
}

export interface CollectionInfoOptions {
  people: DimensionData;
  cameras: DimensionData;
  lenses: DimensionData;
  locations: DimensionData;
  dates: DimensionData;
  showHighlyRated: boolean;
  showDateSort: boolean;
}

/** Subset of options available after current filters are applied (for grey-out logic). null = no active filters. */
export type FilteredAvailableOptions = {
  people: readonly string[];
  cameras: readonly string[];
  lenses: readonly string[];
  locations: readonly string[];
  dates: readonly string[];
} | null;

interface CollectionFilterContextValue {
  filterState: FilterState;
  filterOptions: CollectionInfoOptions;
  filteredAvailable: FilteredAvailableOptions;
  onFilterChange: (update: Partial<FilterState>) => void;
  /**
   * Mutually-exclusive page sections leading the filter bar, or null on an unsectioned page.
   * Their presence alone is enough to render the bar — see the `hasOptions` gate in
   * CollectionPageClient — which is what gives a sectioned page the shared bar chrome (density
   * slider included) even when it has no facet dimensions of its own.
   */
  sections: readonly ToolbarSection[] | null;
  /** Key of the section currently rendered; null when {@link sections} is null. */
  activeSectionKey: string | null;
  /**
   * When true, the Date filter is always engaged and toggles only between directions
   * (asc <-> desc, never `off`) — used for CHRONOLOGICAL collections, which are inherently
   * date-ordered. Other views keep the neutral off/asc/desc tri-state.
   */
  dateTwoState: boolean;
  /** Density value in the active viewport's scale (desktop 1-10, mobile 1-5). */
  density: number;
  /** Upper bound of the density slider for the active viewport (10 or 5). */
  densityMax: number;
  /** Receives a value in the active viewport's scale; see {@link density}. */
  onDensityChange: (value: number) => void;
  /** `slider` gives edit mode the fine 1-`densityMax` control; visitors get the three tiers. */
  densityVariant: 'tiers' | 'slider';
  /** Photo-size presets on the CANONICAL desktop scale — NOT the viewport scale {@link density} uses. */
  densityTiers: readonly { key: string; label: string; value: number }[];
  /** Key of the tier nearest {@link density}. Highlight only — never written back to density. */
  activeDensityTier: string;
  /**
   * Receives a canonical desktop-scale value from {@link densityTiers}, bypassing the viewport
   * mapping {@link onDensityChange} applies. Halving/doubling is lossy at the Small tier, so a
   * tier must not round-trip through the mobile scale.
   */
  onDensityTierSelect: (value: number) => void;
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
