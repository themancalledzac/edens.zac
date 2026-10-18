# Code review: simplification, security, passkeys, navigation, speed

Date: 2026-10-17. Reviewed: `main` @ `9f7302b7` plus the uncommitted working tree. Looked at: the Next 16 app under `app/`, the BFF proxy, `next.config.js`, `proxy.ts`, the test suite, the production site at `https://zacedens.com`, and the backend repo where the frontend's behaviour depends on it. For: Zac. The design and UX side of the same day's review is in [01-design-review.md](01-design-review.md).

## Thesis

Face / Touch ID fails in production because the backend serves passkey ceremonies for `rpId: "localhost"`. Verified today with one `curl` against `https://zacedens.com`. The frontend code is fine, local works, and the fix is three lines in the EC2 `.env` plus a redeploy. No code change is required for it. Three other things to do this week: bump `next` from 16.3.4 to 16.3.8 (seven open advisories, two describe this deployment), change one `sizes` string so phones stop downloading grid images 4x to 11x larger than they render, and gate `/api/revalidate` on `isAdmin` instead of cookie presence. The working tree is one coherent change (home mobile row budget plus synthetic-tile ordering); it is green and can be committed as is, with one product decision still open about the All Collections tile that never renders publicly. Tooling is green across the board: `tsc`, `eslint` (0 errors) and jest (269 suites, 4993 tests) all pass on the working tree.

## Contents

