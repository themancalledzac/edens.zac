'use client';

import { useEffect, useState } from 'react';

import { AUTH_CHANGED_EVENT, me as fetchMe } from '@/app/lib/api/auth';
import { type MeResponse } from '@/app/types/Auth';

export interface UseFetchMeResult {
  me: MeResponse | null;
  loading: boolean;
}

export interface UseFetchMeOptions {
  /** Server-resolved principal; `undefined` means unresolved, `null` means anonymous. */
  initialMe?: MeResponse | null;
  /** Gates the first request when `initialMe` is undefined. */
  enabled?: boolean;
}

/**
 * Resolve the current principal for surfaces that cannot rely on `MeProvider`.
 *
 * With `initialMe` supplied (value or `null`) the hook starts from it, reports `loading: false`,
 * makes no request on mount, and follows `initialMe` when it changes (a `router.refresh()` after
 * login or logout). With `initialMe` undefined it makes no request until `enabled` is true, then
 * exactly one, and `loading` stays true until that first resolution.
 *
 * In both modes `AUTH_CHANGED_EVENT` on `window` (dispatched by `login()`/`loginWithPasskey()`/
 * `logout()` in `app/lib/api/auth`) refetches while mounted, and only the newest in-flight
 * response may apply state, so a stale response from a rapid logout/login pair never overwrites a
 * newer one. Refetches never flip `loading` back to true.
 */
export function useFetchMe(options: UseFetchMeOptions = {}): UseFetchMeResult {
  const { initialMe, enabled = false } = options;
  const seeded = initialMe !== undefined;
  const [me, setMe] = useState<MeResponse | null>(initialMe ?? null);
  const [loading, setLoading] = useState(!seeded);

  useEffect(() => {
    if (initialMe !== undefined) setMe(initialMe);
  }, [initialMe]);

  useEffect(() => {
    let active = true;
    let latestRequest = 0;

    const run = () => {
      const requestId = ++latestRequest;
      const isCurrent = () => active && requestId === latestRequest;
      fetchMe()
        .then(result => {
          if (isCurrent()) setMe(result);
        })
        .catch(() => {
          if (isCurrent()) setMe(null);
        })
        .finally(() => {
          if (isCurrent()) setLoading(false);
        });
    };

    if (!seeded && enabled) run();
    window.addEventListener(AUTH_CHANGED_EVENT, run);
    return () => {
      active = false;
      window.removeEventListener(AUTH_CHANGED_EVENT, run);
    };
  }, [seeded, enabled]);

  return { me, loading: seeded ? false : loading };
}
