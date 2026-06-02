'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';

import {
  type ContentFilterCriteria,
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
      const qs = serializeFilterToParams(criteria).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );

  return { initialCriteria, syncToUrl };
}
