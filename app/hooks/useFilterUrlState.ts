'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';

import {
  type ContentFilterCriteria,
  FILTER_PARAM_KEYS,
  parseFilterFromParams,
  serializeFilterToParams,
} from '@/app/utils/contentFilter';

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
 *   Only the filter keys are rewritten; other params such as `?image=<id>` are kept. The
 *   write is skipped when the URL would not change (e.g. the Order chip is local-only),
 *   because replacing a URL with itself still refetches the RSC payload and can make a
 *   per-request cover change and the header row resize.
 */
export function useFilterUrlState(): {
  initialCriteria: ContentFilterCriteria;
  syncToUrl: (criteria: ContentFilterCriteria) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [initialCriteria] = useState<ContentFilterCriteria>(() =>
    parseFilterFromParams(new URLSearchParams(searchParams.toString()))
  );

  const syncToUrl = useCallback(
    (criteria: ContentFilterCriteria) => {
      const params = new URLSearchParams(window.location.search);
      for (const k of FILTER_PARAM_KEYS) params.delete(k);
      for (const [k, v] of serializeFilterToParams(criteria)) params.append(k, v);
      const qs = params.toString();
      const next = qs ? `${pathname}?${qs}` : pathname;

      if (next === `${window.location.pathname}${window.location.search}`) return;

      router.replace(next, { scroll: false });
    },
    [router, pathname]
  );

  return { initialCriteria, syncToUrl };
}
