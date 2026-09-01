import { isLocalEnvironment } from '@/app/utils/environment';
import { logger } from '@/app/utils/logger';
import { configuredAppOrigin } from '@/app/utils/originAllowlist';

const READ = 'read';
const ADMIN = 'admin';
const EDIT = 'edit';

/**
 * On the server, forward incoming browser cookies on outgoing fetches so that the backend
 * sees per-gallery `gallery_access_<slug>` cookies on RSC re-fetches (e.g. after
 * `router.refresh()` from the client gallery gate).
 *
 * Returns `null` in the browser — fetch already attaches same-origin cookies automatically.
 */
export async function getServerCookieHeader(): Promise<string | null> {
  if (typeof window !== 'undefined') return null;

  // Skip entirely during the production build phase. Next.js's `cookies()`
  // throws `DynamicServerError` (digest: 'DYNAMIC_SERVER_USAGE') outside a
  // request scope, and the digest is recorded at the call site — *before*
  // any try/catch we wrap around it. For routes that also declare
  // `generateStaticParams`, that digest fails the build ("can't render
  // statically because it used `cookies`"), even when our catch swallows
  // the thrown error. Skipping the call entirely during build avoids
  // triggering the digest. At build time no user request context exists,
  // so there's no `gallery_access_<slug>` cookie to forward anyway.
  if (process.env.NEXT_PHASE === 'phase-production-build') return null;

  try {
    // Lazy import: `next/headers` is only available in the server runtime.
    const { cookies } = await import('next/headers');
    const store = await cookies();
    const all = store.getAll();
    if (all.length === 0) return null;
    return all.map(c => `${c.name}=${c.value}`).join('; ');
  } catch (error: unknown) {
    // `cookies()` throws whenever there's no request context — at build time,
    // inside `generateStaticParams`, inside `unstable_cache`, during ISR
    // background revalidation, or otherwise outside a per-request scope.
    // All of those mean "no cookies to forward", not a real failure.
    if (
      error instanceof Error &&
      /outside a request scope|generatestaticparams|without an http request|rendered statically|dynamic server usage/i.test(
        error.message
      )
    ) {
      return null;
    }
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as { digest?: unknown }).digest === 'DYNAMIC_SERVER_USAGE'
    ) {
      return null;
    }
    // Any other unexpected error: warn and degrade gracefully rather than breaking the fetch.
    logger.warn('getServerCookieHeader', 'Unexpected error reading cookies', { error });
    return null;
  }
}

/**
 * Core API utilities for making requests to the backend
 */

/**
 * Base API URL for an endpoint type. Browser uses the relative same-origin proxy (LAN-reachable
 * in dev, BFF in prod); server-side hits the backend directly on localhost in dev, else the proxy.
 *
 * The production server-side arm goes through {@link configuredAppOrigin} rather than reading
 * `NEXT_PUBLIC_APP_URL` raw, so a trailing slash in the env var cannot produce
 * `https://host//api/proxy/...`. That is the same normalization `/api/revalidate` and the BFF
 * apply to the Origin allowlist; sharing the one helper is what keeps the two from disagreeing
 * about what the env var means.
 *
 * An unset or unparseable value still yields a relative URL here, which Node `fetch` rejects at
 * the call site. That is unchanged and deliberate at this size — it is a deploy that never
 * configured its own URL, and every arm of this function is exercised only after that.
 */
export function getApiBaseUrl(endpointType: string): string {
  if (typeof window !== 'undefined') {
    return `/api/proxy/api/${endpointType}`;
  }
  if (isLocalEnvironment()) {
    return `http://localhost:8080/api/${endpointType}`;
  }
  return `${configuredAppOrigin() ?? ''}/api/proxy/api/${endpointType}`;
}

/**
 * Build a simple API URL without query parameters (for use with fetch options)
 */
