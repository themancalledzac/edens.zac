'use client';

import { useEffect, useState } from 'react';

import { me as fetchMe } from '@/app/lib/api/auth';
import { type MeResponse } from '@/app/types/Auth';

export interface UseFetchMeResult {
  me: MeResponse | null;
  loading: boolean;
}

/**
 * Fetch the current principal via `me()` once on mount. `loading` is true until the
 * first resolution; `me` is null when logged out (or still loading).
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
    fetchMe()
      .then(result => {
        if (active) setMe(result);
      })
      .catch(() => {
        if (active) setMe(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { me, loading };
}
