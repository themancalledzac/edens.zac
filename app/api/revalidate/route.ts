import { revalidatePath, revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

import { isLocalEnvironment } from '@/app/utils/environment';
import { isAllowedWriteOrigin } from '@/app/utils/originAllowlist';

/**
 * Revalidate Collection Cache
 *
 * Route handler to revalidate Next.js cache tags and paths for collections.
 * Called after image updates to ensure collection pages show fresh data.
 *
 * POST /api/revalidate
 * Body: { tag?: string, tags?: string[], path?: string } - cache tags and/or path to revalidate
 *
 * Gated outside local/dev on the presence of an `ezac_session` cookie — the same check
 * `proxy.ts` applies to the (admin) route group, and for the same reason: a route handler
 * cannot validate a session, only observe one. `proxy.ts` does not match `/api/*`, so
 * without this gate any anonymous caller could loop `{ path: "/" }` and permanently bust
 * the ISR cache, pushing every render to Lambda and Spring. The only callers are
 * `revalidateCollectionCache` / `revalidateMetadataCache` in the admin edit UI, which is
 * already behind that cookie and sends it on same-origin fetches.
 *
 * The session check alone does not stop CSRF — the browser attaches that cookie to cross-site
 * POSTs too — so the request must also carry an allowed `Origin`, via the same helper the proxy
 * uses. The Origin check applies in every environment, local included, and it is NOT gated the
 * same way the cookie check above is. `isLocalEnvironment()` is
 * `NEXT_PUBLIC_ENV === 'local' || NODE_ENV === 'development'`, while the dev-port and LAN
 * allowance inside `isAllowedWriteOrigin` is `NODE_ENV === 'development'` only
 * (`originAllowlist.ts:86`). `next dev` satisfies both, so ordinary local work is unaffected and
 * localhost admin still needs no login there (D6).
 *
 * A local PRODUCTION build is the gap: `NEXT_PUBLIC_ENV=local` plus `next start` sets
 * `NODE_ENV=production`, so the cookie gate is skipped while `http://localhost:3000` matches
 * neither the configured app origin nor the now-inactive dev-port regex — every revalidate 403s.
 * Silently, because the client callers resolve the fetch on a 403 and their catch never fires.
 * Availability-only and fails closed; no server code POSTs this route (every caller is
 * `'use client'`), so D6+D8 still admit every real production caller.
 *
 * Order matters. The session check runs first so an anonymous caller still gets 401 rather than
 * a 403 that would suggest the origin was the problem.
 */
export async function POST(req: NextRequest) {
  if (!isLocalEnvironment() && !req.cookies.get('ezac_session')?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAllowedWriteOrigin(req.headers.get('origin'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { tag, tags, path } = body;

    if (!tag && !tags && !path) {
      return NextResponse.json({ error: 'Either tag, tags, or path is required' }, { status: 400 });
    }

    // Revalidate single cache tag if provided
    if (tag && typeof tag === 'string') {
      revalidateTag(tag, 'max');
    }

    // Revalidate multiple cache tags if provided
    if (Array.isArray(tags)) {
      for (const t of tags) {
        if (typeof t === 'string') {
          revalidateTag(t, 'max');
        }
      }
    }

    // Revalidate path if provided
    if (path && typeof path === 'string') {
      revalidatePath(path);
    }

    return NextResponse.json({
      revalidated: true,
      tag: tag || undefined,
      tags: tags || undefined,
      path: path || undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to revalidate cache', detail: message },
      { status: 500 }
    );
  }
}