function buildSimpleApiUrl(endpointType: string, endpoint: string): string {
  const baseUrl = getApiBaseUrl(endpointType);
  return `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
}

/**
 * Custom error class for API responses
 */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * Throw an `ApiError` carrying the backend's own message for a non-OK response.
 *
 * Prefers a plain-text body, then a JSON `message` field, then the whole JSON body, and falls back
 * to the status only when the body yields nothing usable. A body that fails to parse is treated as
 * absent rather than propagated, so a malformed error response still surfaces as an `ApiError`
 * carrying the real status.
 *
 * The status matters as much as the message: callers branch on `ApiError.status` rather than on
 * copy — `ShareCard`'s `mapError` turns 401/403/409 into three different sentences — so this must
 * always construct with `res.status`.
 *
 * Was duplicated byte-for-byte in `auth.ts`, `personal.ts`, `share.ts` and `selects.ts` before E2.
 * The near-identical inline handlers in `collections.ts` and `users.ts` are deliberately NOT folded
 * in: each differs in behaviour, and those differences are unpinned. See the E2 board entry.
 */
export async function throwFromResponse(res: Response): Promise<never> {
  let detail: unknown;
  const contentType = res.headers.get('content-type') || '';
  try {
    detail = contentType.includes('application/json') ? await res.json() : await res.text();
  } catch {
    detail = '';
  }
  const message =
    typeof detail === 'string' && detail
      ? detail
      : detail && typeof detail === 'object'
        ? ((detail as { message?: string }).message ?? JSON.stringify(detail))
        : `API error: ${res.status}`;
  throw new ApiError(message, res.status);
}
/**
 * Options for {@link clientFetch}. Mirrors `RequestInit`, except that `body` is replaced by `json`:
 * every current caller sends JSON or nothing, and letting both through would reintroduce the
 * "did I remember the Content-Type header" question this helper exists to answer once.
 */
export interface ClientFetchOptions extends Omit<RequestInit, 'body'> {
  /** Serialized to the request body, with the JSON `Content-Type` set for you. */
  json?: unknown;
}

/**
 * Browser-side fetch against the BFF proxy, with the four things every such call needs.
 *
 * `credentials: 'same-origin'` so the proxy's `Set-Cookie` is accepted and the session cookie is
 * sent; `cache: 'no-store'` because these are all reads of per-user state or mutations; the JSON
 * `Content-Type` whenever there is a body; and a non-OK response converted by
 * {@link throwFromResponse} into an `ApiError` carrying the real status.
 *
 * Returns the `Response` rather than parsed data so `204`-returning mutations do not have to
 * pretend to decode a body. Use {@link clientFetchJson} when there is a body to read.
 *
 * Callers may override any default by passing it — `...rest` is spread after them.
 *
 * NOT for the calls whose contract is "a non-OK status is data": `me()` and `meServer()` return
 * `null` on 401, and `getInvitePreview` maps 410 and every other failure to a status object. Those
 * stay on raw `fetch` on purpose, because routing them through a helper that throws would mean
 * catching an exception to recover a value the response already gave us.
 */
export async function clientFetch(
  url: string,
  options: ClientFetchOptions = {}
): Promise<Response> {
  const { json, headers, ...rest } = options;
  const res = await fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...rest,
    headers: json === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
    ...(json === undefined ? {} : { body: JSON.stringify(json) }),
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
  return res;
}

/**
 * {@link clientFetch} plus `res.json()`, for the calls that read a body.
 *
 * The cast is unchecked, exactly as it was at each call site before this helper existed — it moves
 * the assertion, it does not add validation. `validateClientGalleryAccess` runtime-validates its
 * own response and is not a caller.
 */
export async function clientFetchJson<T>(
  url: string,
  options: ClientFetchOptions = {}
): Promise<T> {
  const res = await clientFetch(url, options);
  return (await res.json()) as T;
}

/**
 * Unified error handling for API requests
 * Handles both Response errors and catch block errors
 *
 * @param error - Error to handle (can be Response, Error, ApiError, or unknown)
 * @param response - Optional Response object (if error is a Response, this should be the same)
 * @returns Never (always throws ApiError)
 * @throws ApiError with appropriate message and status code
 */
async function throwApiError(error: unknown, response?: Response): Promise<never> {
  if (error instanceof ApiError) {
    throw error;
  }

  // Duck-type check instead of instanceof — Response may not be available in all environments
  const responseObj =
    error &&
    typeof error === 'object' &&
    'status' in error &&
    'statusText' in error &&
    'json' in error
      ? (error as Response)
      : response;
  if (responseObj) {
    const errorData = await responseObj.json().catch(() => null);
    throw new ApiError(
      errorData?.message || `API error: ${responseObj.status} ${responseObj.statusText}`,
      responseObj.status
    );
  }

  throw new ApiError(error instanceof Error ? error.message : 'Unknown error occurred', 500);
}

/**
 * The one server-side fetch skeleton in this file: URL building, SSR cookie forwarding, error
 * conversion, 204 to null, and JSON parsing. Every exported fetcher below is a thin wrapper that
 * picks a channel and a method.
 *
 * Sets no `Content-Type` of its own. The wrappers that send a JSON body set it; the ones that do
 * not leave it off — bodyless GETs, and `fetchAdminFormDataApi`, whose multipart boundary only the
 * browser can fill in.
 *
 * On the server, forwards the inbound cookies so the backend sees the caller's session: the
 * `ezac_session` cookie behind admin authorization (`hasRole('ADMIN')`) on `/admin` and
 * `/admin/users/[id]`, and the per-gallery `gallery_access_<slug>` cookies on RSC re-fetches.
 * `getServerCookieHeader` returns null in the browser and at build time, so this affects SSR only.
 *
 * `forwardCookies: false` skips that read entirely — see {@link fetchPublicRead}, the only caller
 * that passes it. It is a parameter rather than two copies of this function because everything
 * else here (URL building, error conversion, 204 handling, parsing) must not diverge between the
 * two paths.
 *
 * Each way a request can fail reaches {@link throwApiError} exactly once: a rejected `fetch`, a
 * non-OK status, or a body that will not parse.
 *
 * @param channel - Backend channel segment the request goes to
 * @param endpoint - API endpoint path (without the base URL)
 * @param options - Fetch options
 * @param forwardCookies - When false, the request carries no Cookie header and `cookies()` is
 *   never called. Defaults to true so a new wrapper cannot drop the session by omission.
 * @returns The parsed response data, or null for a 204
 * @throws ApiError if the request fails
 */
const fetchBase = async <T>(
  channel: typeof READ | typeof ADMIN | typeof EDIT,
  endpoint: string,
  options: RequestInit = {},
  forwardCookies = true
): Promise<T | null> => {
  const url = buildSimpleApiUrl(channel, endpoint);

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (forwardCookies) {
    const cookieHeader = await getServerCookieHeader();
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }
  }

  const response = await fetch(url, { ...options, headers }).catch(throwApiError);

  if (!response.ok) {
    return await throwApiError(response);
  }

  if (response.status === 204) {
    return null;
  }

  return await response.json().catch(throwApiError);
};

/**
 * GET from the read endpoint
 *
 * @param endpoint - API endpoint path (without the base URL)
 * @param options - Fetch options
 * @returns The parsed response data
 * @throws ApiError if the request fails
 */
export async function fetchReadApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T | null> {
  return await fetchBase<T>(READ, endpoint, options);
}

/**
 * GET public read data with NO cookie forwarding — for responses that are identical for every
 * visitor.
 *
 * Two reasons this exists rather than being the default for `READ`.
 *
 * The live one is cache fragmentation. Next hashes the request headers into the fetch cache key,
 * and `getServerCookieHeader` forwards the whole cookie store, so today any cookie at all forks
 * the entry. A cached public read is shared only among visitors carrying zero cookies, and every
 * signed-in visitor holds a private copy of data that is the same for everyone. Dropping the
 * header collapses those back into one entry.
 *
 * The second is that a request-scoped API in the call stack is what stops these reads from ever
 * entering a `use cache` scope.
 *
 * **Only for responses that do not vary by principal.** Reads gated on `ezac_session` or a
 * `gallery_access_<slug>` cookie must keep using {@link fetchReadApi}. `getCollectionBySlug` is
 * the trap: it looks public, and the backend nulls its `content` when the gallery cookie fails to
 * validate — that null IS the authorization signal the gate reads. Moving it here would serve one
 * viewer's locked payload to everyone.
 *
 * @param endpoint - API endpoint path (without the base URL)
 * @param options - Fetch options
 * @returns The parsed response data
 * @throws ApiError if the request fails
 */
export async function fetchPublicRead<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T | null> {
  return await fetchBase<T>(READ, endpoint, options, false);
}

/** POST JSON to the admin endpoint */
export async function fetchAdminPostJsonApi<T>(endpoint: string, body: unknown): Promise<T | null> {
  return await fetchBase<T>(ADMIN, endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** PUT JSON to the admin endpoint */
export async function fetchAdminPutJsonApi<T>(endpoint: string, body: unknown): Promise<T | null> {
  return await fetchBase<T>(ADMIN, endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** PATCH JSON to the admin endpoint */
export async function fetchAdminPatchJsonApi<T>(
  endpoint: string,
  body: unknown
): Promise<T | null> {
  return await fetchBase<T>(ADMIN, endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** POST FormData to the admin endpoint — used for image uploads */
export async function fetchAdminFormDataApi<T>(
  endpoint: string,
  formData: FormData
): Promise<T | null> {
  return await fetchBase<T>(ADMIN, endpoint, {
    method: 'POST',
    body: formData,
  });
}

/** DELETE via the admin endpoint */
export async function fetchAdminDeleteApi<T>(endpoint: string): Promise<T | null> {
  return await fetchBase<T>(ADMIN, endpoint, {
    method: 'DELETE',
  });
}

/** DELETE with a JSON body via the admin endpoint */
export async function fetchAdminDeleteJsonApi<T>(
  endpoint: string,
  body: unknown
): Promise<T | null> {
  return await fetchBase<T>(ADMIN, endpoint, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** POST JSON to the edit endpoint */
export async function fetchEditPostJsonApi<T>(endpoint: string, body: unknown): Promise<T | null> {
  return await fetchBase<T>(EDIT, endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** PATCH JSON to the edit endpoint */
export async function fetchEditPatchJsonApi<T>(endpoint: string, body: unknown): Promise<T | null> {
  return await fetchBase<T>(EDIT, endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** GET from the admin endpoint */
export async function fetchAdminGetApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T | null> {
  return await fetchBase<T>(ADMIN, endpoint, options);
}
