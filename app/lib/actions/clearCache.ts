'use server';

import { revalidatePath } from 'next/cache';

import { meServer } from '@/app/lib/api/auth';
import { fetchAdminPostJsonApi } from '@/app/lib/api/core';
import { isLocalEnvironment } from '@/app/utils/environment';

export type ClearCacheResult = { ok: true } | { ok: false; error: string };

/**
 * Authorization for {@link clearCacheAction}.
 *
 * Local/dev returns true WITHOUT resolving a principal, matching `requireAdmin()` and the
 * standing "localhost admin needs no login" rule — the point of that rule is reachability
 * without a login, so this must not even ask.
 *
 * Everywhere else the acting principal's row-level `isAdmin` flag decides. `meServer()`
 * returns null for anonymous callers (a 401 from `/api/auth/me`) and throws on any other
 * non-OK response; both are unauthorized here, so a backend that is down or erroring fails
 * closed rather than opening the purge.
 *
 * Not exported: a `'use server'` module turns every export into a callable Server Action,
 * and an exported gate would be one more public entry point for no gain.
 */
async function isAuthorizedToClearCache(): Promise<boolean> {
  if (isLocalEnvironment()) return true;

  try {
    const principal = await meServer();
    return principal?.isAdmin === true;
  } catch {
    return false;
  }
}

/**
 * "Clear Cache" does two things:
 *   1. POSTs to the dev-only backend endpoint `/api/admin/cache/clear`, which currently
 *      evicts the admin home tile cover cache.
 *   2. `revalidatePath('/', 'layout')` to nuke the Next.js route cache so the next render
 *      re-fetches.
 *
 * Step (2) is independent of (1) — FE-side cache invalidation is still useful even if the
 * backend POST fails.
 *
 * That independence is exactly why this needs an admin gate (D2). This action is imported by
 * a `'use client'` component, so its action ID ships in the public bundle and anyone can
 * invoke it with a `Next-Action` POST. The backend leg already 401s for an anonymous caller,
 * but step (2) runs in its own `try` regardless — so without this gate an anonymous caller
 * could loop a global route-cache purge, pushing every subsequent render back to Lambda and
 * Spring. Cost and DoS amplifier, not data exposure.
 *
 * The check is deliberately NOT the one `/api/revalidate` uses (D1). A route handler can only
 * observe an `ezac_session` cookie; a Server Action runs in a request scope where `meServer()`
 * resolves the principal, so this asserts the real `isAdmin` flag. Sharing one helper between
 * the two would either weaken this to cookie presence or ask of D1 something it cannot do.
 *
 * A rejected call returns `{ ok: false }` rather than redirecting, because the caller
 * (`MenuDropdown`) already branches on the result and a `redirect()` from a Server Action
 * would navigate a legitimately-signed-out user mid-click.
 */
export async function clearCacheAction(): Promise<ClearCacheResult> {
  if (!(await isAuthorizedToClearCache())) {
    return { ok: false, error: 'Unauthorized' };
  }

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
