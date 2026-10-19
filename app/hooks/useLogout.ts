'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { clearCachedPanelData } from '@/app/hooks/useCachedPanelData';
import { logout } from '@/app/lib/api/auth';

/**
 * Returns a handler that signs the viewer out, clears cached admin panel data, sends them home
 * and then calls `onDone`. The cache clear and redirect run even when `logout()` rejects: the
 * cookie may already be gone, and admin emails or message bodies must not outlive the session.
 */
export function useLogout(onDone?: () => void) {
  const router = useRouter();

  return useCallback(() => {
    void (async () => {
      await logout().catch(() => {});
      clearCachedPanelData();
      router.push('/');
      router.refresh();
      onDone?.();
    })();
  }, [router, onDone]);
}
