import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Proxy route for backend API
 * - Forwards requests under /api/proxy/* to the backend defined by NEXT_PUBLIC_API_URL
 * - Falls back to http://localhost:8080 when env var is not set (developer-friendly)
 * - Preserves method, headers (filtered), body, and streams the response back
 */

function getBackendBase(): string {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  // Trim trailing slash
  return base.replace(/\/+$/, '');
}

function buildTargetUrl(pathParts: string[], search: string): string {
  // pathParts already contains everything after /api/proxy
  const targetPath = pathParts.join('/');
  const base = getBackendBase();
  const url = `${base}/${targetPath.replace(/^\/+/, '')}`;
  return search ? `${url}${search}` : url;
}

// Filter out headers that should not be forwarded or managed by fetch automatically
function forwardHeaders(req: NextRequest): Headers {
  const headers = new Headers();
  for (const [key, value] of req.headers) {
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

async function handle(req: NextRequest, context: { params: { path: string[] } }) {
  const { params } = context;
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
