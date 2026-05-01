import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/app/utils/logger';

/**
 * Get Backend Base URL
 *
 * Retrieves the backend API base URL from environment variables with
 * fallback to localhost for development. Normalizes URL by removing
 * trailing slashes for consistent path construction.
 *
 * @returns Normalized backend base URL
 */
function getBackendBase(): string {
  const base = process.env.API_URL || 'http://localhost:8080';
  return base.replace(/\/+$/, '');
}

/**
 * Build Target URL
 *
 * Constructs the full backend URL from path segments and search parameters.
 * Handles path normalization and query string preservation for proxying.
 *
 * @param pathParts - Array of URL path segments after /api/proxy
 * @param search - Query string including leading '?' if present
 * @returns Complete target URL for backend request
 */
function buildTargetUrl(pathParts: string[], search: string): string {
  // pathParts already contains everything after /api/proxy
  const targetPath = pathParts.join('/');
  const base = getBackendBase();
  const url = `${base}/${targetPath.replace(/^\/+/, '')}`;
  return search ? `${url}${search}` : url;
}

/**
 * Forward Headers
 *
 * Filters and forwards request headers to the backend, excluding hop-by-hop
 * headers and platform-specific headers that shouldn't be proxied. Ensures
 * JSON accept header for API compatibility.
 *
 * @param req - Incoming Next.js request object
 * @returns Filtered headers safe for backend forwarding
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
  // Ensure JSON by default for non-multipart when client did not set
  if (!headers.has('accept')) headers.set('accept', 'application/json, */*;q=0.1');
  // Forward sanitized real client IP for backend rate limiting.
  // We strip x-forwarded-for / x-vercel-ip-* above to prevent header smuggling,
  // then re-inject only what we trust.
  const realIpRaw =
    req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '';
  if (realIpRaw && /^[\d.:A-Fa-f]+$/.test(realIpRaw)) {
    headers.set('X-Real-IP', realIpRaw);
  }
  headers.set('X-Internal-Secret', process.env.INTERNAL_API_SECRET ?? '');
  return headers;
}

/**
 * Proxy Handler
 *
 * Universal handler for all HTTP methods that forwards requests to the backend
 * API. Handles request transformation, error handling, and response streaming
 * with proper header filtering for both directions.
 *
 * @dependencies
 * - Next.js server APIs for request/response handling
 * - Backend API for actual data processing
 * - Helper functions for URL construction and header filtering
 *
 * @param req - Incoming Next.js request
 * @param context - Route context containing dynamic path parameters
 * @returns Proxied response from backend or error response
 */
async function handle(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  const method = req.method;
  const targetUrl = buildTargetUrl(params.path || [], req.nextUrl.search);

  const ALLOWED_ORIGINS = new Set(
    [
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
      process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : null,
    ].filter(Boolean) as string[]
  );

  const writeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  if (writeMethods.has(method)) {
    const origin = req.headers.get('origin');
    if (!origin || !ALLOWED_ORIGINS.has(origin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const contentLength = Number(req.headers.get('content-length') ?? '0');
    if (contentLength > 16384) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
  }

  // Buffer the body: NextRequest.body is a ReadableStream, and undici fetch
  // requires `duplex: 'half'` to forward streams. Buffering avoids the streaming
  // path and lets undici set Content-Length. Safe given the 16 KB cap above.
  //
  // The body must be wrapped in a Uint8Array view rather than passed as a raw
  // ArrayBuffer. AWS Amplify's SSR Lambda runtime ships an undici build that
  // throws synchronously on bare ArrayBuffer bodies (manifesting as a 502
  // "Bad Gateway" on every write through this proxy in production while the
  // Next.js dev server accepts it fine). Uint8Array is what undici handles
  // uniformly across all Node runtimes — local dev, Vercel, and Amplify.
  const body = ['GET', 'HEAD'].includes(method)
    ? undefined
    : new Uint8Array(await req.arrayBuffer());

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
    logger.error('proxy', message, error);
    return NextResponse.json({ error: 'Bad gateway' }, { status: 502 });
  }

  // Create a new response with streamed body and copied headers/status
  const resHeaders = new Headers(backendRes.headers);
  // Remove hop-by-hop headers if present
  resHeaders.delete('content-encoding');
  resHeaders.delete('transfer-encoding');
  resHeaders.delete('connection');

  // Multiple `Set-Cookie` headers are valid (e.g. an auth cookie + a CSRF
  // cookie in one response). The Headers constructor combines repeated
  // headers into a single comma-joined value, which corrupts cookies that
  // contain commas in the Expires attribute. We re-emit each Set-Cookie
  // explicitly via getSetCookie() so the browser sees the original list.
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
