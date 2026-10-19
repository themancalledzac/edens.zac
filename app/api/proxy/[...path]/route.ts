import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/app/utils/logger';
import { isAllowedWriteOrigin } from '@/app/utils/originAllowlist';

/** Returns the backend base URL from `API_URL`, normalized (no trailing slash). */
function getBackendBase(): string {
  const base = process.env.API_URL || 'http://localhost:8080';
  return base.replace(/\/+$/, '');
}

/** Builds the full backend URL from path segments and the original query string. */
function buildTargetUrl(pathParts: string[], search: string): string {
  const targetPath = pathParts.join('/');
  const base = getBackendBase();
  const url = `${base}/${targetPath.replace(/^\/+/, '')}`;
  return search ? `${url}${search}` : url;
}

/**
 * Resolves a proxied path the way the URL parser inside `fetch` will.
 *
 * Dot segments are resolved during parsing, so `api/../actuator/env`, its `%2e%2e` spelling
 * and the backslash variant would all be requested as `/actuator/env`. Every path check runs
 * on this one value, so no two checks can disagree about what the path is.
 */
function normalizePath(resolvedPath: string): string {
  return new URL(resolvedPath, 'http://proxy.invalid/').pathname;
}

/**
 * True when the normalized path is one the proxy may forward.
 *
 * The backend serves more than `/api` — Spring Boot's actuator among it — and this proxy injects
 * `X-Internal-Secret` on every hop, so restricting forwarding to `api/**` keeps the rest
 * unreachable. `;` is rejected with it because Tomcat strips path parameters per segment before
 * routing: `api/..;/actuator/env` reads as an `/api/` path here but resolves to `/actuator/env`
 * there. `%3B` goes too, being the same trick one decode later.
 */
function isProxyableApiPath(normalized: string): boolean {
  return normalized.startsWith('/api/') && !/;|%3b/i.test(normalized);
}

/**
 * True when a request is anonymous access to a privileged surface in production.
 *
 * Belt and suspenders only — the backend's own `hasRole('ADMIN')` and per-collection role checks
 * stay authoritative, and `api/dev/**` is dev-only and `@Profile`-gated there. Production alone,
 * because localhost admin has no login; the match is exact and case-sensitive because this is a
 * cheap early reject rather than the real gate.
 */
function isAnonymousPrivilegedRequest(req: NextRequest, normalized: string): boolean {
  return (
    process.env.NODE_ENV === 'production' &&
    (normalized.startsWith('/api/admin/') || normalized.startsWith('/api/edit/')) &&
    !req.cookies.get('ezac_session')?.value
  );
}

/**
 * Strips hop-by-hop and platform-specific headers, re-injects a sanitized real-IP,
 * and adds the internal API secret before forwarding to the backend.
 *
 * The real IP is the first hop of `x-vercel-forwarded-for`, else the last hop of
 * `x-forwarded-for`, which the trusted edge (CloudFront/Amplify) appends. `x-real-ip` is never
 * trusted because clients control it. TODO(CloudFlare Phase 2): drop the injection and use
 * `CF-Connecting-IP`.
 */
function forwardHeaders(req: NextRequest): Headers {
  const headers = new Headers();
  for (const [key, value] of req.headers.entries()) {
    const k = key.toLowerCase();
    if (
      [
        'connection',
        'content-length',
        'host',
        'accept-encoding',
        'cf-ray',
        'cf-connecting-ip',
        'true-client-ip',
        'x-real-ip',
        'forwarded',
        'x-forwarded-for',
        'x-forwarded-proto',
        'x-forwarded-host',
        'x-vercel-ip-city',
        'x-vercel-ip-country',
        'x-vercel-ip-region',
      ].includes(k)
    ) {
      continue;
    }
    headers.set(key, value);
  }
  if (!headers.has('accept')) headers.set('accept', 'application/json, */*;q=0.1');
  const realIpRaw =
    req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-forwarded-for')?.split(',').pop()?.trim() ??
    '';
  if (realIpRaw && /^[\d.:A-Fa-f]+$/.test(realIpRaw)) {
    headers.set('X-Real-IP', realIpRaw);
  }
  headers.set('X-Internal-Secret', process.env.INTERNAL_API_SECRET ?? '');
  return headers;
}

/**
 * Universal proxy handler — forwards all HTTP methods to the backend with CORS and size guards.
 *
 * Body limits are 16 KB for JSON writes and 25 MB for multipart. Content-Length is only a fast
 * reject; the buffered size is checked again. The body is a `Uint8Array` because Amplify's undici
 * build rejects a bare `ArrayBuffer` with a 502. Set-Cookie is re-emitted one header at a time
 * through `getSetCookie()`, since the Headers constructor comma-joins repeats and corrupts cookies
 * whose Expires attribute contains a comma.
 */
async function handle(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  const method = req.method;
  const pathParts = params.path || [];
  const resolvedPath = pathParts.join('/').replace(/^\/+/, '');
  const normalized = normalizePath(resolvedPath);

  if (!isProxyableApiPath(normalized)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const targetUrl = buildTargetUrl(pathParts, req.nextUrl.search);

  if (isAnonymousPrivilegedRequest(req, normalized)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const writeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

  const contentType = req.headers.get('content-type') ?? '';
  const isMultipart = contentType.startsWith('multipart/form-data');
  const maxBytes = isMultipart ? 25 * 1024 * 1024 : 16 * 1024;

  if (writeMethods.has(method)) {
    if (!isAllowedWriteOrigin(req.headers.get('origin'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const declaredLength = Number(req.headers.get('content-length') ?? '0');
    if (declaredLength > maxBytes) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
  }

  const body = ['GET', 'HEAD'].includes(method)
    ? undefined
    : new Uint8Array(await req.arrayBuffer());

  if (writeMethods.has(method) && body && body.byteLength > maxBytes) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const init: RequestInit = {
    method,
    headers: forwardHeaders(req),
    body,
    redirect: 'manual',
  };

  let backendRes: Response;
  try {
    backendRes = await fetch(targetUrl, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined;
    logger.error('proxy', message, undefined, { code });
    return NextResponse.json({ error: 'Bad gateway' }, { status: 502 });
  }

  const resHeaders = new Headers(backendRes.headers);
  resHeaders.delete('content-encoding');
  resHeaders.delete('transfer-encoding');
  resHeaders.delete('connection');
  resHeaders.delete('set-cookie');
  for (const cookie of backendRes.headers.getSetCookie()) {
    resHeaders.append('Set-Cookie', cookie);
  }

  return new NextResponse(backendRes.body, {
    status: backendRes.status,
    headers: resHeaders,
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const PATCH = handle;
