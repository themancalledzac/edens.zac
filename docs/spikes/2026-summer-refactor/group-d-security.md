# Group D — Security (shipped)

_Archive of shipped work from the [2026 Summer Refactor board](../2026-summer-refactor.md). Nothing here is open work. Sections are verbatim as they were when the item merged._

All nine items merged: PR #265, #266, #274, #272, #273, #270, #253 (D7), #276, #277. The original
Group D closed 2026-08-24; D10 (a `getApiBaseUrl` normalization gap of the same class as D8) was
filed 2026-08-29 and merged 2026-08-30 (#353). D11–D15, filed 2026-09-05 from an adversarial
re-review of everything here, are open on the live board.

## Closed rows

| MR  | Scope                                                        | Outcome                                         |
| --- | ------------------------------------------------------------ | ----------------------------------------------- |
| D1  | Gate `POST /api/revalidate` (HIGH)                           | +175 · #265                                     |
| D2  | Gate `clearCacheAction`                                      | +212 (est. +15) · #266                          |
| D3  | Security headers                                             | +60 src · #274                                  |
| D4  | Pin the CloudFront host                                      | ±1 (actual ±1) · #272                           |
| D5  | Proxy path reject + `/cdn` matcher removal                   | ~+30 net · #273                                 |
| D6  | Shared Origin allowlist (CSRF on `/api/revalidate`)          | +75 src, +230 test (est. ±60) · #270            |
| D7  | Wrong danger token on error text (a11y)                      | 0 (rode #253)                                   |
| D8  | Normalize `NEXT_PUBLIC_APP_URL` in the Origin allowlist      | +30 src, +52 test (est. ±5 src, +2 test) · #276 |
| D9  | Decide: redundant localhost literals in the Origin allowlist | −5 src, +20 docblock, +7 test · #277 — deleted  |
| D10 | `getApiBaseUrl` concatenates `NEXT_PUBLIC_APP_URL` raw       | +13 src, +102 test · #353 (`68fbb59b`)          |

---

### ✅ D1 · HIGH — `POST /api/revalidate` is unauthenticated in production — PR #265

- [x] [route.ts:13](app/api/revalidate/route.ts:13) had no session check, no Origin allowlist, and the `proxy.ts` matcher does not cover `/api/*`. Anyone could loop `{path: "/"}` or `{tags: [...]}` and permanently bust the ISR cache. Its only callers are the admin edit UI ([collectionEditUtils.ts:200](app/components/ContentCollection/edit/collectionEditUtils.ts:200)), which already sits behind the cookie and sends it on same-origin fetches — so the gate broke nothing, as predicted.
- [x] Gated on `!isLocalEnvironment() && !req.cookies.get('ezac_session')?.value`, before the body is
      parsed. Uses `isLocalEnvironment()` rather than a bare `NODE_ENV` check, matching `proxy.ts`
      and the standing "localhost admin needs no login" rule.
- [x] New `tests/api/revalidate/route.test.ts` — the route had zero tests. Covers the gate and,
      while there, the previously untested payload handling (empty-body 400, `tags` iteration
      skipping non-strings, tag+path together, unparseable-JSON 500). The four rejection tests were
      confirmed to fail against the ungated handler.

**Scope note: this closed the anonymous path, not CSRF.** (CSRF closed by D6, below.) The finding also named the missing Origin
allowlist, which is NOT fixed here — an authenticated admin visiting a hostile page can still be made
to fire the route. Deliberately deferred rather than bundled: the proxy's allowlist is a local
`const` inside its `handle()` function, not a shared helper, so reusing it means refactoring the
security-critical file whose tests are the pinned CSRF/IP-spoofing suite. Split out as D6 below.

### ✅ D2 · `clearCacheAction` allows anonymous global route-cache purge — PR #266

Last of the anonymous-cache-purge family.

- [x] [clearCache.ts:16](app/lib/actions/clearCache.ts:16) is a `'use client'`-imported Server Action, so its action ID ships in the public bundle and anyone can invoke it with a `Next-Action` POST. The backend leg fails for anonymous callers, but `revalidatePath('/', 'layout')` runs in its own `try` regardless — anonymous cache purge in a loop is a cost and DoS amplifier. Resolve `meServer()` at the top and return early unless `principal?.isAdmin || isLocalEnvironment()`.
- [x] Ship a test with it. `lib/actions/clearCache.ts` is also a B8 coverage gap, so D2 retires that
      bullet.

Shipped as a non-exported `isAuthorizedToClearCache()` helper rather than an inline block — a
`'use server'` module makes every export a callable action, so the gate must stay unexported. Local
returns authorized WITHOUT resolving a principal (matches `requireAdmin()`; the point of the
localhost rule is that it must not even ask). `meServer()` throws on any non-401 error, so the
resolve is wrapped and fails closed. Rejection returns `{ ok: false }` rather than `redirect()`ing:
`MenuDropdown` already branches on the result, and a redirect from a Server Action would navigate a
signed-out user mid-click.

**The +15 estimate was off by 14×** (actual +212, of which ~155 is the new test file). Same lesson as
A4/A6: the estimates count source only. A "+15" security item that also retires a coverage-gap
bullet is a full sitting, not a one-liner.

Four gate tests confirmed red against the ungated source; the other five pass both ways because they
pin pre-existing behavior. The assertion carrying the security claim on every rejection path is
`expect(mockRevalidatePath).not.toHaveBeenCalled()` — the purge is the leg that runs regardless of
the backend call.

**Do NOT unify D2's check with D1's.** They are deliberately asymmetric and the difference is the
point: a route handler can only observe a session, so `/api/revalidate` checks `ezac_session`
presence; a Server Action can resolve one, so this checks `principal?.isAdmin`. Collapsing them into
a shared helper either weakens D2 to a presence check or demands something of D1 it cannot do. If a
future MR wants them unified, it needs to say what it is doing about that asymmetry first.

### ✅ D3 · No security headers anywhere — PR #274

- [x] `next.config.js` has no `headers()` block, the middleware adds none, and no Amplify `customHttp.yml` is committed. No CSP, no `X-Frame-Options` (login and admin pages are frameable), no `nosniff`, no site-wide `Referrer-Policy`, no HSTS. Add a `headers()` block and start CSP report-only.
- [x] ~~Verify the Amplify console is not already injecting these~~ **ANSWERED 2026-08-23:
      `curl -sI https://www.zacedens.com/` — Amplify injects nothing.** No CSP, no XFO, no nosniff,
      no Referrer-Policy, no HSTS in the production response. The item is unblocked and startable.
- [x] Also found in that response: `x-powered-by: Next.js` is emitted — add `poweredByHeader: false`
      to the same MR.

**Shipped: five headers plus `poweredByHeader: false`, and the CSP is report-only.** Verified
against a running server, not just the config object — `curl -sI http://localhost:3002/` on the
"Verify Preview" config returns all five and no `x-powered-by`. Unit tests: 13 new in
`tests/next.config.test.ts`; full suite 4,079/4,079 across 224 files.

**The CSP was checked against a live browser, including the case the page could not exercise.**
Three page loads produced zero violation reports, but the Spring backend was down, so every route
hit its error boundary and no image or video ever rendered — `img-src` and `media-src` were
untested by that. Closed it by injecting a CloudFront `<img>` and `<video>` into the loaded page and
re-reading the console: no violation. The control is what makes that result mean something — an
`<img>` from `example.org` injected alongside them did report, with the browser naming the exact
directive and confirming "The policy is report-only". So the reporting path works and CloudFront
passes both directives.

**A clean report-only console is not evidence the policy can be enforced yet.** What was measured is
three routes in dev, all of them error boundaries, plus two injected elements. Before flipping the
header name to `Content-Security-Policy`, walk the real pages with the backend up — collection
pages, `/explore`, `/about`, a client gallery, the admin surfaces — and confirm the console stays
quiet. The dev build also relaxes three directives (`'unsafe-eval'`, `ws:`/`wss:`,
`http://localhost:*`) that production does not get, so dev cannot prove production is quiet either.
Tests pin that those three never reach a production build.

**`'unsafe-inline'` is in both `script-src` and `style-src` and cannot simply be deleted.** Next
inlines the hydration payload and its style tags. Removing it needs per-request nonces, which means
the CSP has to move out of `next.config.js` and into `proxy.ts` — a separate item, not a tightening
of this one.

**HSTS ships without `includeSubDomains` and without `preload`, deliberately.** `preload` is
removed by petitioning the browser vendors' list, so it is close to one-way, and neither was in the
item. `max-age=63072000` is the reversible part. A test pins the absence so a later session does not
add them without meaning to.

**One consolidation rode along, and it is the reason to look at this file when D4's host changes.**
`CLOUDFRONT_HOST` is now a single const feeding both `images.remotePatterns` and the CSP's
`img-src`/`media-src`. Two literals for the same host drift; a test asserts the optimizer allowlist
and the CSP still name the same one.

**Not included: `Permissions-Policy`.** It is free and would fit, but the item named five headers
and this board's repeated lesson is that un-asked additions are how MRs grow. Worth a one-line
follow-up item.

### ✅ D4 · Image optimizer accepts any `*.cloudfront.net` host — PR #272

- [x] [next.config.js:28](next.config.js:28) (`hostname: '*.cloudfront.net'` — the `:26` ref was the
      pattern's opening line) — third parties can serve their images through this site's optimizer:
      CloudFront is multi-tenant, so any `dXXXX.cloudfront.net` matches the wildcard, at this site's
      Lambda cost and 24h optimizer cache. **Fully specified 2026-08-23:** the production
      distribution is `d2qp8h5pbkohe6.cloudfront.net` (read off the live homepage). Replace the
      wildcard with it. The only other `*.cloudfront.net` literal in the repo is the fake
      `d123.cloudfront.net` fixture in `CollectionsPanel.test.tsx` (on main since #253 merged) —
      unaffected, it never hits the optimizer. Cheapest item on the board; adversarial review
      confirmed the abuse vector is real.

_The board row and this heading were marked ✅ in the same commit as the one-line fix, so the record
reaches `main` only when the MR does. If you are reading this on the `0272-` branch, it is still
open._

**Shipped exactly as specified — one line, `±1` estimated and `±1` actual.** Both board claims held
under re-verification: the `d123.cloudfront.net` fixture is unaffected (`CollectionsPanel.test.tsx`
passes unchanged, 12/12) and those two are still the only `cloudfront` literals in the repo.

**The homepage was not enough evidence, and checking more was cheap.** The 08-23 capture read the
distribution off `/` only, which cannot rule out a second distribution serving some other surface —
and a `remotePatterns` pin that misses one silently breaks every image on that page in production.
Swept `/` plus six collection pages (`/adventure`, `/event`, `/film`, `/gorge-climbing`,
`/hidden-lake`, `/travel`): all seven serve images exclusively from `d2qp8h5pbkohe6.cloudfront.net`,
79 references on the homepage alone. `/explore` and `/about` return no CloudFront host in their
initial HTML at all. For any future item that pins an external host, sweep more than one page —
`curl -s <url> | grep -oE '[a-z0-9-]+\.cloudfront\.net' | sort -u` per page is seconds of work.

**First estimate on the board to hold, and it holds for a legible reason.** The recalibration note
says the estimates count source only and were wrong 4-for-4 (A4, A6, D2, D6). D4 is the control case:
grepping its symbols found ZERO test call sites, so there was no test coupling to be blind to. The
existing "grep its symbols for test call sites before sizing a sitting" rule is what predicts which
way an estimate will miss — a zero-hit grep means the source-only number is trustworthy.

**Not in this MR: `poweredByHeader: false`.** It is D3's bullet, and D3 also edits `next.config.js`,
so bundling was the tempting move. Held to one MR per item. Re-confirmed against production today:
`curl -sI https://www.zacedens.com/` still emits `x-powered-by: Next.js` and still injects no CSP,
XFO, nosniff, Referrer-Policy or HSTS — D3's premises are current as of 2026-08-23.

### ✅ D5 · Proxy path reject + `/cdn` matcher removal — PR #273

- [x] The catch-all proxy forwards non-`/api` backend paths: `/api/proxy/actuator/env` reaches the backend carrying `X-Internal-Secret` (re-verified 2026-08-22 — `route.ts:14-19` builds the URL with no `api/` requirement; the only pre-forward reject is the prod admin/edit check). Reject when the resolved path does not start with `api/`, with new reject tests proven red against the unpatched handler (~+40–60 test in the pinned suite, add-only per the D6 precedent).
- [x] `/cdn` is dead in FOUR places, not two (list completed 2026-08-22): the `proxy.ts` docblock
      line `:15`, the branch `:27-33`, the matcher comment `:85`, and the matcher entry `:94` — plus
      `tests/proxy.test.ts` (docblock line 6 and the whole "/cdn rule (regression)" describe,
      `:79-93`), which dies with the branch. No such route exists. (`proxy.ts` IS the live Next 16
      middleware; the old "unwired" note in the docs was stale and has been corrected.)

**All six refs re-verified 2026-08-23, zero drift** — `proxy.ts:15`, `:27-33` (the branch is exactly
those seven lines), `:85`, `:94` (`'/cdn/:path*'`), `tests/proxy.test.ts:6` and the `:79-93`
describe, and `route.ts:14-19` (`buildTargetUrl`, still no `api/` requirement). Note the matcher
comment at `:85` reads "plus the legacy `/catalog` and `/cdn` rules" — it needs editing down to
`/catalog`, not deleting.

**Guardrail — remove the four `/cdn` references and NOTHING else from the matcher array.** That
array is the list deciding which routes get the session gate, so an entry removed or added by hand
silently un-gates or login-walls a route, and the failure is invisible until production. This has
already happened once here: `proxy.ts:86-89` carries two warnings written by the cleanup, `/explore`
is deliberately public and "0203 F4 did and login-walled it in prod", and `/all-collections` is
public because the backend permission-scopes the list. The `/cdn` removal puts a fresh session
inside exactly that array with a tidying mindset. If any other entry looks wrong, report what
changing it would do and let the user decide — do not edit it in the same MR.

**Second guardrail: the path reject is `api/` only.** `buildTargetUrl` joins whatever segments
arrive, so the reject is one prefix check. Do not also start allowlisting specific backend paths,
rewriting the URL builder, or folding the new reject into the existing prod admin/edit check — that
check answers a different question (who is asking) than the reject (what are they asking for), and
merging them makes both harder to test. New reject tests are add-only in the pinned suite, per the
D6 precedent: `tests/api/proxy/route.test.ts` must pass unchanged.

**Shipped, both parts. The pinned suite passed unchanged (23/23) and the file now runs 35/35;
`tests/proxy.test.ts` runs 46/46; full suite 4,080/4,080 across 223 files.** Source came in at
`+23/−16` and tests at `+141/−8`, against a `~+30 net` estimate — close, because the test coupling
was already listed in the item.

**The `api/` prefix check does not work as a raw-string check, and that is the one thing to carry
forward from this MR.** `fetch` resolves dot segments while it parses the URL, so
`buildTargetUrl(['api', '..', 'actuator', 'env'])` produces
`http://backend.test/api/../actuator/env` and requests `http://backend.test/actuator/env`. A
`resolvedPath.startsWith('api/')` check passes that string and forwards it, carrying
`X-Internal-Secret`. The reject would have shipped as decoration. Verified before writing the fix:
`new URL('http://h/api/../actuator/env').pathname` is `/actuator/env`.

**So the check runs on the normalized path** — `isProxyableApiPath` in
[route.ts:23](app/api/proxy/[...path]/route.ts:23) resolves the path against a sentinel origin and
asks whether the result starts with `/api/`. This is still one check, and it is still the item's
prefix check; the only change is which string it reads. It does not allowlist backend paths, does
not rewrite `buildTargetUrl`, and does not touch the prod admin/edit check — the three things the
guardrail named. Reading the guardrail as "must be `startsWith` on the raw join" would have meant
shipping a bypassable gate.

Normalizing catches three spellings a string check misses, and correctly declines to over-block a
fourth. `api/%2e%2e/actuator` → `/actuator`, blocked. `api\..\actuator` → `/actuator`, blocked
(backslashes are path separators for special schemes). `api/a/../../actuator` → `/actuator`,
blocked. But `api/..%2Fread` stays `/api/..%2Fread`, so it forwards — an encoded slash is a literal
segment, not a climb. All four are pinned as tests.

**Matcher: only `'/cdn/:path*'` was removed. Nothing else was touched.** The other entries, and what
changing them would do:

| Entry                                             | What removing it would do                                                                                                                                                                                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/admin`, `/admin/:path*`                         | Un-gates the admin hub and `/admin/users/[id]` at the edge. Prod would serve them to anonymous traffic until the (admin) layout's `requireAdmin()` ran. Not a full breach — the backend is authoritative — but it moves the reject later and leaks the pages' existence. |
| `/collection/manage`, `/collection/manage/:path*` | Same, for the manage surface.                                                                                                                                                                                                                                            |
| `/comments`, `/comments/:path*`                   | Same, for `/comments`.                                                                                                                                                                                                                                                   |
| `/metadata`, `/metadata/:path*`                   | Same, for `/metadata`.                                                                                                                                                                                                                                                   |
| `/all-images`, `/all-images/:path*`               | Same, for `/all-images`.                                                                                                                                                                                                                                                 |
| `/catalog/:slug*`                                 | Kills the legacy `/catalog/:slug` → `/collection/:slug` 308. Old links and any indexed catalog URLs would 404 instead of redirecting. The redirect is already behind `COLLECTION_REDIRECTS_ENABLED`, so it is dormant unless that flag is set.                           |

And the additions that look tempting and are not: `/explore` and `/all-collections` are deliberately
absent (both public — see the warnings in the matcher comment), and `/` is absent on purpose so the
hottest route pays no middleware cost. `/cdn` was safe to remove only because `app/` has no `cdn`
directory at all — checked, not assumed — so the rule redirected prod traffic that could only ever 404. The four-place list in the item was exact; there were no other `/cdn` references in the repo
(the remaining `cdn` grep hits are all `https://cdn.example.com` test fixtures).

**Reject status is 404, not 403.** The proxy has no such route to offer. 404 also tells a prober
nothing about whether the backend has an actuator.

### ✅ D6 · Shared Origin allowlist — CSRF on `/api/revalidate` — PR #270

Split out of D1, which gated the route on session presence but left it CSRF-open. Next because the
D1/D2 context is still warm and it is the last open piece of the thread those two started.

_(Moved here 2026-08-23. This section had been filed under the "Group E — Consolidations" heading,
so a session navigating to Group D could not find it.)_

- [x] The Origin allowlist lives as a local `const ALLOWED_ORIGINS` inside `handle()` in
      [route.ts:98](app/api/proxy/[...path]/route.ts:98) (line ref re-verified 2026-08-23),
      together with the RFC1918/mDNS dev-LAN regex. Extract both into a shared helper and apply it
      to `/api/revalidate`'s POST.
- [x] `tests/api/proxy/route.test.ts`'s "write-method origin allowance" describe
      ([:185](tests/api/proxy/route.test.ts:185), re-verified 2026-08-23) is the pinned suite for
      this logic — it must pass unchanged after the extraction. That is the whole safety argument
      for the refactor; do not touch those assertions to make the extraction fit.
- [x] Note `revalidateCollectionCache` sends `Content-Type: application/json`, which forces a CORS
      preflight — but an attacker can send `text/plain` and `req.json()` still parses it, so the
      preflight is not a defense.

**Guardrail — do NOT also gate `/api/revalidate` on `principal.isAdmin` while you are in there.**
That is the tempting adjacent change, because D2 does exactly that and it looks like the obvious
tidy-up. It is a different decision with a real cost, and D2's section below spells it out: three
extra `/api/auth/me` round trips per collection save, and a loud failure turned quiet. D6 is the
Origin check only. If you think the session check should change too, report what it would cost and
let the user decide.

**Second guardrail: do not bundle D5.** It also edits `proxy.ts`. One MR per item.

**Shipped as `app/utils/originAllowlist.ts` — one export, `isAllowedWriteOrigin(origin)`.** Both
the `NEXT_PUBLIC_APP_URL` + dev-ports Set and the RFC1918/mDNS regex moved into it. Three decisions
worth keeping:

- **Env is read on every call, not captured at module load.** The proxy rebuilt its Set per request
  and both route suites flip `NODE_ENV` / `NEXT_PUBLIC_APP_URL` between cases. Hoisting the Set to
  module scope would have passed a first run and then broken as soon as a suite reordered.
- **On `/api/revalidate` the session check runs FIRST, the Origin check second.** An anonymous
  caller still gets 401, not a 403 that would point at the wrong thing. Pinned by a new test.
- **The Origin check applies in every environment, local included.** It does not need a local
  exemption: the allowlist already carries `localhost:3000/3001` and the LAN regex in development,
  so "localhost admin needs no login" survives untouched while local stops being exempt from CSRF.
  There is a test for exactly that — a hostile origin is 403 in development too.

**The safety argument held.** `tests/api/proxy/route.test.ts` passes unchanged, 22/22, assertions
untouched — including all six pinned origin cases. Full suite 222 suites / 3871 tests green.

**Every `/api/revalidate` caller is a browser `fetch()` with a relative URL** (`revalidateCollectionCache`
and `revalidateMetadataCache` in `collectionEditUtils.ts`, grep-verified as the only two). Browsers set
`Origin` on every POST regardless of same-origin, so no caller starts 403ing. There is no server-side
caller — that was the one way this change could have broken production silently.

New `tests/utils/originAllowlist.test.ts` (19 cases) pins the rule itself, including the look-alike
suffix `https://example.com.evil.example`, the 172.16–31 range boundaries, and the http-only and
dev-port-only edges. The six new rejection tests on `/api/revalidate` were confirmed red against the
un-gated handler; the three "allows" cases pass both ways, as they should. Mutating the helper's
`NODE_ENV === 'development'` guard turned three helper tests red, so they bite too.

#### What gating `/api/revalidate` on `principal.isAdmin` would cost — reported, not done

Asked for alongside D6. The recommendation is **don't**, but the call is the user's.

- **Three to four extra `/api/auth/me` round trips per collection save.** `revalidateCollectionCache`
  fires three parallel POSTs (`collection-<slug>`+path, `collections-index`, `collection-home`) and
  `revalidateMetadataCache` fires a fourth. `meServer()` is wrapped in React `cache()`, but that
  dedupes within one request scope — these are four separate HTTP requests, so each pays its own
  Lambda→EC2 call with `cache: 'no-store'`. The cookie check costs zero network.
- **It adds a failure mode the cookie check does not have.** `meServer()` throws on any non-401, so a
  D2-style gate fails closed when the auth backend is slow or down. Combined with the next point,
  an auth blip becomes silently stale pages.
- **The failure is already invisible at the call site.** `fetch()` does not throw on 4xx, and
  `revalidateCollectionCache`'s `catch` only fires on network errors — and only logs when
  `isLocalEnvironment()`. A 403 today produces no console line, no toast, nothing: the admin sees a
  successful save over a cache that never busted. Adding a gate that can 403 for reasons other than
  "you are signed out" makes that silence worse. Fixing the silence is its own item, not part of D6.
- **What it would actually buy is narrow.** After D6, a caller must already hold a real `ezac_session`
  AND come from our own origin. `isAdmin` would additionally stop a signed-in **non-admin** from
  busting the cache via our own site. Per `docs/009-backend-and-vision.md` the client-user surface
  shipped dormant with no client users yet, so that gap is currently unreachable — it becomes real
  when Phase C lands.

**Recommendation: revisit when Phase C ships client users**, and pair it with making the revalidate
failure visible at the call site. Until then the cookie + Origin pair is the better trade.

_Adversarial re-review 2026-08-22: the D1/D2/D6 gates are sound — no high/medium finding. Ordering
(session → Origin → body parse) holds; missing/`null` Origin fails closed; the RFC1918 regex is
anchored; NODE_ENV values other than exactly `development` collapse to the strictest state;
`clearCache.ts` ships exactly one callable action and fails closed. Two of `originAllowlist.test.ts`'s
cases (null/empty origin) are belt-and-suspenders that cannot detect deletion of the `if (!origin)`
guard — harmless, noted for honesty. The one real finding became D8._

### ✅ D7 · Wrong danger token on error text (a11y) — CLOSED by PR #253's merge (2026-08-23)

_(Moved here 2026-08-22 from under the Group E heading — the same misfiling D6 had. Given a board
row at the same time; it had neither.)_

- [x] Both halves rode #253 (fixed there by f994655, merged 79fbca5): `RolesPanel.module.scss:16`
      and `CollectionsPanel.module.scss:116` both read `--color-danger-text` on main now.
      [globals.css:132](app/styles/globals.css:132) documents `--color-danger` as fills-and-borders
      only; `MessagesPanel.module.scss:18` and `UserManagementPanel.module.scss:15` were already
      right — all four panels now agree.
- [x] Residual moved to E10 when this section was archived: `RolesPanel.module.scss:72` still uses `--color-danger` for a button hover.

### ✅ D8 · Normalize `NEXT_PUBLIC_APP_URL` when building the Origin allowlist — PR #276

Found by the adversarial review of D6. `allowedOrigins()`
([originAllowlist.ts:21](app/utils/originAllowlist.ts:21)) puts `process.env.NEXT_PUBLIC_APP_URL`
into the Set verbatim. Browser `Origin` headers are always bare `scheme://host[:port]`, so a
trailing slash or path in the env var (`https://zacedens.com/`) makes every production admin write
403 — silently, because revalidate failures produce no console line (see C5's note and the D6
cost write-up). Fails closed, never open: an availability trap, not a bypass.

- [x] Normalized in a new `configuredAppOrigin()` helper with `new URL(raw).origin`, guarding the
      throw on a malformed value (fail closed). `allowedOrigins()` now calls it instead of reading
      the env var directly.
- [x] Five tests, not two — the extra three are below. Both board-specified cases went red first
      against the unnormalized helper, as required.

**The board's spec had a hole, and guarding only the throw would have opened a bypass.**
`new URL(raw).origin` does not throw on every bad value. A non-special scheme parses fine and
returns the _string_ `"null"`: `new URL('data:text/plain,hi').origin === 'null'`, same for `file:`
and any unknown scheme. `"null"` is also exactly what a browser sends as `Origin` from a sandboxed
iframe or an opaque redirect. So a `try/catch` alone would have put `"null"` into the allowlist Set
and admitted those callers — a fail-_open_ introduced by the fix meant to prevent a fail-closed
outage. The helper drops it explicitly (`origin === 'null' ? null : origin`) and the docblock says
why, so it does not read as defensive noise. Verified against Node across twelve env-value shapes
before writing the guard, not assumed.

The three tests beyond the board's two: the env value _as written_ (`https://example.com/`) is
rejected once normalized away; an env value with a path normalizes to the bare origin; a `"null"`
origin is denied when the env value has an opaque scheme. That last one is the only new test that
passes on the _unfixed_ code — it guards against the naive version of this fix, so it is green
before and after by design.

**Both guardrails held.** The incoming `origin` argument is untouched and still compared exactly;
`isAllowedWriteOrigin()`'s docblock now records why the asymmetry with the env var is deliberate.
The two `localhost` literals are untouched — see the D9 report below.

Verification: 24/24 in `tests/utils/originAllowlist.test.ts`, both consuming route suites green
(56/56 across `tests/api/proxy/route.test.ts` and `tests/api/revalidate/route.test.ts`), and the
full suite at 4098/4098 across 224 files. `tsc --noEmit` clean, ESLint and Prettier no-ops on the
two changed source files.

**Ref re-verified 2026-08-23 after D3/D4/D5 landed: zero drift.**
[originAllowlist.ts:21](app/utils/originAllowlist.ts:21) is still
`process.env.NEXT_PUBLIC_APP_URL,` inside `allowedOrigins()` (which starts at `:18`). None of the
three merged MRs touched this file.

**Next because it is the last open Group D item and the smallest thing on the board.** D6 built this
helper, D5 and D3 kept the session inside the same security surface, and it is `±5` source lines.
Finishing it closes Group D entirely except for the D9 decision below.

**Guardrail — normalize the env value only. Do NOT normalize the incoming `origin` argument.**
The tempting symmetry is `new URL(origin).origin` on both sides. That one is a widening, not a
cleanup: browsers always send a bare `scheme://host[:port]`, so the only callers that send anything
else are not browsers, and normalizing their input before an exact-match lookup would make
`https://zacedens.com/anything` compare equal to the allowed origin. The env var is trusted config
and needs normalizing; the `origin` header is attacker-influenced input and must stay an exact
match. Same function, two opposite trust levels.

**Second guardrail — leave the two `localhost` literals alone; that is D9, and it is a decision, not
a cleanup.** They sit three lines below the one you are editing and look obviously redundant. Report
what changing them would do, do not change them in D8's MR.

### ✅ D9 · Redundant `localhost` literals in the Origin allowlist — DELETED, PR #277

Found while setting up D8. `allowedOrigins()`
([originAllowlist.ts:22-23](app/utils/originAllowlist.ts:22)) adds `http://localhost:3000` and
`http://localhost:3001` to the Set when `NODE_ENV === 'development'`. `DEV_LAN_ORIGIN`
([:33](app/utils/originAllowlist.ts:33)) already matches both, and its branch is gated on the same
`NODE_ENV === 'development'`. Verified, not assumed: the regex returns `true` for
`http://localhost:3000` and `http://localhost:3001`. The two literals are redundant today.

**Deleting them is invisible to the test suite, which is the reason to be careful rather than the
reason it is safe.** `tests/utils/originAllowlist.test.ts` asserts localhost is allowed in
development (`:80-81`) and denied outside it (`:57-58`, `:136`). Every one of those still passes
with the literals gone, because the regex covers the same cases. No test would catch it if the
redundancy reasoning were wrong.

**The redundancy is arguably the point.** They are two independent expressions of the same intent.
If a later MR tightened `DEV_LAN_ORIGIN` — dropping bare `localhost` to require an IP, say — the Set
literals are what would keep the dev server working. That makes this defense in depth, not dead
code, and the honest resolutions are "delete and note why in the docblock" or "keep and note why in
the docblock". Either way the next reader needs the reasoning written down, because the redundancy
reads as an oversight.

**Report from D8's session (2026-08-23) — asked for, and the literals were left alone as
instructed.** Re-verified the redundancy independently rather than trusting the board's claim, by
running `DEV_LAN_ORIGIN` against the two strings: both `http://localhost:3000` and
`http://localhost:3001` return `true`.

What deleting them would do, precisely: **nothing observable today.** The Set is consulted first and
the regex second, but the literals are added only under `NODE_ENV === 'development'` and the regex
branch is gated on the same condition — so every request the literals answer, the regex also
answers, under identical gating. Outside development neither path is reachable. All 24 tests in
`tests/utils/originAllowlist.test.ts` and all 56 in the two route suites would still pass with the
literals removed, which is the same blind spot the entry above already names.

One asymmetry the board had not recorded, found while checking: the two are **not** equivalent in
strictness. `DEV_LAN_ORIGIN` carries the `/i` flag, so it matches `http://LOCALHOST:3000`; the Set
does an exact, case-sensitive match and does not. The literals are therefore a strict subset of the
regex, not an overlapping alternative. That cuts against the "two independent expressions of the
same intent" framing above — as written they are the _narrower_ of the two, and would only become
load-bearing if a future MR tightened the regex specifically. Worth weighing in the decision; not a
decision in itself.

**Decision: delete.** Reasoning is in the `allowedOrigins()` docblock, as required, in enough
detail that a reader who thinks the literals were dropped by accident is answered on the spot.

Three things carried it. The literals were verified redundant with `DEV_LAN_ORIGIN` under identical
`NODE_ENV` gating. They were the _narrower_ of the two, so "independent expressions of the same
intent" was never accurate. And the failure that keeping them would cover is loud, not silent — a
tightened regex breaks the dev server on the next admin write and turns tests red in the same
second. Defense in depth is worth its cost against failures that pass unnoticed; this one cannot.
Kept as a footnote in the docblock: had the tightening ever been deliberate, the literals would have
silently defeated it.

**Correction to this entry's own premise — the claim below that no test would catch a wrong
redundancy argument is false, and it was checked rather than reasoned about.** Deleting the literals
and then simulating the exact future the "keep" case feared (dropping bare `localhost` from
`DEV_LAN_ORIGIN`) turns `allows both local dev ports` (`:80-81`) red immediately. Those cases pass
either way only because the reasoning happens to be right — that is the test confirming the premise,
not a blind spot. The entry read the passing tests as absence of coverage when they were the
coverage.

Two mixed-case cases were still added (`http://LOCALHOST:3000`), one in each `NODE_ENV`. They pin
which mechanism answers for the dev ports: a Set lookup is case-sensitive and the regex is not, so
they can only pass while the regex is the thing responding. Before this MR nothing in the file could
tell the two mechanisms apart.

- [x] Decided delete; reasoning recorded in the `allowedOrigins()` docblock so this is not
      re-litigated a third time.

---

### ✅ D10 · `getApiBaseUrl` concatenates `NEXT_PUBLIC_APP_URL` raw — PR #353, 2026-08-30

Filed 2026-08-29 from the adversarial review. D8 (#276) normalized the env var for
`originAllowlist.ts` only; `getApiBaseUrl` (`app/lib/api/core.ts`) still returned
`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/proxy/…`, so a trailing slash yielded `//` and an
unset value a relative URL Node `fetch` rejects. Shipped as `68fbb59b`: `core.ts:88` reuses
`configuredAppOrigin()`; both bullets landed, including the `/api/revalidate` docblock fix
(`route.ts:50-51` now says dev ports are NOT listed). The same commit added a board label to
`originAllowlist.ts:14` — G4's "the refactor's own MR is where the rot enters", demonstrated.
**Sat on the live board as COLD, and as item 2 of NEXT RUN, for six days after merging.**
