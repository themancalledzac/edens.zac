import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

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
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  // Trim trailing slash
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
    if ([
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
    ].includes(k)) {
      continue;
    }
    headers.set(key, value);
  }
  // Ensure JSON by default for non-multipart when client did not set
  if (!headers.has('accept')) headers.set('accept', 'application/json, */*;q=0.1');
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

  const init: RequestInit = {
    method,
    headers: forwardHeaders(req),
    // Pass through the body for methods that can have one
    body: ['GET', 'HEAD'].includes(method) ? undefined : req.body,
    // Enable streaming/opaque forwarding
    redirect: 'manual',
  };

  let backendRes: Response;
  try {
    backendRes = await fetch(targetUrl, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Proxy fetch failed', detail: message, targetUrl }, { status: 502 });
  }

  // Create a new response with streamed body and copied headers/status
  const resHeaders = new Headers(backendRes.headers);
  // Remove hop-by-hop headers if present
  resHeaders.delete('content-encoding');
  resHeaders.delete('transfer-encoding');
  resHeaders.delete('connection');

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
