'use client';

import { useEffect, useState } from 'react';

import { me as fetchMe } from '@/app/lib/api/auth';
import { type MeResponse } from '@/app/types/Auth';

export interface UseMeResult {
  me: MeResponse | null;
  loading: boolean;
  refresh: () => void;
}

/**
 * Resolve the current principal via `me()` on mount. `loading` is true until the
 * first resolution; `me` is null when logged out (or still loading). `refresh()`
 * re-runs the fetch (e.g. after a login/logout elsewhere on the page).
 */
export function useMe(): UseMeResult {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
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
  }, [nonce]);

  return { me, loading, refresh: () => setNonce(n => n + 1) };
}
