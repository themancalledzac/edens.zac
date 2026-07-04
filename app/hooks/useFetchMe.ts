'use client';

import { useEffect, useState } from 'react';

import { AUTH_CHANGED_EVENT, me as fetchMe } from '@/app/lib/api/auth';
import { type MeResponse } from '@/app/types/Auth';

export interface UseFetchMeResult {
  me: MeResponse | null;
  loading: boolean;
}

/**
 * Fetch the current principal via `me()` on mount, and refetch whenever
 * `AUTH_CHANGED_EVENT` fires on `window` (dispatched by `login()`/`loginWithPasskey()`/
 * `logout()` in `app/lib/api/auth`) — so always-mounted consumers update on auth
 * changes without a remount. `loading` is true only until the FIRST resolution;
 * refetches never flip it back, so consumers don't flash their loading state during
 * logout/login. `me` is null when logged out (or before the first resolution).
 *
 * This is the client-FETCH counterpart to `MeProvider`/`useMe`, which exposes the
 * server-resolved principal via context. Use this hook for surfaces rendered OUTSIDE
 * that provider — e.g. the always-mounted nav menu (`MenuDropdown`).
 */
export function useFetchMe(): UseFetchMeResult {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // Monotonic token: only the newest in-flight request may apply state, so a
    // stale response from a rapid logout/login pair can never overwrite a newer one.
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

    run();
    window.addEventListener(AUTH_CHANGED_EVENT, run);
    return () => {
      active = false;
      window.removeEventListener(AUTH_CHANGED_EVENT, run);
    };
  }, []);

  return { me, loading };
}
