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
 * `NEXT_PUBLIC_APP_URL` reduced to a bare `scheme://host[:port]`, or `null` when it is unset,
 * unparseable, or parses to an opaque origin.
 *
 * Browsers send `Origin` as a bare `scheme://host[:port]` — never with a trailing slash or a
 * path. An env value written as `https://zacedens.com/` would therefore match no real request
 * and 403 every production admin write, silently, because revalidate failures produce no
 * console line. Normalizing here is what keeps a cosmetic env-var difference from becoming an
 * outage.
 *
 * Both `null` returns fail closed. A value with no scheme (`zacedens.com`) throws and is
 * dropped. A value with a non-special scheme (`data:`, `file:`) does not throw — `URL.origin`
 * hands back the literal string `"null"`, which is also what a browser sends from a sandboxed
 * iframe or an opaque redirect, so admitting it would let those callers through. Dropped for
 * that reason, not for tidiness.
 */
function configuredAppOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) return null;

  try {
    const { origin } = new URL(raw);
    return origin === 'null' ? null : origin;
  } catch {
    return null;
  }
}

/**
 * Origins allowed to send writes by exact match: the deployed app URL, and nothing else.
 *
 * Dev ports are NOT listed here. `DEV_LAN_ORIGIN` below matches `http://localhost:3000` and
 * `:3001` under the same `NODE_ENV === 'development'` gate, and does it case-insensitively, so
 * exact-match literals for them would be a narrower duplicate of a check that already runs (D9).
 * Keep the dev-port allowance in that one place: literals here would silently survive any later
 * tightening of the regex.
 *
 * Adding a second non-dev exact-match origin here is fine — that is what the Set is for.
 */
function allowedOrigins(): Set<string> {
  return new Set([configuredAppOrigin()].filter(Boolean) as string[]);
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
 *
 * `origin` is compared exactly and is never normalized, which is the opposite of what
 * `configuredAppOrigin()` does to the env var. The asymmetry is the point: the env var is
 * trusted config, while this argument is attacker-influenced input. Running it through
 * `new URL(origin).origin` for symmetry would widen the check — `https://zacedens.com/evil`
 * would then compare equal to the allowed origin. Browsers only ever send the bare form, so
 * anything else here is not a browser.
 */
export function isAllowedWriteOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (allowedOrigins().has(origin)) return true;
  return process.env.NODE_ENV === 'development' && DEV_LAN_ORIGIN.test(origin);
}
