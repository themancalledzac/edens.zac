'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';

import {
  type ContentFilterCriteria,
  parseFilterFromParams,
  serializeFilterToParams,
} from '@/app/utils/contentFilter';

/**
 * Query keys the filter layer owns. MUST mirror serializeFilterToParams in
 * contentFilter.ts — these are the only keys syncToUrl is allowed to clear, so
 * any param it doesn't own (e.g. `image` for the fullscreen deep-link) survives.
 */
const FILTER_PARAM_KEYS = [
  'rating',
  'people',
  'location',
  'tag',
  'camera',
  'q',
  'from',
  'to',
  'isFilm',
  'bw',
  'collection',
] as const;

/**
 * Bridges the tested filter-URL helpers (parseFilterFromParams /
 * serializeFilterToParams) to a gallery client's local filter state so filtered
 * views are shareable and Back-correct.
 *
 * - `initialCriteria` seeds local state from the URL on first render. It is
 *   parsed once and held stable: once the page is interactive, the hook itself
 *   owns the URL, so later param changes are our own writes and must not re-seed.
 * - `syncToUrl(criteria)` writes serialized params back via router.replace
 *   (no scroll jump, no history entry per change — the page entry stays the
 *   Back target). Empty criteria collapse to the bare pathname for a clean URL.
 */
export function useFilterUrlState(): {
  initialCriteria: ContentFilterCriteria;
  syncToUrl: (criteria: ContentFilterCriteria) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse once from the first-render params via a lazy initializer; subsequent
  // URL writes are ours, so re-seeding from them would clobber in-flight user
  // selections. searchParams is intentionally read only on mount.
  const [initialCriteria] = useState<ContentFilterCriteria>(() =>
    parseFilterFromParams(new URLSearchParams(searchParams.toString()))
  );

  const syncToUrl = useCallback(
    (criteria: ContentFilterCriteria) => {
      // Merge into the live URL: drop only the filter keys we own (so a removed
      // filter clears), then write the serialized ones. Params we don't own —
      // notably `?image=<id>` for the fullscreen deep-link — are preserved.
      const params = new URLSearchParams(window.location.search);
      for (const k of FILTER_PARAM_KEYS) params.delete(k);
      for (const [k, v] of serializeFilterToParams(criteria)) params.append(k, v);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );

  return { initialCriteria, syncToUrl };
}
