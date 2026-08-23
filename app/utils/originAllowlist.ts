/**
 * Shared Origin allowlist for state-changing requests.
 *
 * Extracted from the BFF proxy (`app/api/proxy/[...path]/route.ts`) so `/api/revalidate` can
 * enforce the same rule. A session cookie alone does not stop a hostile page from firing a
 * write route — the browser attaches the cookie to cross-site POSTs too. `Origin` is the part
 * an attacker's page cannot forge, so it is what separates "our admin UI called this" from
 * "our admin visited a hostile page that called this".
 *
 * Env is read on every call rather than captured at module load. The proxy rebuilt its Set
 * per request for that reason, and the suites for both routes flip `NODE_ENV` between cases.
 */

/**
 * Origins allowed to send writes: the deployed app URL, plus both local dev ports when
 * running in development.
 */
function allowedOrigins(): Set<string> {
  return new Set(
    [
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
      process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : null,
    ].filter(Boolean) as string[]
  );
}

/**
 * RFC1918 / mDNS origins on the dev ports, for testing against the dev server from a phone
 * on the LAN. Deliberately `http`-only and development-only.
 */
const DEV_LAN_ORIGIN =
  /^http:\/\/(?:localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|[\da-z-]+\.local|[\da-z-]+\.localhost):(?:3000|3001)$/i;

/**
 * Whether `origin` may send a state-changing request.
 *
 * A missing Origin is rejected. Browsers set the header on every POST/PUT/PATCH/DELETE
 * regardless of same-origin, so its absence means the caller is not a browser performing a
 * normal fetch or form submit.
 */
export function isAllowedWriteOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (allowedOrigins().has(origin)) return true;
  return process.env.NODE_ENV === 'development' && DEV_LAN_ORIGIN.test(origin);
}