1. [Face / Touch ID](#1-face--touch-id)
2. [Security](#2-security)
3. [Speed](#3-speed)
4. [Simplify and reuse](#4-simplify-and-reuse)
5. [Navigation logic](#5-navigation-logic)
6. [Working tree](#6-working-tree)
7. [Priority list](#7-priority-list)
8. [Appendix](#appendix)

## 1. Face / Touch ID

### What is wrong

Production serves WebAuthn options with `rpId: "localhost"`. Every browser on `https://zacedens.com` refuses that relying-party id before any Face ID or Touch ID sheet can open. That is why it fails the same way on iOS, Android and desktop, and why the failure is instant with no row written.

Verified today:

```
$ curl -s -X POST https://zacedens.com/api/proxy/api/auth/webauthn/login/start \
    -H 'Content-Type: application/json' -H 'Origin: https://zacedens.com' \
    -d '{"email":"nobody-probe@example.invalid"}'
{"challenge":"...","timeout":300000,"rpId":"localhost","allowCredentials":[],"userVerification":"preferred","extensions":{}}
set-cookie: ezac_webauthn_attempt=...; Path=/; Max-Age=300; Secure; HttpOnly; SameSite=Strict
```

What each screen shows, and where the copy comes from:

| Screen | Call that throws | Error | Text shown |
| --- | --- | --- | --- |
| `/admin` or `/user`, "Face / Touch ID" chip | `navigator.credentials.create()` at [auth.ts:182](../../../app/lib/api/auth.ts#L182) | `SecurityError` | "Not available on this site." ([PasskeyChip.tsx:24](../../../app/components/Personal/PasskeyChip.tsx#L24)) |
| `/login`, "Sign in with Face / Touch ID" | `navigator.credentials.get()` at [auth.ts:238](../../../app/lib/api/auth.ts#L238) | `SecurityError` | "Passkey sign-in isn't available right now. Please use your password." ([LoginForm.tsx:43](../../../app/login/LoginForm.tsx#L43)) |
| `/invite/[token]`, "Enable Face/Touch ID" | `create()` via `registerPasskey()` at [InviteForm.tsx:81](../../../app/invite/%5Btoken%5D/InviteForm.tsx#L81) | `SecurityError`, swallowed | "Your account was created, but Face / Touch ID couldn't be saved" ([InviteForm.tsx:83](../../../app/invite/%5Btoken%5D/InviteForm.tsx#L83)) |

The browser message for this error class, reproduced in Chromium on `http://localhost:3001` by calling `get()` with `rpId: 'zacedens.com'`:

```
SecurityError: The relying party ID is not a registrable domain suffix of, nor equal to the current domain.
```

### Why (in the code)

The relying-party id comes only from environment, and production has never set it.

- [backend application.properties:117](../../../../edens.zac.backend/src/main/resources/application.properties#L117) defaults `app.auth.webauthn.rp-id` to `localhost` and `allowed-origins` to the two localhost dev ports (lines 117 to 119).
- [backend docker-compose.yml:47](../../../../edens.zac.backend/docker-compose.yml#L47) passes `WEBAUTHN_RP_ID`, `WEBAUTHN_RP_NAME`, `WEBAUTHN_ALLOWED_ORIGINS` through, defaulting to `localhost` again.
- [backend .env.example:66](../../../../edens.zac.backend/.env.example#L66) documents the production values (lines 66 to 68).
- [backend deploy.sh:28](../../../../edens.zac.backend/deploy.sh#L28) copies `~/portfolio-backend/.env` into the repo, then rebuilds and restarts at lines 112 to 117. Nothing in CI deploys ([backend ai_cicd.md:53](../../../../edens.zac.backend/ai_docs/ai_cicd.md#L53)).

So the EC2 `~/portfolio-backend/.env` does not carry `WEBAUTHN_RP_ID`, or it was added after the last `deploy.sh` run. Unverified which; the file is on the box.

There is a second thing the probe tells us. [backend ProdWebAuthnGuard.java:16](../../../../edens.zac.backend/src/main/java/edens/zac/portfolio/backend/config/ProdWebAuthnGuard.java#L16) is `@Profile("prod")` and throws at `@PostConstruct` when `rp-id` is `localhost` (lines 29 to 35). A backend on current `main` booted under `prod` cannot serve `rpId: "localhost"`. Production does. So one of these is true:

1. The EC2 backend has not been redeployed since 2026-09-15, when the guard merged (backend PR #332, commit `f0c6d85e`). The attempt cookie carries `Secure`, so it is not the `dev` profile; an old image on `prod` or `default` fits.
2. The backend is current but `SPRING_PROFILES_ACTIVE` is not `prod`, so none of the four `@Profile("prod")` beans are registered: [InternalSecretFilter.java:28](../../../../edens.zac.backend/src/main/java/edens/zac/portfolio/backend/config/InternalSecretFilter.java#L28), `ProdActuatorExposureGuard`, `ProdSecretGuard`, `ProdWebAuthnGuard`. That is the open question in the backend's `ai_docs/reviews/2026-08-22-backend-cleanup-history.md` ("nothing proves prod is named prod").

Case 2 is the bigger finding, because it also means the BFF secret is not being checked on EC2 port 8080. Unverified from here.

Hypotheses checked and ruled out, so nobody re-investigates them:

| Hypothesis | Verdict | Evidence |
| --- | --- | --- |
| rpId mismatch | Confirmed, root cause | Probe above. [backend WebAuthnConfig.java:38](../../../../edens.zac.backend/src/main/java/edens/zac/portfolio/backend/config/WebAuthnConfig.java#L38) builds the RP entity from `app.auth.webauthn.rp-id`. |
| Prod backend predates the guard, or is not on `prod` | Likely one of the two, unverified | See above. |
| `www.zacedens.com` writes rejected by the BFF | Confirmed, separate bug | Side finding 1 below. |
| A stale `localhost`-scoped credential hides the chip | Possible, unverified | Side finding 2 below. |
| Attempt cookie not sent on `login/finish` | Ruled out | Cookie is `Path=/`, `SameSite=Strict`, `Secure`; finish is same-origin to the BFF. Proxy forwards `Cookie` ([route.ts:70](../../../app/api/proxy/%5B...path%5D/route.ts#L70) to 91) and re-emits every `Set-Cookie` ([route.ts:192](../../../app/api/proxy/%5B...path%5D/route.ts#L192)). |
| Challenge stored in memory on a multi-instance backend | Ruled out | Caffeine cache, one `backend` service in compose. |
| `userVerification: required` on a device without biometrics | Ruled out | Options say `preferred` in both probes. |
| Origin allow-list missing the https origin | Not the current blocker, but next | [backend WebAuthnConfig.java:52](../../../../edens.zac.backend/src/main/java/edens/zac/portfolio/backend/config/WebAuthnConfig.java#L52) reads `allowed-origins`. The client never reaches `finish` today. Once `WEBAUTHN_RP_ID` is fixed, `WEBAUTHN_ALLOWED_ORIGINS` must be set in the same edit or `finish` fails on origin. |
| iOS user gesture lost across the `await` before `get()` | Unlikely, unverified | [auth.ts:222](../../../app/lib/api/auth.ts#L222) awaits `login/start` before `get()`. Platform-agnostic failure argues against it. Re-test on iOS after the fix. |
| Conditional mediation, base64url padding, chip in the wrong place after PR #437, CSP, Amplify stripping headers, limiter 429 | Ruled out | No `mediation: 'conditional'`; [auth.ts:114](../../../app/lib/api/auth.ts#L114) to 139 decode with padding and are tested; both `/admin` and `/user` pass `ownSpaceExtras`; CSP is report-only; `set-cookie` arrives intact through Amplify; a 429 would show the 15-minute copy, not "isn't available". |

Local is fine. The local backend on 8080 serves `rpId: "localhost"` and a cookie without `Secure` (dev profile). A Playwright probe against `/login` on 3001 with a virtual authenticator decoded the options, called `get()`, got `NotAllowedError` (no credential for a throwaway email) and rendered the mapped copy at [LoginForm.tsx:40](../../../app/login/LoginForm.tsx#L40). That exercises the whole client path through [auth.ts:219](../../../app/lib/api/auth.ts#L219) to 238 and the proxy.

### Side finding 1: every write on www.zacedens.com returns 403

Verified today: `POST https://www.zacedens.com/api/proxy/api/auth/webauthn/login/start` with `Origin: https://www.zacedens.com` returned `403 {"error":"Forbidden"}`. [originAllowlist.ts:58](../../../app/utils/originAllowlist.ts#L58) admits exactly one origin, `NEXT_PUBLIC_APP_URL`, and [route.ts:143](../../../app/api/proxy/%5B...path%5D/route.ts#L143) returns 403 for any write whose Origin is not in the set. `www` serves the site with a 200 and no redirect, so password login, passkeys, the contact form and every admin write fail there. The file's own docblock says a second exact-match origin is intended to be fine ([originAllowlist.ts:56](../../../app/utils/originAllowlist.ts#L56)). Already listed as apex vs www on board D13 in [pf-performance-platform.md](../../spikes/2026-features/pf-performance-platform.md).

### Side finding 2: a stale localhost-scoped credential may hide the chip

[ownSpaceExtras.tsx:17](../../../app/components/Personal/ownSpaceExtras.tsx#L17) passes `initiallyEnrolled={principal.passkeyCount > 0}` and [PasskeyChip.tsx:55](../../../app/components/Personal/PasskeyChip.tsx#L55) renders nothing when enrolled. [backend AuthController.java:123](../../../../edens.zac.backend/src/main/java/edens/zac/portfolio/backend/controller/auth/AuthController.java#L123) counts `webauthn_credential` rows. If `tests/e2e/passkey.spec.ts` was ever run locally while the local backend pointed at the production database (see "What not to do locally"), a row exists whose `rpIdHash` is for `localhost`, and the chip will stay hidden after the fix. Unverified whether any such row exists.

### What we will do

1. On the EC2 box, in `~/portfolio-backend/.env`, add the three lines from [backend .env.example:66](../../../../edens.zac.backend/.env.example#L66):

   ```
   WEBAUTHN_RP_ID=zacedens.com
   WEBAUTHN_RP_NAME=Zac Edens Photography
   WEBAUTHN_ALLOWED_ORIGINS=https://zacedens.com,https://www.zacedens.com
   ```

   Confirm `SPRING_PROFILES_ACTIVE=prod` is in the same file. Run `bash ~/portfolio-backend/repo/deploy.sh`.

2. Same visit, before the redeploy, record which of the two cases above was true. [backend WebAuthnConfig.java:42](../../../../edens.zac.backend/src/main/java/edens/zac/portfolio/backend/config/WebAuthnConfig.java#L42) logs `WebAuthn rpId={} rpName={}` at boot:

   ```
   cd ~/portfolio-backend/repo && docker compose logs backend | grep -E 'WebAuthn rpId=|profiles are active'
   grep -E 'SPRING_PROFILES_ACTIVE|WEBAUTHN' ~/portfolio-backend/.env
   ```

   If the profile was not `prod`, treat that as its own incident: the BFF secret filter and both prod guards were off.

3. Prove the fix with no account involved:

   ```
   docker compose logs backend | grep 'WebAuthn rpId='
   curl -s -X POST https://zacedens.com/api/proxy/api/auth/webauthn/login/start \
     -H 'Content-Type: application/json' -H 'Origin: https://zacedens.com' \
     -d '{"email":"nobody-probe@example.invalid"}' | grep -o '"rpId":"[^"]*"'
   ```

   Expect `rpId=zacedens.com` in the log and `"rpId":"zacedens.com"` from curl. If the redeploy refuses to boot with the `ProdWebAuthnGuard` message, the `.env` edit did not take.

4. In production DevTools, signed in as the admin, `GET /api/proxy/api/auth/me` and read `passkeyCount`. If it is above 0 before any successful enrollment, delete the stale credential through the backend admin endpoint (`DELETE /api/admin/users/{id}/passkeys/{credentialId}`, backend PR #257) so the chip comes back.

5. Phone test on `https://zacedens.com` (apex, not www): sign in with the password, tap "Face / Touch ID" on `/admin`, confirm the OS sheet opens and the chip disappears, log out, sign in with the button on `/login`. Repeat on Android. There is no headless way to exercise a real platform authenticator on the live domain.

6. Frontend PR for www: add `https://www.zacedens.com` as a second exact-match origin in [originAllowlist.ts:58](../../../app/utils/originAllowlist.ts#L58), or add a host redirect at the DNS or Amplify layer and keep the allow-list single. Add the `www` case to [route.test.ts](../../../tests/api/proxy/route.test.ts).

7. Once step 5 passes, close the 2026-09-09 "does not work at all" entry and the "passkey login has never been e2e-verified against a deployed environment" line in [au-auth-accounts.md](../../spikes/2026-features/au-auth-accounts.md).

### What not to do locally

Do not run `tests/e2e/passkey.spec.ts` against the current local setup. Port 5432 on this Mac is an `ssh` listener, which is the autossh tunnel to the production database recorded on 2026-09-05. [backend docker-compose.yml:17](../../../../edens.zac.backend/docker-compose.yml#L17) points the local backend at `${POSTGRES_HOST:-localhost}:5432`. Enrolling a passkey locally would very likely write a `webauthn_credential` row into the production database, scoped to `localhost`, which is exactly what side finding 2 describes. Unverified only because the container's `SPRING_DATASOURCE_URL` could not be read from here. Point the local backend at a local Postgres first, and say so in the [playwright.config.ts](../../../playwright.config.ts) docblock, which today only says "the docker-compose backend".

### Open questions

- www: allow the second origin in code, or redirect www to apex at the DNS or Amplify layer? The redirect also fixes duplicate-content SEO; the allow-list change is five lines and a test.

## 2. Security

### What was verified clean

No unauthenticated path to admin or user data was found. The model is an HttpOnly, `SameSite=Strict`, 256-bit session cookie minted and validated by the backend, a BFF that rejects anonymous admin and edit calls in production, an exact-match Origin allow-list on every write, and `hasRole('ADMIN')` on `/api/admin/**` in every backend profile.

| Checked | Result | Where |
| --- | --- | --- |
| BFF path traversal to Spring actuator (`api/../actuator`, `..%2f`, `..;/`, `%2e%2e`) | all 404 | [route.ts:29](../../../app/api/proxy/%5B...path%5D/route.ts#L29), 42 to 44; pinned [route.test.ts:526](../../../tests/api/proxy/route.test.ts#L526) to 618 |
| Anonymous `/api/admin/**`, `/api/edit/**` through the BFF in prod | 401 before forwarding | [route.ts:54](../../../app/api/proxy/%5B...path%5D/route.ts#L54) to 60, 130; [route.test.ts:292](../../../tests/api/proxy/route.test.ts#L292) to 404 |
| Backend role gates in every profile | `hasRole('ADMIN')` / `hasRole('USER')` unconditional | [backend SecurityConfig.java:90](../../../../edens.zac.backend/src/main/java/edens/zac/portfolio/backend/config/SecurityConfig.java#L90) |
| Client-supplied `X-Internal-Secret`, `X-Real-IP`, `X-Forwarded-For`, `True-Client-IP`, `CF-Connecting-IP` | stripped, secret overwritten, real IP rebuilt from the last hop | [route.ts:70](../../../app/api/proxy/%5B...path%5D/route.ts#L70) to 92, 105 to 112; [route.test.ts:464](../../../tests/api/proxy/route.test.ts#L464) |
| CSRF on every write | Origin exact match, never normalised, plus `SameSite=Strict`; missing Origin is 403 | [originAllowlist.ts:76](../../../app/utils/originAllowlist.ts#L76) to 87; [route.ts:143](../../../app/api/proxy/%5B...path%5D/route.ts#L143); [revalidate/route.ts:48](../../../app/api/revalidate/route.ts#L48) |
| Body caps | 16 KB JSON, 25 MB multipart, declared and buffered | [route.ts:140](../../../app/api/proxy/%5B...path%5D/route.ts#L140) to 161 |
| `Set-Cookie` forwarding | `HttpOnly; Secure; SameSite=Strict` kept verbatim | [route.ts:192](../../../app/api/proxy/%5B...path%5D/route.ts#L192) |
| Open redirect | none; every `redirect()` target is a literal or passes `resolveTabKey` | [admin.ts:62](../../../app/utils/admin.ts#L62), [user/page.tsx:35](../../../app/user/page.tsx#L35) |
| Invite tokens | 256-bit CSPRNG, SHA-256 at rest, 7-day TTL, single use; `referrer: no-referrer`; logger masks the path | [invite/[token]/page.tsx:19](../../../app/invite/%5Btoken%5D/page.tsx#L19), [logger.ts:21](../../../app/utils/logger.ts#L21) |
| Share links `/s/[token]` | same token construction; flyby cookie carries no authorities; page renders `me={null}` | [s/[token]/page.tsx:63](../../../app/s/%5Btoken%5D/page.tsx#L63) |
| Client gallery gate | enforced server-side; backend nulls `content` without the cookie; downloads re-check every parent; 5 attempts per 15 min | [CollectionPageWrapper.tsx:113](../../../app/components/ContentCollection/CollectionPageWrapper.tsx#L113) |
| Contact form | `@Valid`, per-email 5/hour, bounded global bucket, IP limiter; frontend caps at 5000 chars | [ContactForm.tsx:96](../../../app/components/ContactForm/ContactForm.tsx#L96) |
| `dangerouslySetInnerHTML` | one use, JSON-LD, `<` escaped | [CollectionJsonLd.tsx:37](../../../app/components/StructuredData/CollectionJsonLd.tsx#L37), [structuredData.ts:72](../../../app/utils/structuredData.ts#L72) |
| `isLocalEnvironment()` | build-time env only; no header or cookie can flip it | [environment.ts:1](../../../app/utils/environment.ts#L1) |
| Secrets in the bundle | only `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_ENV`; `API_URL` and `INTERNAL_API_SECRET` are server-only | [route.ts:9](../../../app/api/proxy/%5B...path%5D/route.ts#L9), 112 |
| Error responses | BFF returns generic `Bad gateway`; no stack traces | [route.ts:173](../../../app/api/proxy/%5B...path%5D/route.ts#L173) |
| Logging | no credential, cookie or token logged; search and hash dropped | [logger.ts](../../../app/utils/logger.ts) |
| Client storage | no token or credential; admin panel cache in `localStorage`, collection payloads in `sessionStorage` | [useCachedPanelData.ts:115](../../../app/hooks/useCachedPanelData.ts#L115) |
| `.env*` files checked in | none | |

Severity count: High 1, Medium 2, Low 5.

### High: next 16.3.4 has seven open advisories, fixed in 16.3.8

Installed: `node_modules/next/package.json` is 16.3.4; [package.json:31](../../../package.json#L31) pins `^16.2.6`. `npm audit --omit=dev` on 2026-10-17 lists: RCE in `next/og` ImageResponse (`>=16.2.0 <16.3.6`, GHSA-vcvr-r3jv-pc5j); cache poisoning of SSG/ISR pages in self-hosted apps (`<16.3.8`, GHSA-4jqv-mc3x-m676, GHSA-mcj8-r9mp-w47p); SSRF in Image Optimization (GHSA-cjq9-62q9-8jv4); Draft Mode leak; metadata image route disclosure; dev-server MCP disclosure.

Exploit sketch: the ISR cache-poisoning advisories target self-hosted Next, which is what Amplify Hosting is. A crafted request can pin a wrong or broken render in the cache. `next/og` is not imported anywhere and `draftMode` is unused, so the RCE is not reachable today.

Fix:

```json
"next": "^16.3.8"
```

then `npm install`, `npm test`, `npx tsc --noEmit`, and a production smoke after Amplify deploys. `sharp` (librsvg CVE-2026-96889) and `source-map-js` have no upstream fix yet; `sharp` is only reachable through the optimizer, which only fetches from the CloudFront host once the Medium item below is fixed.

Test: add `npm audit --omit=dev --audit-level=high` to the required CI check in `.github/workflows/` so a vulnerable production dependency cannot reach `main`.

### Medium: /api/revalidate accepts any tag or path from any logged-in user

[revalidate/route.ts:44](../../../app/api/revalidate/route.ts#L44) checks only that an `ezac_session` cookie exists. Invited client accounts hold that cookie. The body is unrestricted (lines 61 to 77): `path: "/"` or any tag. The docblock at lines 16 to 22 assumes callers are admins, which was true before invited users existed.

Exploit sketch: a client-gallery user scripts `POST /api/revalidate {"path":"/"}` from their own browser on the site's origin. Every render goes back to Lambda and Spring until they stop. Cost and availability, no data exposure.

Fix: resolve the principal the way [clearCache.ts:26](../../../app/lib/actions/clearCache.ts#L26) does.

```ts
import { meServer } from '@/app/lib/api/auth';

export async function POST(req: NextRequest) {
  if (!isLocalEnvironment()) {
    const principal = await meServer().catch(() => null);
    if (!principal?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  if (!isAllowedWriteOrigin(req.headers.get('origin'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
```

Test, in [revalidate/route.test.ts](../../../tests/api/revalidate/route.test.ts): mock `meServer` to return `{ isAdmin: false }` with a valid cookie and allowed Origin, expect 401 and no `revalidateTag` call; `{ isAdmin: true }` expect 200.

### Medium: images.remotePatterns allows http://localhost in production

[next.config.js:92](../../../next.config.js#L92) lists `{ protocol: 'http', hostname: 'localhost' }` unconditionally, while the CSP `img-src` adds `http://localhost:*` only when `isDev` (line 45). In production the optimizer would accept `/_next/image?url=http://localhost:<port>/...` and fetch it from inside the Amplify compute. That is the configuration the SSRF advisory above describes.

Locally, `GET /_next/image?url=http%3A%2F%2Flocalhost%3A8080%2Factuator%2Fhealth&w=640&q=65` returned `400 "url" parameter is not allowed`. Why it rejected is unverified, and production behaviour is unverified. Treat as hardening with a one-line fix.

```js
images: {
  remotePatterns: [
    ...(isDev ? [{ protocol: 'http', hostname: 'localhost' }] : []),
    { protocol: 'https', hostname: CLOUDFRONT_HOST, pathname: '/**' },
  ],
```

Test: in `tests/config/` next to [imageQuality.test.ts](../../../tests/config/imageQuality.test.ts), import `next.config.js` with `NODE_ENV=production` and assert `remotePatterns` has exactly one entry, `https`, `d2qp8h5pbkohe6.cloudfront.net`.

### Low: no Permissions-Policy header

[next.config.js:65](../../../next.config.js#L65) sets X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS and CSP-Report-Only. Nothing disables camera, microphone, geolocation or payment for embedded or injected content.

```js
{ key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
```

`publickey-credentials-get` defaults to `self`, so this does not break passkeys. Test: assert the header in a `tests/config/securityHeaders.test.ts`.

### Low: dev backend answers anonymous /api/admin/** as the bootstrap admin on every interface

[backend DevLocalAdminFilter.java:40](../../../../edens.zac.backend/src/main/java/edens/zac/portfolio/backend/config/DevLocalAdminFilter.java#L40) is `@Profile("dev")` and applies to every `/api/admin/` request with no remote-address check (line 64). No `server.address` is set, so Spring listens on all interfaces. Verified: anonymous `GET http://localhost:8080/api/admin/users` returned 200, and so did the same path through the BFF on 3001. Anyone on the same Wi-Fi as a running dev backend can list users and call every admin write on the dev database.

This also corrects a line in [CLAUDE.md](../../../CLAUDE.md). "The shell renders while its data 401s" is only true when the backend runs without the `dev` profile or with a blank `ADMIN_BOOTSTRAP_EMAIL`. With the dev profile and a bootstrap admin row, local admin data loads anonymously. That is the backend's documented design, not a bug, and the frontend doc should say so.

Fix (backend): `server.address=127.0.0.1` in [backend application-dev.properties](../../../../edens.zac.backend/src/main/resources/application-dev.properties). Phone-on-LAN testing goes through the Next dev server, which reaches the backend over `localhost:8080` ([core.ts:85](../../../app/lib/api/core.ts#L85)), so this does not break it. Unverified: whether the backend ever runs inside Docker with a port mapping, where a loopback bind would need the compose network's address instead. Alternative: skip the bootstrap in `DevLocalAdminFilter` unless `request.getRemoteAddr()` is loopback. Test: a `@SpringBootTest(profiles="dev")` MockMvc case with `remoteAddress("192.168.1.50")` on `/api/admin/users` expecting 401.

### Low: InternalSecretFilter logs the full request URI on reject

[backend InternalSecretFilter.java:60](../../../../edens.zac.backend/src/main/java/edens/zac/portfolio/backend/config/InternalSecretFilter.java#L60) logs the URI of every request that reaches the backend without the BFF secret. `/api/read/share/<token>` and `/api/auth/invite/<token>` are bearer-token URLs, so a scanner replaying a leaked link writes the live token into CloudWatch. Fix: log the method plus the first two path segments, or mask the last segment under `/share/` and `/invite/`. The frontend already does this at [logger.ts:106](../../../app/utils/logger.ts#L106).

### Low: clearCacheAction's backend leg cannot succeed in production

[clearCache.ts:70](../../../app/lib/actions/clearCache.ts#L70) calls `fetchAdminPostJsonApi('/cache/clear')` from a Server Action. Server-side, [core.ts:88](../../../app/lib/api/core.ts#L88) routes that through the public BFF, and the server's own `fetch` sends no `Origin`. [route.ts:143](../../../app/api/proxy/%5B...path%5D/route.ts#L143) then returns 403. The action still runs `revalidatePath` (line 76) and reports `{ ok: false, error: 'Backend cache clear failed: ...' }`. Unverified in production; deterministic from the code. The fix is the same direct-to-`API_URL` server path as speed item 2 in section 3. Functional, not a security hole.

### Low: confirm Amplify appends the client IP to x-forwarded-for

The BFF rebuilds the real IP from the last `x-forwarded-for` hop ([route.ts:105](../../../app/api/proxy/%5B...path%5D/route.ts#L105)) and the backend's [ClientIp.java:31](../../../../edens.zac.backend/src/main/java/edens/zac/portfolio/backend/config/ClientIp.java#L31) trusts `X-Real-IP` first. If Amplify's edge does not append the client IP, every rate limit keys on a proxy address and becomes shared across all visitors. Unverified. One production check: `curl -H 'X-Forwarded-For: 1.2.3.4'` to an endpoint that logs the resolved IP.

### Noted, no action

- CSP is report-only with `'unsafe-inline'` on `script-src` ([next.config.js:20](../../../next.config.js#L20)). Documented; the `/api/csp-report` sink now exists, so the nonce migration can be measured.
- HSTS omits `includeSubDomains` and `preload`. Deliberate.
- The admin panel cache keeps user emails and contact-message bodies in `localStorage` ([useCachedPanelData.ts:150](../../../app/hooks/useCachedPanelData.ts#L150)). Cleared on logout, not on session expiry or a different user signing in on the same browser. If it matters, key the cache by principal id.
- Gallery passwords are plaintext in the backend; share-link tokens are stored decryptable so the owner can re-copy them. Both are recorded design decisions.
- `/api/csp-report` has no Origin or session gate; a bot can flood CloudWatch at 8 KB per request. Edge rate limiting is outside this repo.

## 3. Speed

### What is wrong

Four things, in order of user-visible gain. The first is one line.

1. Phones download grid images 4x to 11x larger than they render.
2. Every server-side read in production makes two Lambda invocations instead of one.
3. The nav menu refetches `/auth/me` from the browser on every page view even though the server already resolved it.
4. Pages are never cached at the CDN. That is the PF13 Cache Components work, already scoped, and it is the second-order win, not the first. Warm production TTFB is 0.24 to 0.57 s.

Bundle and fonts are fine. No production Lighthouse baseline has ever been taken ([002-performance.md:22](../../002-performance.md#L22) item 1 is still open).

### 3.1 The mobile sizes bug

Every grid tile gets this at [CollectionContentRenderer.tsx:701](../../../app/components/Content/CollectionContentRenderer.tsx#L701):

```tsx
sizes: `(max-width: 768px) 100vw, ${Math.round(validWidth)}px`,
```

`validWidth` is the tile's own layout width, computed server-side for the UA-derived viewport ([ssrViewport.ts:21](../../../app/utils/ssrViewport.ts#L21)), so the second arm is exact. The first arm says: on any viewport up to 768 px, assume the image is the full viewport width. It is not. On a 393 px phone the server HTML for `/hidden-lake` carries 41 tiles of 87 to 206 CSS px, and the home page tiles are 137 to 247 px. The browser picks the 100vw arm, so at DPR 2 it asks for `w=828` for every tile, including the 92 px ones. Measured in the dev-server network log at 393×852.

Amplify's image service answers `/_next/image` in production (`x-amplify-optimized: true`). Bytes it returns for one sample image (`000024950001.webp`, 2024×1994 source, WebP q65):

| w | bytes |
| --- | --- |
| 128 | 1,908 |
| 256 | 6,450 |
| 384 | 14,564 |
| 640 | 41,434 |
| 750 | 58,128 |
| 828 | 71,404 |
| 1080 | 126,622 |
| 1200 | 156,884 |
| 1920 | 420,804 |
| 2048 | 688,650 |

What that costs per tile:

| Viewport / DPR | Tile CSS px | `sizes` resolves to | Chosen | Bytes | Correct | Bytes | Oversize |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 393 px, DPR 2 (measured) | 92 | 786 | 828w | 71,404 | 256w | 6,450 | 11.1x |
| 393 px, DPR 2 (measured) | 206 | 786 | 828w | 71,404 | 640w | 41,434 | 1.7x |
| 393 px, DPR 3 (computed) | 92 | 1179 | 1200w | 156,884 | 384w | 14,564 | 10.8x |
| 393 px, DPR 3 (computed) | 137 | 1179 | 1200w | 156,884 | 640w | 41,434 | 3.8x |
| 393 px, DPR 3 (computed) | 206 | 1179 | 1200w | 156,884 | 640w | 41,434 | 3.8x |
| 1440 px, DPR 1 (measured) | 265 | 265 | 640w | 41,434 | 640w | 41,434 | 1x |
| 1440 px, DPR 2 (computed) | 412 | 824 | 828w | 71,404 | 828w | 71,404 | 1x |

Desktop is right-sized. Mobile is wrong on every tile. First viewport on `/hidden-lake` at 393 px and DPR 3 is roughly 1.4 MB today and about 0.36 MB with exact sizes (computed from the HTML and the table, not measured). The hero is full-width on mobile and its preload is correct, so the PF3 priority work is intact. Screenshot: [screenshots/m-home.png](screenshots/m-home.png), the home grid on a phone, where each tile is about a quarter of the viewport width.

Fix. The client recomputes `sizes` on a real viewport before it is re-rendered, so the media query is not needed:

```tsx
sizes: `${Math.round(validWidth)}px`,
```

Edge case: a mobile browser with a desktop UA gets desktop-width candidates on first paint, then the client recompute ([constants/index.ts:72](../../../app/constants/index.ts#L72), `ssrRecomputeToleranceWidth`) rewrites `sizes` and the browser may fetch a second, smaller candidate. Strictly fewer bytes than today. [CollectionContentRenderer.nanSizes.test.tsx](../../../tests/components/Content/CollectionContentRenderer.nanSizes.test.tsx) pins the attribute's shape and needs updating.

Side fact: Amplify's optimizer honours `deviceSizes` and `imageSizes` but not the `qualities` allow-list (`q=75` returned 200 at 47,118 bytes against 41,434 at `q=65`). So the premise of [imageQuality.test.ts](../../../tests/config/imageQuality.test.ts), that a missing `quality` prop is a broken image, holds for `next start` and dev, not production. On Amplify a missed prop is a 14 percent heavier image.

Other `<Image>` sites were checked and are correct: sibling cover cards, location cover, `CoverCard`, the fullscreen viewer (no `sizes`, defaults to 100vw, correct for fullscreen), the 32 px admin thumbnails.

### 3.2 The proxy double hop

[core.ts:88](../../../app/lib/api/core.ts#L88) returns `${NEXT_PUBLIC_APP_URL}/api/proxy/api/...` for server-side fetches outside local. The proxy route then reads `process.env.API_URL` and calls Spring ([route.ts:9](../../../app/api/proxy/%5B...path%5D/route.ts#L9)). So one SSR read is page Lambda, then Amplify CloudFront, then proxy Lambda, then Spring. `meServer()` goes this way on every request. The page Lambda has the same environment as the proxy Lambda, so it can call `API_URL` directly with `X-Internal-Secret` (the two lines at [route.ts:112](../../../app/api/proxy/%5B...path%5D/route.ts#L112)). The proxy exists for the browser, not for the server. This same change makes `clearCacheAction`'s backend leg work (section 2).

### 3.3 The /auth/me refetch

The server resolves `me` ([CollectionPageWrapper.tsx:68](../../../app/components/ContentCollection/CollectionPageWrapper.tsx#L68)) and hands it to `CollectionPageClient` through `MeProvider` ([CollectionPage.tsx:131](../../../app/components/ContentCollection/CollectionPage.tsx#L131)). But `SiteHeader` renders outside that provider ([CollectionPage.tsx:120](../../../app/components/ContentCollection/CollectionPage.tsx#L120)), so `MenuDropdown` fetches it again from the browser ([MenuDropdown.tsx:147](../../../app/components/MenuDropdown/MenuDropdown.tsx#L147) via [useFetchMe.ts:28](../../../app/hooks/useFetchMe.ts#L28)). Every page load issues `GET /api/proxy/api/auth/me` from the client. In production that is one Lambda invocation plus one Spring call per page view, and the menu renders its signed-in state only after the round trip.

Per anonymous collection page view in production today: one collection read (Data Cache, up to 1 h), one server `/auth/me` through the double hop, one browser `/auth/me`. Three backend-bound calls, two of them for a principal that is `null`.

Also, for signed-in viewers only: [CollectionPageWrapper.tsx:88](../../../app/components/ContentCollection/CollectionPageWrapper.tsx#L88) (`getUserPage()`) and the second `Promise.all` at line 105 wait for the first batch to finish, but both only need `me`. One backend round trip can be saved by joining them to the first `Promise.all`.

### 3.4 Caching layers

| Layer | What is cached | How long | Invalidated by | Evidence |
| --- | --- | --- | --- | --- |
| Browser | HTML: nothing (`private, no-cache, no-store, max-age=0`) | 0 | n/a | `curl -I https://zacedens.com/` |
| Browser | `/_next/static/*` | 1 year, immutable | new build hash | `curl -I` |
| Browser | `/_next/image?...` | `max-age=31536000` (no `public`, no `immutable`) | URL changes with the content-hashed S3 key | `curl -I` |
| Browser | `/api/proxy/*` JSON | nothing (`no-store`) | n/a | `curl -I` |
| Amplify CloudFront | HTML: never (`x-cache: Miss` every time) | 0 | n/a | `curl -I` |
| Amplify CloudFront | optimized images | until evicted (`Hit`, `age: 309` on the second request) | new URL on re-upload | `curl -I` |
| Amplify CloudFront | static chunks | 1 year | new build | `curl -I` |
| Next (Lambda) | fetch Data Cache for 6 tagged reads: `collection-{slug}`, `collections-index`, `collections-location-{slug}`, `content-tags`, `content-locations`, `search-images` | 3600 s | `POST /api/revalidate` from the edit UI ([revalidate/route.ts:62](../../../app/api/revalidate/route.ts#L62)); `clearCacheAction` `revalidatePath('/', 'layout')` ([clearCache.ts:76](../../../app/lib/actions/clearCache.ts#L76)) | [collections.ts:115](../../../app/lib/api/collections.ts#L115), [content.ts:139](../../../app/lib/api/content.ts#L139) |
| Next (Lambda) | `me`, `user/me/page`, selects, saves, all-collections, admin reads | not cached (`no-store`) | n/a | [auth.ts:104](../../../app/lib/api/auth.ts#L104), [personal.ts:153](../../../app/lib/api/personal.ts#L153) |
| Next (Lambda) | image optimizer | not in the path in production; Amplify's service answers | | `x-amplify-optimized: true` |
| Spring | `Cache-Control` on allow-listed `/api/read/**`: `public, max-age=60, s-maxage=300, stale-while-revalidate=300`; `no-store` for `collections/{slug}` and viewer-dependent reads; dev profile sends `no-store` for everything | 60 s / 300 s | `ReadCacheInvalidator` CloudFront invalidation, only once `cloudfront.distribution-id` is set (it is not yet) | backend `ReadCachePolicy.java`, `CacheControlInterceptor.java`, [application.properties:126](../../../../edens.zac.backend/src/main/resources/application.properties#L126) |
| S3 plus image CloudFront | web renditions | `public, max-age=31536000, immutable` | content-hashed key per upload; path invalidation on delete | `curl -I https://d2qp8h5pbkohe6.cloudfront.net/...` |

Two facts from this table matter:

- The Data Cache key includes the forwarded `Cookie` header. `getCollectionBySlug` uses `fetchReadApi`, which forwards every cookie ([core.ts:281](../../../app/lib/api/core.ts#L281)), so any visitor carrying a cookie gets a private cache entry and a cold backend hit the first time. Anonymous visitors share one entry. Signed-in admins and anyone who has unlocked a gallery do not.
- Spring's `s-maxage=300` is not in the path. The BFF caches nothing and the server fetch adds its own 3600 s on top. The backend policy only starts to matter once the backend sits behind a CDN.

All public routes are `force-dynamic` (`grep -c "export const dynamic" app` is 19), no `use cache`, `cacheLife` or `cacheTag` exists under `app/`, and `cacheComponents` is not set in [next.config.js](../../../next.config.js). The production build confirms every route is dynamic except `/_not-found`.

### 3.5 The PF13 Cache Components route and its blocker

The plan is already written in [pf-performance-platform.md:7](../../spikes/2026-features/pf-performance-platform.md#L7) to 157, and nothing has changed since 2026-09-05: `cacheComponents` is app-wide, 19 routes export `force-dynamic` and must drop it, `fetchBase` reads `cookies()` on every server read ([core.ts:281](../../../app/lib/api/core.ts#L281)) so nothing can enter a `use cache` scope until cookie forwarding is passed in as an argument, and `CopyrightYear.tsx` still fails the prerender. Step 1 (hoist the cookie read) is the blocker for everything after it.

The target, once step 1 is done:

```tsx
// app/lib/api/collections.ts
import { cacheLife, cacheTag } from 'next/cache';

export async function getPublicCollection(slug: string): Promise<CollectionModel> {
  'use cache';
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  cacheTag(`collection-${slug}`, 'collections-index');
  const data = await fetchPublicRead<CollectionModel>(
    `/collections/${encodeURIComponent(slug)}?page=0&size=500`
  );
  if (data === null) notFound();
  return data;
}
```

```tsx
// app/components/ContentCollection/CollectionPageWrapper.tsx
export default async function CollectionPageWrapper({ slug }: Props) {
  const collection = await getPublicCollection(slug);
  return (
    <>
      <SiteHeader isCollectionPage collectionSlug={slug} />
      <Suspense fallback={<GridSkeleton collection={collection} />}>
        <ViewerGrid slug={slug} collection={collection} />
      </Suspense>
    </>
  );
}
```

`/api/revalidate` already speaks tags, so the admin side needs no change beyond the tag names. Two things decide whether this is worth it, both unverified: whether Amplify persists a `use cache` store across Lambda instances (by default it is in-memory per instance and is lost with it), and the password-protected branch must stay out of the cached read because `getCollectionBySlug` varies by the `gallery_access_<slug>` cookie ([collections.ts:100](../../../app/lib/api/collections.ts#L100)). Do not start PF13 for speed until items 1 to 3 have shipped and a production Lighthouse run shows TTFB is what remains.

### 3.6 Bundle and fonts

Fine. Measured from a Turbopack production build:

| Group | Files | Raw | Gzip |
| --- | --- | --- | --- |
| Root main on every route (React DOM, app-router runtime) | 5 | 429 KB | 127 KB |
| `/[slug]` client references (grid, filters, contexts, parallax) | 9 | 254 KB | 79 KB |
| of which the lazy fullscreen viewer chunk | 1 | 31 KB | 10 KB |
| Polyfills (`nomodule`, old browsers only) | 1 | 110 KB | 39 KB |
| Admin edit layer (`next/dynamic`, never requested publicly) | 1 | 100 KB | unverified |
| CSS on `/[slug]` | 4 | 155 KB | unverified |

About 206 KB gzip of JS on a public collection page. `EditModeLayer` ([CollectionPageClient.tsx:72](../../../app/components/ContentCollection/CollectionPageClient.tsx#L72)) and `FullScreenModal` are already `next/dynamic`. `lucide-react` is imported by name from 4 files, four icons. No date, lodash or animation library. Inter is one variable file via `next/font/google`, latin subset preloaded, `adjustFontFallback` on; Big Caslon is `local()` only with no network cost. Nothing to do. `next/font/google` needs network at build time, which Amplify has.

### 3.7 Prerendering below the fold

The grid is already server-rendered. All 41 `<img>` tags for `/hidden-lake` are in the server HTML, lazy except one, and the rest of the collection sits behind a "Load More" sentinel 400 px below the viewport ([ContentBlockWithFullScreen.tsx:17](../../../app/components/Content/ContentBlockWithFullScreen.tsx#L17)). So "prerender the rest after the landing" is already how it works at the image level. [app/loading.tsx:5](../../../app/loading.tsx#L5) wraps every page in Suspense, so the root layout and a spinner flush first.

What streaming would buy: the collection pages have no inner boundary. `CollectionPageWrapper` awaits everything, then renders `SiteHeader` and the grid in one go ([CollectionPage.tsx:118](../../../app/components/ContentCollection/CollectionPage.tsx#L118)). The header is inside the page, not the layout, so it does not reach the browser until the backend has answered. A Suspense boundary around the grid (the second code block in 3.5) would paint the header first. What it would not buy: fewer bytes or an earlier LCP, because the hero image is what LCP waits on and its preload is already in the first HTML.

### What we will do

| # | Change | Files | Size | Expected gain | How to measure |
| --- | --- | --- | --- | --- | --- |
| 1 | Mobile `sizes`: `${Math.round(validWidth)}px` | [CollectionContentRenderer.tsx:701](../../../app/components/Content/CollectionContentRenderer.tsx#L701); [CollectionContentRenderer.nanSizes.test.tsx](../../../tests/components/Content/CollectionContentRenderer.nanSizes.test.tsx) | S | Mobile grid bytes drop 4x to 11x per tile; `/hidden-lake` first viewport about 1.4 MB to 0.36 MB at DPR 3 (computed) | Lighthouse mobile on `https://zacedens.com/hidden-lake` before and after: "Properly size images", total image bytes, LCP. Keep the one `fetchpriority=high` preload. |
| 2 | Server fetches call `API_URL` directly with `X-Internal-Secret` | [core.ts:81](../../../app/lib/api/core.ts#L81) to 89; `tests/api/*` for `getApiBaseUrl` | S | One CloudFront hop and one Lambda invocation off every uncached SSR read and every `/auth/me`; 100 to 300 ms off cold TTFB (unverified); fixes `clearCacheAction` | `curl -w %{time_starttransfer}` ×5 on `/` and `/hidden-lake`, cold and warm; proxy Lambda invocations in CloudWatch |
| 3 | Pass `me` from the server to `SiteHeader` and `MenuDropdown`; drop the client `useFetchMe` on page load, keep the `AUTH_CHANGED_EVENT` refetch | [CollectionPage.tsx:120](../../../app/components/ContentCollection/CollectionPage.tsx#L120), [SiteHeader.tsx](../../../app/components/SiteHeader/SiteHeader.tsx), [MenuDropdown.tsx:147](../../../app/components/MenuDropdown/MenuDropdown.tsx#L147), the other 4 `<SiteHeader>` call sites, [useFetchMe.ts](../../../app/hooks/useFetchMe.ts) | S | One request per page view gone; menu shows signed-in state on first paint | Zero `/api/proxy/api/auth/me` on a public page load |
| 4 | Join the signed-in reads to the first `Promise.all` | [CollectionPageWrapper.tsx:65](../../../app/components/ContentCollection/CollectionPageWrapper.tsx#L65) to 110 | S | One round trip less for signed-in viewers | Server timing around the wrapper |
| 5 | Production Lighthouse baseline, recorded in `pf-performance-platform.md` | docs | S | The yardstick for 1 to 3 and the go/no-go for 6 | `npx lighthouse https://zacedens.com/ --preset=mobile` ×3, median; same for `/hidden-lake` |
| 6 | PF13 Cache Components, per the existing plan, starting with the `core.ts:281` cookie hoist | per [pf-performance-platform.md:92](../../spikes/2026-features/pf-performance-platform.md#L92) | L | Static shell from the CDN, if Amplify persists the cache (unverified) | TTFB and `x-cache: Hit` on HTML |
| 7 | PF16: `/search` corpus size | [SearchResults.tsx:12](../../../app/search/SearchResults.tsx#L12), `searchFilters.ts` | M | Smaller `/search` response (234 KB today) | Already measured in the spike doc |
| 8 | Backend: profile `GET /collections/{slug}` (0.5 to 0.7 s locally for 40 rows; N+1 on `camera`, `locations`, `tags`, `people` is the usual cause) | backend `CollectionService` | M | Cold page TTFB | `curl -w` on `:8080` |

Not recommended: more `next/dynamic`, swapping `lucide-react`, trimming payload fields (the `/hidden-lake` HTML is 11.9 KB gzipped on the wire), blur placeholders (dropped by the owner on PF2).

## 4. Simplify and reuse

### What the old duplication suspects turned into

Most are already resolved. Checked by reading and diffing both sides each time, since three earlier "duplicate" claims in this repo turned out to be separately written functions.

| Suspect | State today |
| --- | --- |
| Two synthetic home tile builders | Both are 10-line calls to `buildParallaxCard` ([parallaxCard.ts:107](../../../app/utils/parallaxCard.ts#L107)). Nothing left to merge. One repeated docblock sentence ("No `collectionId`") in [meContentBlock.ts:21](../../../app/utils/meContentBlock.ts#L21) and [allCollectionsContentBlock.ts:21](../../../app/utils/allCollectionsContentBlock.ts#L21) already lives on `ParallaxCardOptions.collectionId`; delete it from both. |
| TaxonomyPage vs LocationPage page-header SCSS | Stale. Neither directory has a page SCSS module any more; both render `PageShell` and `CollectionHeader` ([TaxonomyPage.tsx:19](../../../app/components/TaxonomyPage/TaxonomyPage.tsx#L19), [LocationPage.tsx:38](../../../app/components/LocationPage/LocationPage.tsx#L38)). The F4 merge (tag pages take filters, follow, cover) is still open and cold. |
| Six copies of `throwFromResponse` | Folded into [core.ts:128](../../../app/lib/api/core.ts#L128). `core.ts` is the single owner of every fetch wrapper. |
| Date, slug, image-URL, sort helpers | One owner each. No `toLocaleDateString` or `Intl.DateTimeFormat` outside `formatDateRange.ts`; `slugify` lives in `locationUtils.ts` and `tagUtils.ts` re-exports it; one `CDN_ORIGIN`. |
| Modals | All ten dialog consumers import `ui/Modal`. |
| Contexts vs URL state | 11 contexts, none a URL-state candidate. `CollectionFilterContext` is already URL-synced through `useFilterUrlState`; it only distributes state to a toolbar rendered deep inside the grid. |

### The real remaining duplication

1. The four admin panels write the same 15-line load, error, empty and stale skeleton. `UserManagementPanel`, `MessagesPanel`, `RolesPanel` and `CollectionsPanel` all sit on `ListPanel` and `useCachedPanelData`, which is the right split, but each re-types the body:

   | Piece | Users | Messages | Roles | Collections |
   | --- | --- | --- | --- | --- |
   | `useCachedPanelData(key, fetcher, 'Could not load X. Retry, or check that the backend is running.')` | [UserManagementPanel.tsx:86](../../../app/components/UserManagementPanel/UserManagementPanel.tsx#L86) | [MessagesPanel.tsx:61](../../../app/components/MessagesPanel/MessagesPanel.tsx#L61) | [RolesPanel.tsx:101](../../../app/components/RolesPanel/RolesPanel.tsx#L101) | [CollectionsPanel.tsx:73](../../../app/components/CollectionsPanel/CollectionsPanel.tsx#L73) |
   | `if (loadError) <LoadError/> else if (empty) <EmptyState/> else list` | :129 | :92 | :212 | :84 |
   | `<LoadingText isLoading={loading}>` | :227 | :131 | :263 | :133 |
   | `{!loading && !loadError && revalidationFailed && <StaleNotice/>}` | :242 | :132 | :293 | :134 |

   The error copy is repeated a fifth time in `RoleDetailView.tsx:79`. Owner: a `PanelBody` next to `ListPanel` taking `{ loading, loadError, revalidationFailed, onRetry, isEmpty, empty, children }`, plus a default error message derived from the panel key inside [useCachedPanelData.ts:285](../../../app/hooks/useCachedPanelData.ts#L285). Users and Roles guard the stale notice with `view.mode === 'list'`; `PanelBody` takes a `showStatus` boolean for that. All four panels have suites.

2. `LocationPageClient` and `SearchPageClient` share 84 identical non-trivial lines of filter wiring: `useFilterUrlState` plus seeded state ([LocationPageClient.tsx:35](../../../app/components/LocationPage/LocationPageClient.tsx#L35), [SearchPageClient.tsx:51](../../../app/components/SearchPage/SearchPageClient.tsx#L51)), the `availableOptions` / `visibility` / `criteria` memos, filter then optional `sortByDate`, `filterCounts` in a `try/catch` with a zeroed fallback (Search names it `EMPTY_COUNTS`, Location inlines the same 12-line literal at line 64), `handleFilterChange`, and the `FilterToolbar` prop block. What differs: `buildLocationCriteria` vs `buildSearchCriteria`, Location keeps non-image blocks, Location renders `LocationCollections` above the toolbar. Owner: a `useFilteredImagePage(images, buildCriteria)` hook in `app/hooks/` returning `{ filterState, handleFilterChange, visibility, availableOptions, filterCounts, filteredContent }`, with the toolbar prop block in the existing `filterToolbarUtils.ts`. `CollectionPageClient` is not a candidate; it routes the same state through context. `LocationPageClient` has no test; write one first. Related: `FilterToolbarProps` has 22 fields, the widest interface in the repo, because two callers pass props and one uses context.

3. `MenuDropdown` re-implements `Modal`'s dialog logic, and `Modal` says so in its own docblock ([Modal.tsx:33](../../../app/components/ui/Modal/Modal.tsx#L33)):

   | Concern | `Modal.tsx` | `MenuDropdown.tsx` |
   | --- | --- | --- |
   | `FOCUSABLE_SELECTOR` | :22 | :36 |
   | restore focus to trigger or header | :38 | :66 to 80 |
   | Tab trap | inside | :193 to 215 |
   | Escape listener | inside | :237 to 247 |
   | `useBodyScrollLock` | :52 | :250 |
   | `role="dialog" aria-modal` | inside | :314 |

   About 60 lines twice. Owner: a `useDialogFocus(ref, open, onClose)` hook in `app/hooks/`, or `MenuDropdown` rendering through `Modal`'s existing `sheet` variant ([Modal.tsx:10](../../../app/components/ui/Modal/Modal.tsx#L10)). Medium regression risk (keyboard focus); `tests/components/MenuDropdown.test.tsx` has 40 tests.

4. Three copies of the `POST /api/revalidate` call in [collectionEditUtils.ts:211](../../../app/components/ContentCollection/edit/collectionEditUtils.ts#L211), [:270](../../../app/components/ContentCollection/edit/collectionEditUtils.ts#L270) and [:296](../../../app/components/ContentCollection/edit/collectionEditUtils.ts#L296). One local `postRevalidate(body)` removes two. Tests: `locationCacheRevalidation.test.tsx`, `collectionEditUtils.test.ts`.

Smaller, optional: the four small form modals and six forms each hand-roll `error` plus `submitting` state, a `trim()` validate, `try / catch / finally` and a Cancel plus submit footer. A `useSubmitState()` hook would remove about 20 lines from each. Do it only when one of those files is next opened. The 409/404 error-to-copy mapping appears at seven `instanceof ApiError` sites with different copy each time; the copy is the point, so leave it.

### The All Collections tile never renders publicly, and getUserPage is fetched for nothing

Screenshot: [screenshots/m-home.png](screenshots/m-home.png). The home page on a phone shows Travel, Event and Hidden Lake, then the footer. No All Collections tile.

- `buildAllCollectionsContentBlock` passes no `coverImage`, so `imageUrl` is `''` ([parallaxCard.ts:153](../../../app/utils/parallaxCard.ts#L153)).
- [contentLayout.ts:282](../../../app/utils/contentLayout.ts#L282) `hasRenderableContent` returns false for an IMAGE block with a blank `imageUrl`, and `filterVisibleBlocks` applies it whenever `filterVisible` is true (line 301).
- The public grid calls `processContentBlocks(filteredContent, true, ...)` ([CollectionPageClient.tsx:541](../../../app/components/ContentCollection/CollectionPageClient.tsx#L541)). Only the edit layer passes `false`.
- The working-tree test for the tile uses `filterVisible: false` and says why in its docblock: "the public path drops both cover-less tiles on renderability before it ever sorts them" ([allCollectionsContentBlock.test.ts](../../../tests/utils/allCollectionsContentBlock.test.ts), new lines 31 to 34).
- The Me tile ([meContentBlock.ts:30](../../../app/utils/meContentBlock.ts#L30)) survives only when `userPage.coverImage` is set.

History: `hasRenderableContent` landed in `64cc302a` (2026-06-17), before the Me tile (`359c6d84`, 2026-06-27) and the All Collections tile (`68b95b42`, 2026-07-15). The tiles were born under the filter. Unverified whether the All Collections tile has ever been visible to a public viewer. The wrapper tests ([CollectionPageWrapper.allCollectionsTile.test.tsx:81](../../../tests/components/ContentCollection/CollectionPageWrapper.allCollectionsTile.test.tsx#L81)) assert array position on the props handed to `CollectionPage`, not rendered output, so they cannot catch this.

Cost: [CollectionPageWrapper.tsx:88](../../../app/components/ContentCollection/CollectionPageWrapper.tsx#L88) does an extra `no-store` `getUserPage()` fetch for every signed-in home render to build a tile that only renders when a cover exists.

### Dead code

Exported, used only inside the file, no test imports it. Drop `export`:

```
app/components/UserForm/UserRolesSection.tsx:16   ROLES_HREF
app/components/UserSpace/UserSpaceGrid.tsx:46     reconcileCollectionsCount
app/components/UserSpace/UserSpaceGrid.tsx:73     pruneUnfollowed
app/components/ui/SkipLink/SkipLink.tsx:6         MAIN_CONTENT_ID
app/utils/collectionSlugs.ts:24                   SHADOWED_ROUTE_SLUGS
app/utils/rowCombination.ts:100                   LOW_RATED_THRESHOLD
app/utils/rowCombination.ts:229                   AR_FLOOR_MULTIPLIER
app/utils/rowCombination.ts:232                   ROW_TARGET_AR_MIN_FRACTION
app/utils/rowCombination.ts:236                   ROW_TARGET_AR_VV_HIGH
app/components/ListPanel/listPanelShape.ts:81     SLOT_GAP
```

Exported only so a test can reach them: `__authTestInternals` ([auth.ts:264](../../../app/lib/api/auth.ts#L264)) and `composeRowWithCandidateCount` ([rowCombination.ts:1873](../../../app/utils/rowCombination.ts#L1873)). The other 45 test-reachable exports are also used inside their files; that is a testing convention, leave them. Roughly 90 exported `Props` interfaces have no importer; harmless.

SCSS with no TSX reference: `.overlayContainer` (lines 107, 128), `.dragContainer` (320), `.parallaxContainer` (334) in [ContentComponent.module.scss](../../../app/components/Content/ContentComponent.module.scss). Checked against all six importers and every test, with dynamic `styles[...]` access accounted for. Delete. The other nine largest modules have no orphans.

The `CollectionPage` array branch ([CollectionPage.tsx:141](../../../app/components/ContentCollection/CollectionPage.tsx#L141) to 169) has no production caller. Both call sites pass a single `CollectionModel` ([CollectionPageWrapper.tsx:120](../../../app/components/ContentCollection/CollectionPageWrapper.tsx#L120), [AllImagesClient.tsx:83](../../../app/components/Admin/AllImagesClient.tsx#L83)). It is kept alive by [CollectionPage.test.tsx:106](../../../tests/components/ContentCollection/CollectionPage.test.tsx#L106) onward, about 150 test lines for 30 source lines, and the working tree adds another case. `collectionToContentModel` is live only for this branch. Unverified whether a future caller is planned.

Three `'use client'` directives are redundant (`ReadOnlyInfoSection.tsx`, `MediaPreview.tsx`, `CollectionEditSheet.tsx`; each is only rendered inside a client tree). No client component is wrongly client. `MessagesPanel.tsx:54` hand-sorts by `createdAt` instead of calling `sortByDate`, which accepts `{ createdAt }` ([sortByDate.ts:9](../../../app/utils/sortByDate.ts#L9)).

### Complexity hot spots

Source: 274 files, 38,838 lines under `app/`, plus 86 SCSS modules. Tests: 274 files, 62,633 lines (1.6 to 1).

Functions over 80 lines (single-line signatures only, so the scan misses multi-line component signatures):

```
327  app/utils/rowCombination.ts:790              buildRows
162  app/utils/contentRendererUtils.ts:232        normalizeContentToRendererProps
160  app/components/UserForm/UserForm.tsx:52      UserForm
152  app/hooks/useCachedPanelData.ts:285          useCachedPanelData
120  app/utils/contentFilter.ts:163               filterContent
114  app/utils/contentFilter.ts:542               computeFilterCounts
 98  app/utils/contentFilter.ts:311               extractFilterOptions
 91  app/components/UserSpace/userSpaceData.ts:303  loadUserSpace
 89  app/utils/rowStructureAlgorithm.ts:367       sizeSubtree
 88  app/(admin)/collection/manage/[[...slug]]/CreateCollectionForm.tsx:22  CreateCollectionForm
 86  app/login/LoginForm.tsx:56                   LoginForm
 82  app/components/ContentCollection/edit/collectionEditUtils.ts:39  buildUpdatePayload
```

By inspection, `CollectionPageClient` (740 lines, 17 props, 9 `useState`) and `useCollectionEdit` (1829 lines, 23 `useState`) are the two largest function bodies. `useCollectionEdit` decomposition is already row F1 on the refactor board.

Props interfaces over 8 fields: `FilterToolbarProps` 22, `CollectionListSelectorProps` 18, `MetadataModalProps` 17, `CollectionPageClientProps` 17, `FullScreenModalProps` 15, `ContentBlockWithFullScreenProps` 12, `EditRendererProps` 12, `ContentComponentProps` 11, `UserSpaceGridProps` 11, `ReorderOverlayProps` 10.

Prop drilling: the SSR viewport travels as three props (`serverContentWidth`, `serverViewportHeight`, `serverIsMobile`) through four hops, `CollectionPageWrapper` to `CollectionPage` to `CollectionPageClient` to `ContentBlockWithFullScreen` to `Component`; eight files mention `serverContentWidth`. The wrapper already holds them as one `SsrViewport` object. `me` is drilled the same way until `CollectionPageClient` mounts `MeProvider`.

### Rule conformance

| Rule | Count | Detail |
| --- | --- | --- |
| `any` | 0 | the five grep hits are docblock prose |
| `import React` / namespace import | 0 | seven uses of the global `React.*` type namespace without an import: `Dropdown.tsx:140,169,197`, `Modal.tsx:89`, `ClientGalleryGate.tsx:81`, `CollectionFilterContext.tsx:103`, `ClientGalleryDownloadContext.tsx:31`. Replace with named type imports from `'react'`. |
| Inline-comment warnings (`local/no-inline-comments-in-functions`) | 2259 in 179 files | 607 in `app/`, 1652 in `tests/`. Top `app/` files: `useFullScreenImage.tsx` 80, `rowCombination.ts` 76, `metadataUtils.ts` 44, `contentFilter.ts` 31, `rowStructureAlgorithm.ts` 29, `contentLayout.ts` 25, `useParallax.ts` 25. Plus 8 JSX-comment warnings (`ReorderOverlay.tsx:86,319`, `StructureTab.tsx:173`, `EssentialInfoSection.tsx` ×5). |
| SCSS module per component | 49 `.tsx` without a same-named module | 46 import a sibling's module; 3 render no class at all (`MessageRow`, two SVG icons). No violation worth acting on. |
| Tests for `app/lib` | 0 missing | |
| Tests for `app/utils` | 2 untested | `collectionToggle.ts`, `sharedObserver.ts` (no test references them); `collectionSlugs.ts` only indirectly |
| Tests for `app/hooks` | 1 untested | `useThrottle`; `useParallax`, `useViewport`, `inViewport`, `useMetadataEditor` are covered by component suites |

### Test health

269 suites, 4993 tests, 0 failures, 0 snapshots, 12.4 to 13.3 s wall across three runs. The slowest suite is `tests/(admin)/admin/page.collapseStates.test.ts` at 11.9 s for 486 cases (a `describe.each` over width and collapse state running the real packer); everything else is under 2.7 s. Splitting it would not move wall time because Jest runs it in parallel. 36 `act()` warnings per run, matching the board's post-#408 count; per-suite attribution (`page.test.tsx` 22, `useCollectionEdit.test.tsx` 7) is approximate under parallel workers. 160 `console.error` / `console.warn` lines per run, not attributed. Mock-heavy suites are the page-level ones (`page.space.test.tsx` 15 `jest.mock` calls, `user/page.test.tsx` 11); that is a symptom of pages importing many API modules, not of the tests. No test mocks its own module under test.

### What we will do

| # | Refactor | Files | Size | Test that proves it safe |
| --- | --- | --- | --- | --- |
| 1 | Decide the synthetic tiles' public fate (see open question) and stop the wasted `getUserPage()` fetch | [contentLayout.ts:282](../../../app/utils/contentLayout.ts#L282), [CollectionPageWrapper.tsx:84](../../../app/components/ContentCollection/CollectionPageWrapper.tsx#L84), [allCollectionsContentBlock.ts](../../../app/utils/allCollectionsContentBlock.ts) | S | New: render home through `CollectionPageClient` with `filterVisible` true and assert a `/collections` link is present or absent per the decision |
| 2 | Drop `export` from the 10 internal-only symbols | list above | S | `tsc`, full suite |
| 3 | Delete the three orphan SCSS classes | [ContentComponent.module.scss](../../../app/components/Content/ContentComponent.module.scss) | S | `stylelint`, `tests/components/Content/` |
| 4 | One `postRevalidate(body)` helper | [collectionEditUtils.ts:211](../../../app/components/ContentCollection/edit/collectionEditUtils.ts#L211) | S | `locationCacheRevalidation.test.tsx`, `collectionEditUtils.test.ts` |
| 5 | Pass `ssrViewport` as one object through the collection stack | `CollectionPage.tsx`, `CollectionPageClient.tsx`, `ContentBlockWithFullScreen.tsx`, `Component.tsx`, callers in `UserSpaceGrid.tsx`, `AdminHubClient.tsx`, `collections/page.tsx` | S to M | `CollectionPage.test.tsx`, `CollectionPageClient.mobileBudget.test.tsx`, `ssrViewport.test.ts` |
| 6 | `PanelBody` for the four admin panels, default error copy in `useCachedPanelData` | `ListPanel/`, the four panels, [useCachedPanelData.ts](../../../app/hooks/useCachedPanelData.ts) | M | The four panel suites, `useCachedPanelData.test.tsx` |
| 7 | `useFilteredImagePage` shared by Location and Search | `app/hooks/`, both clients, `filterToolbarUtils.ts` | M | Write `tests/components/LocationPage/LocationPageClient.test.tsx` first |
| 8 | `MessagesPanel` sort via `sortByDate` | [MessagesPanel.tsx:54](../../../app/components/MessagesPanel/MessagesPanel.tsx#L54) | S | `tests/components/MessagesPanel/` |
| 9 | Named `react` type imports for the seven `React.*` uses | list above | S | `tsc`, `eslint` |
| 10 | Tests for `collectionToggle.ts`, `sharedObserver.ts`, `useThrottle.ts` | `tests/utils/`, `tests/hooks/` | S each | They are the tests |
| 11 | Inline-comment burn-down in the seven `app/` files with 25 or more warnings | list above | M, mechanical | `npx eslint app --rule 'local/no-inline-comments-in-functions: error'` on those files |
| 12 | `MenuDropdown` on `Modal`, or a shared `useDialogFocus` | [MenuDropdown.tsx:36](../../../app/components/MenuDropdown/MenuDropdown.tsx#L36), [Modal.tsx](../../../app/components/ui/Modal/Modal.tsx) | M | `MenuDropdown.test.tsx` (40), `Modal.test.tsx` |
| 13 | Decide the `CollectionPage` array branch: keep for a planned caller or delete with its tests | [CollectionPage.tsx:141](../../../app/components/ContentCollection/CollectionPage.tsx#L141), [CollectionPage.test.tsx:106](../../../tests/components/ContentCollection/CollectionPage.test.tsx#L106) | S | Full suite |
| 14 | F4: fold `TaxonomyPage` into `LocationPage`'s client path | `TaxonomyPage/`, `LocationPage/`, `app/tag/` | L | `TaxonomyPage.test.tsx` plus the Location suite from item 7 |
| 15 | Optional `useSubmitState` for six forms and four modals | forms and modals above | M | Each form's suite, only when next opened |

### Open questions

- The All Collections tile: (a) exempt the two sentinel ids in `hasRenderableContent`, which routes them to the renderer's placeholder branch at [CollectionContentRenderer.tsx:543](../../../app/components/Content/CollectionContentRenderer.tsx#L543); (b) give the tile a real cover; or (c) stop building it on the public path and skip `getUserPage()` when the Me tile cannot render either? Was it ever meant to show to anonymous visitors?
- The `CollectionPage` array branch: is a caller planned, or can it and its tests go?

## 5. Navigation logic

The UX view (menu contents, where links go, what is missing from the menu) is in [01-design-review.md](01-design-review.md), navigation section. This section lists only route-level code behaviour that came up in the code review.

| Behaviour | Where | Note |
| --- | --- | --- |
| `/user` redirects an admin to `/admin`, carrying `?tab=` through `resolveTabKey`; an anonymous visitor gets 404 | [user/page.tsx:30](../../../app/user/page.tsx#L30) to 35 | Works as designed since PR #437. Every `redirect()` target is a literal or goes through `resolveTabKey`, so there is no open redirect. |
| `www.zacedens.com` serves the site with a 200 and no redirect to the apex, and every write there is 403 | [originAllowlist.ts:58](../../../app/utils/originAllowlist.ts#L58), [route.ts:143](../../../app/api/proxy/%5B...path%5D/route.ts#L143) | Section 1, side finding 1. A host-level redirect would fix navigation and the 403 at once. |
| Legacy `/catalog/:slug` 308 redirects to `/collection/:slug` only when `COLLECTION_REDIRECTS_ENABLED=true`, and never for `create` | [proxy.ts:27](../../../proxy.ts#L27) to 36 | The target `/collection/:slug` is not a public route today (public collections live at `/[slug]`). Unverified whether the flag is set in Amplify; if the flag is off, the branch is dead. Also carries an inline comment at line 30. |
| Signed-in visitors are redirected away from `/login` and `/invite/[token]` | [login/page.tsx:23](../../../app/login/page.tsx#L23), [invite/[token]/page.tsx:49](../../../app/invite/%5Btoken%5D/page.tsx#L49) | Fine. |
| `proxy.ts` gates `/admin`, `/admin/*`, `/collection/manage*`, `/comments*`, `/metadata*`, `/all-images*` on cookie presence outside local, redirecting to `/login` | [proxy.ts:43](../../../proxy.ts#L43) to 69 | Fine; the real gate is `requireAdmin()` and the backend. |

## 6. Working tree

### What it is doing

12 modified files, +195 / -89, plus one new test file and the `docs/reviews/` directory. One coherent piece of work with two threads:

1. Home mobile row budget. New `LAYOUT.homeMobileChunkSize = 2` at [constants/index.ts:28](../../../app/constants/index.ts#L28). A `mobileChunkSize` prop threaded from [CollectionPageWrapper.tsx:95](../../../app/components/ContentCollection/CollectionPageWrapper.tsx#L95) through `CollectionPage` to [CollectionPageClient.tsx:225](../../../app/components/ContentCollection/CollectionPageClient.tsx#L225) (`mobileChunkSize ?? toMobileDensity(density)`). When pinned on mobile, the density control is withheld (lines 588, 602). The new [CollectionPageClient.mobileBudget.test.tsx](../../../tests/components/ContentCollection/CollectionPageClient.mobileBudget.test.tsx) covers the forwarding.
2. Synthetic tile ordering by `orderIndex` instead of array splice. `buildMeContentBlock` is now `orderIndex: -2` and `buildAllCollectionsContentBlock` `-1` (both were `1`). [CollectionPageWrapper.tsx:84](../../../app/components/ContentCollection/CollectionPageWrapper.tsx#L84) to 94 prepends them instead of splicing after the first backend child. Tests assert index 0 and 1 and add a sort case per builder.

Alongside, every inline comment in the six source files was removed and folded into docblocks. The `CollectionPageWrapper` docblock grew to 20 lines (33 to 53) and now carries the error-classification reasoning that used to sit inline.

### Is it coherent

Yes. `tsc` clean, `eslint` 0 errors, 269 suites green on this tree. Two conditions it carries forward, not defects in the diff:

- The All Collections tile is still dropped on the public path (section 4). The diff's own test docblock says so. If the expectation is that the tile shows, the diff does not get there.
- `getUserPage()` is still fetched for every signed-in home render even when the Me tile will be dropped for lack of a cover.

One style point for whoever lands it: the `CollectionPageWrapper` docblock's `instanceof` vs duck-typing paragraph (lines 49 to 53) is a history note, which the owner's docblock rule says belongs in the PR description, not the file.

### What to do with it

Commit as is, as one PR, with the All Collections decision (section 4 open question) either folded in as a follow-up commit or left to its own PR. Trim the docblock history paragraph before committing. Do not split the two threads; both touch the same three collection files and the tests cover them together. Clean-up from the review itself: `.next-review/` is still at the repo root (`rm -rf .next-review`); `tsconfig.json` is clean again.

## 7. Priority list

| # | Item | Section | Size | Files |
| --- | --- | --- | --- | --- |
| 1 | EC2: set `WEBAUTHN_RP_ID`, `WEBAUTHN_RP_NAME`, `WEBAUTHN_ALLOWED_ORIGINS`, confirm `SPRING_PROFILES_ACTIVE=prod`, redeploy, read the boot log, curl for `rpId` | [1](#1-face--touch-id) | S, owner only | `~/portfolio-backend/.env` on the box |
| 2 | Record whether the old container was pre-guard or non-`prod`; if non-`prod`, treat as its own incident | [1](#1-face--touch-id) | S | box logs |
| 3 | Bump `next` to `^16.3.8`; add `npm audit --audit-level=high` to CI | [2](#2-security) | S | `package.json`, `.github/workflows/` |
| 4 | Fix mobile `sizes` | [3](#3-speed) | S | `CollectionContentRenderer.tsx:701`, `nanSizes.test.tsx` |
| 5 | `/api/revalidate` requires `isAdmin` | [2](#2-security) | S | `app/api/revalidate/route.ts`, its test |
| 6 | Phone test on apex after item 1; check `passkeyCount` and delete a stale credential if present | [1](#1-face--touch-id) | S, manual | none |
| 7 | Allow `https://www.zacedens.com` or redirect www to apex | [1](#1-face--touch-id), [5](#5-navigation-logic) | S | `originAllowlist.ts:58`, `route.test.ts`, or DNS/Amplify |
| 8 | Commit the working tree; trim the docblock history paragraph; remove `.next-review/` | [6](#6-working-tree) | S | the 13 files listed |
| 9 | Server fetches call `API_URL` directly (also fixes `clearCacheAction`) | [3](#3-speed), [2](#2-security) | S | `core.ts:81-89`, `tests/api/*` |
| 10 | Pass `me` to `SiteHeader`; drop the client `/auth/me` on load | [3](#3-speed) | S | `CollectionPage.tsx`, `SiteHeader.tsx`, `MenuDropdown.tsx`, `useFetchMe.ts` |
| 11 | `remotePatterns` localhost dev-only; `Permissions-Policy` header; config tests | [2](#2-security) | S | `next.config.js`, `tests/config/` |
| 12 | Decide the All Collections tile and stop the wasted `getUserPage()` fetch | [4](#4-simplify-and-reuse) | S | `contentLayout.ts:282`, `CollectionPageWrapper.tsx:84-94` |
| 13 | Point the local backend at a local Postgres before any passkey e2e; document in `playwright.config.ts` | [1](#1-face--touch-id) | S | backend compose env, `playwright.config.ts` |
| 14 | Production Lighthouse baseline | [3](#3-speed) | S | docs |
| 15 | Join signed-in reads to the first `Promise.all` | [3](#3-speed) | S | `CollectionPageWrapper.tsx:65-110` |
| 16 | Dead code: 10 exports, 3 SCSS classes, `postRevalidate` helper, `MessagesPanel` sort, 7 `React.*` type imports | [4](#4-simplify-and-reuse) | S | listed in section 4 |
| 17 | Backend: dev profile binds loopback; mask tokens in `InternalSecretFilter` log; fix the `CLAUDE.md` 401 sentence | [2](#2-security) | S | backend `application-dev.properties`, `InternalSecretFilter.java`, `CLAUDE.md` |
| 18 | Check Amplify appends the client IP to `x-forwarded-for` | [2](#2-security) | S, manual | none |
| 19 | `PanelBody` for the admin panels | [4](#4-simplify-and-reuse) | M | four panels, `ListPanel/`, `useCachedPanelData.ts` |
| 20 | `useFilteredImagePage` for Location and Search, with a Location test first | [4](#4-simplify-and-reuse) | M | both clients, `app/hooks/` |
| 21 | `ssrViewport` as one object | [4](#4-simplify-and-reuse) | S to M | collection stack |
| 22 | Inline-comment burn-down in the seven worst `app/` files | [4](#4-simplify-and-reuse) | M | listed in section 4 |
| 23 | `MenuDropdown` on `Modal` or `useDialogFocus` | [4](#4-simplify-and-reuse) | M | `MenuDropdown.tsx`, `Modal.tsx` |
| 24 | Decide the `CollectionPage` array branch | [4](#4-simplify-and-reuse) | S | `CollectionPage.tsx:141-169` and its tests |
| 25 | PF16 `/search` corpus; backend profile of `GET /collections/{slug}` | [3](#3-speed) | M | `SearchResults.tsx`, backend `CollectionService` |
| 26 | PF13 Cache Components, after 4, 9, 10 and 14 | [3](#3-speed) | L | per the spike doc |
| 27 | F4: fold `TaxonomyPage` into `LocationPage` | [4](#4-simplify-and-reuse) | L | `TaxonomyPage/`, `LocationPage/`, `app/tag/` |

## Appendix

### Verification notes

Measured or run on 2026-10-17:

- `curl -X POST https://zacedens.com/api/proxy/api/auth/webauthn/login/start` with `Origin: https://zacedens.com` returned `"rpId":"localhost"`, `userVerification: preferred`, and a `Secure; HttpOnly; SameSite=Strict` attempt cookie. The same POST against `https://www.zacedens.com` with `Origin: https://www.zacedens.com` returned HTTP 403. Each probe used a throwaway email and cost one tick on the `webauthn:nobody-probe@example.invalid` limiter bucket.
- Chromium's `SecurityError` text for an rpId mismatch was reproduced on `http://localhost:3001` by calling `get()` with `rpId: 'zacedens.com'`.
- A Playwright probe with a CTAP2 virtual authenticator exercised `/login` on 3001 through `get()` and the error-copy mapping. Full enrollment plus sign-in (`tests/e2e/passkey.spec.ts`) was not run, because the bootstrap credentials are not in any repo file and local 5432 is a tunnel to the production database.
- `npx tsc --noEmit` exit 0; `npx eslint .` 0 errors, 2267 warnings; `npx jest` 269 suites, 4993 tests, all pass, 12.4 to 13.3 s, three runs. All on the working tree.
- `npm audit --omit=dev`: 1 critical, 4 high, all in `next`, `sharp`, `source-map-js`.
- BFF probes on `localhost:3001`: five actuator traversal shapes, all 404; `POST /api/revalidate` with no Origin, 403; `/_next/image?url=http://localhost:8080/...`, 400. Anonymous `GET /api/admin/users` on `:8080` and through `:3001`, both 200 under the dev profile.
- Production headers via `curl -I`: HTML `no-store` and `x-cache: Miss`; static chunks 1 year immutable; optimized images `x-amplify-optimized: true`, `max-age=31536000`, `Hit from cloudfront` with `age: 309` on the second request; one font preload `link` header. Amplify's optimizer accepted `q=75` (47,118 bytes) against `q=65` (41,434).
- Per-candidate image bytes from the Amplify optimizer for one sample image at each `w` in `deviceSizes` and `imageSizes`.
- Dev-server network log at 393×852, DPR 2: every grid tile on `/hidden-lake` requested `w=828`.
- Server HTML for `/hidden-lake` and `/` fetched from `localhost:3001` with an iPhone UA and a desktop UA; tile widths read from the `sizes` attributes.
- Local backend timings on `:8080`, warm, dev profile: collection reads 0.49 to 0.72 s, `all-collections` 0.29 to 0.33 s, `/auth/me` anonymous 5 to 16 ms.
- Turbopack production build into `.next-review`; chunk sizes from `build-manifest.json`, gzip level 6 computed locally.
- Duplication by reading and diffing each suspect pair; dead code by grep over named exports and SCSS classes; complexity by line counts and single-line signature scans. `madge`, `ts-prune`, `knip` and `jscpd` are not installed, so semantic duplicates are not covered.

### Unverified

- Which of the two EC2 cases holds (image older than `f0c6d85e`, or `SPRING_PROFILES_ACTIVE` not `prod`). One grep on the box answers it.
- Whether a `localhost`-scoped `webauthn_credential` row exists for the admin (`passkeyCount` in production).
- Whether the local backend container's `SPRING_DATASOURCE_URL` points at the tunnel on 5432 (the Docker socket was not readable from here). Inferred from `docker-compose.yml:17` and the `ssh` listener.
- The iOS user-gesture hypothesis; re-test on iOS after the rpId fix.
- Production behaviour of `/_next/image?url=http://localhost...`; the local 400 may be a port-match rejection.
- Whether the backend ever runs inside Docker with a port mapping, which changes the loopback-bind fix.
- Whether Amplify appends the client IP as the last `x-forwarded-for` hop.
- `clearCacheAction`'s 403 in production; deterministic from the code, not observed.
- First-viewport byte totals on `/hidden-lake` (1.4 MB to 0.36 MB) are computed from measured per-candidate bytes and the server HTML, not from a browser trace.
- Expected TTFB gain from removing the proxy hop (100 to 300 ms).
- Whether Amplify persists Next's fetch Data Cache or a `use cache` store across Lambda instances.
- Whether Amplify reads `images.qualities` at all.
- Production Spring timings; only local dev timings were taken.
- Gzip sizes for the CSS chunk and the admin edit chunk; whether the lazy viewer chunk is preloaded anyway.
- Whether the All Collections tile has ever rendered for a public viewer.
- Whether a caller for the `CollectionPage` array branch is planned.
- Whether `COLLECTION_REDIRECTS_ENABLED` is set in Amplify.
- Per-suite `act()` warning attribution; feature flags and constants beyond the export scan.
