import { revalidatePath, revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

import { isLocalEnvironment } from '@/app/utils/environment';

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
 * This closes the anonymous path, not CSRF: the route still has no Origin allowlist, so an
 * authenticated admin visiting a hostile page can be made to fire it. Tracked as D6.
 */
export async function POST(req: NextRequest) {
  if (!isLocalEnvironment() && !req.cookies.get('ezac_session')?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
