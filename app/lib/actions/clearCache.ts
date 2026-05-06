'use server';

import { revalidatePath } from 'next/cache';

import { fetchAdminPostJsonApi } from '@/app/lib/api/core';

export type ClearCacheResult = { ok: true } | { ok: false; error: string };

// "Clear Cache" does two things:
//   1. POSTs to the dev-only backend endpoint /api/admin/cache/clear, which
//      currently evicts the admin home tile cover cache.
//   2. revalidatePath('/', 'layout') to nuke the Next.js route cache so the
//      next render re-fetches.
// Step (2) is independent of (1) — FE-side cache invalidation is still useful
// even if the backend POST fails.
export async function clearCacheAction(): Promise<ClearCacheResult> {
  let backendError: string | null = null;
  try {
    await fetchAdminPostJsonApi<unknown>('/cache/clear', {});
  } catch (error) {
    backendError = error instanceof Error ? error.message : 'Unknown error';
  }

  try {
    revalidatePath('/', 'layout');
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }

  if (backendError) {
    return { ok: false, error: `Backend cache clear failed: ${backendError}` };
  }
  return { ok: true };
}
