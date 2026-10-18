/**
 * Server-only backend target. This and the BFF proxy route are the only modules that read
 * `API_URL` or `INTERNAL_API_SECRET`, so neither can reach a client bundle. It is loaded only
 * through a lazy import in `getServerApiTarget`, behind a `typeof window === 'undefined'` check.
 *
 * Both variables are read at call time, not import time. An unset `API_URL` falls back to
 * `http://localhost:8080`, the same default the proxy route uses.
 *
 * @param endpointType - Backend channel segment (`read`, `admin`, `edit`, `auth`, ...)
 * @returns The direct backend base URL and the `X-Internal-Secret` header to send with it
 */
export function serverBackendTarget(endpointType: string): {
  baseUrl: string;
  headers: Record<string, string>;
} {
  const base = (process.env.API_URL || 'http://localhost:8080').replace(/\/+$/, '');
  return {
    baseUrl: `${base}/api/${endpointType}`,
    headers: { 'X-Internal-Secret': process.env.INTERNAL_API_SECRET ?? '' },
  };
}
