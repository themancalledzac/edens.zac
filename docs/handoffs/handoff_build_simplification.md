# Handoff: Build & Initial-Fetch Simplification

**Date**: 2026-05-01
**Status**: Diagnosis complete, surgical fixes applied + verified locally; architectural simplification proposed below for follow-up
**Branch**: `0131-client-page-update-04` (uncommitted changes pending)

---

## TL;DR

We spent ~5 deploys chasing two bugs that turned out to share a single root failure mode: **build-time and first-render code paths in this app fetch from the deployed BFF/backend, which is brittle on AWS Amplify and accidentally introduced regressions in PRs #129 + #131.** The immediate fix is small and mostly a *revert* of the wrong-trade-off perf optimization in PR #129. The bigger question — surfaced by the user mid-session — is whether the app's "fetch shared metadata at the top of the server render" architecture is worth keeping at all, given that it's a fundamentally **per-request** site (small audience, dynamic admin-mutated data) where ISR's caching benefits are marginal and the build-time fragility cost is high. **Recommendation: lean into per-request rendering everywhere, lazy-load shared metadata on the client.**

---

## What We Found, In Order

### Bug 1 — Local `/2025-christmas` stuck at the password gate

**Symptom:** entering the correct password unlocked nothing; user perpetually stayed at the gate.

**Cause:** `CollectionControllerProd.validateClientGalleryAccess` in `edens.zac.backend` set the access cookie with `.secure(true)` hard-coded. Browsers silently drop `Secure` cookies on non-HTTPS origins, so on `http://localhost:3000` the cookie never persisted, the next RSC re-fetch arrived without it, the backend stripped `content` + `coverImage`, and the wrapper routed back to `<ClientGalleryGate>`.

**Fix (already merged on backend `0082-film-upload-fix`):**

- `application.properties`: new `app.gallery-access.cookie-secure=${GALLERY_COOKIE_SECURE:true}` property
- `application-dev.properties`: new file overriding to `false` for the `dev` profile
- `CollectionControllerProd.java`: `@Value`-injected boolean replacing `secure(true)`
- `CollectionControllerProdTest.java`: `ReflectionTestUtils.setField` in `@BeforeEach`; new dev-profile cookie test

Backend tests: 549/549 pass. Lint clean (Spotless + Checkstyle).

### Bug 2 — Production password POST returned an obfuscated 500

**False trails (corrected mid-session):**
- I initially diagnosed Vercel BotID. Wrong — the user is on AWS Amplify.
- Then I diagnosed Brave Shields based on the XOR-decoded payload (`procedural_actions`, `selectors`, `hide_selectors` matched Brave's `adblock-rust` engine output exactly). Also wrong — the user reproduced the same 500 in Firefox and Safari. Brave's lookups were *reactive* DOM queries that fired *after* the gate-error class was rendered, not the cause.

**Actual cause:** commit `2c37026` ("0127-contact-page-02") changed the BFF proxy at [app/api/proxy/[...path]/route.ts:132](../../app/api/proxy/[...path]/route.ts) from `body: req.body` (ReadableStream) to `body: await req.arrayBuffer()`. Local Next.js dev accepts a raw `ArrayBuffer` body fine; **AWS Amplify's SSR Lambda runtime ships an undici build that throws synchronously on bare ArrayBuffer bodies**, returning the BFF's catch-all `502 {"error":"Bad gateway"}`. Every write through the proxy was 502'ing in prod since 2026-04-27 — including the contact form, which had been silently broken too.

**Fix (frontend `0130-client-page-update-03`, merged in PR #133):**

```ts
const body = ['GET', 'HEAD'].includes(method)
  ? undefined
  : new Uint8Array(await req.arrayBuffer());
```

`Uint8Array` is what undici handles uniformly across Node 20+ runtimes — local dev, Vercel, Amplify Lambda.

### Bug 3 — Four straight Amplify deploys failed (`next build` crashing)

**Cause chain — two stacked regressions:**

1. **PR #129 / `e4f77fe` "perf: add generateStaticParams to tag, people, and location slug pages — wire ISR correctly"** added `generateStaticParams` + `revalidate=3600` to `app/{tag,people,location}/[slug]/page.tsx`, and `8503fb8` switched `app/metadata/page.tsx` from `force-dynamic` to `revalidate=3600`. This made the build prerender every tag/person/location/metadata page *as part of `next build`*, which requires the build container to fetch from the not-yet-deployed BFF/backend during the build itself. On Amplify, this is unreliable — chicken-and-egg with the deploy, and any transient backend hiccup or relative-URL crash fails the entire build. **The build container has been failing to fetch since this merged on 2026-04-27.**

2. **PR #131 / `afc0666` "feat(gallery): forward browser cookies on server-side collection fetch"** (my own commit from this session's first half) added `getServerCookieHeader()` to `app/lib/api/core.ts` and wired it into `fetchReadApi`. This pulled `cookies()` from `next/headers` into the hot fetch path. **Calling `cookies()` outside a request scope throws `DynamicServerError` (digest `'DYNAMIC_SERVER_USAGE'`), which Next.js detects at the call site *before* any try/catch sees it.** For routes that also declare `generateStaticParams`, the digest fails the build with "couldn't be rendered statically because it used `cookies`" — even when the catch swallows the thrown error gracefully. This was a regression I introduced; the catch I wrote *looked* safe in code review but didn't actually prevent the build failure because Next.js's static-vs-dynamic detection is independent of my catch. **I did not run `next build` locally before pushing `afc0666`** — `tsc`, `eslint`, and `jest` all pass on it, but the prod build is the only verification that exercises the prerender path. Lesson saved to memory.

**Fixes applied across two PRs:**

| PR | Files | Change |
|---|---|---|
| #133 (merged) | `app/{tag,people,location}/[slug]/page.tsx` | Wrap `generateStaticParams` in `try/catch`, return `[]` on failure (let Next.js render dynamically on demand) |
| #133 (merged) | `app/metadata/page.tsx` | Wrap `getMetadata()` in `try/catch`, render fallback on failure |
| #134 (merged) | `app/lib/api/core.ts` `getServerCookieHeader` | Skip entirely when `process.env.NEXT_PHASE === 'phase-production-build'`; expand catch regex to include `'rendered statically'` and `'dynamic server usage'`; add digest-based check for `DYNAMIC_SERVER_USAGE` |

Build then succeeded on PR #134's deploy.

### Bug 4 — Build succeeds, but prod returns 500 on `/2025-christmas`, `/portfolio`, `/tag/film`, every non-existent slug

**Discovered after PR #134's deploy went green:** all routes that *don't* end up rendering a populated `<CollectionPage>` returned plain-text `Internal Server Error` from CloudFront. `notFound()` was failing — pages that should have rendered the 404 page rendered a 500 instead.

**Cause:** the wrapper at `app/lib/components/CollectionPageWrapper.tsx` used `if (error instanceof ApiError)` to detect 404s and route to `notFound()`. **In production builds, code-splitting can produce two copies of the `ApiError` class in different chunks; an instance from one chunk fails `instanceof` against the class in another.** The 404 ApiError thrown inside `getCollectionBySlug` (chunk A) was caught in the wrapper (chunk B) where `instanceof ApiError` returned `false` — so the `if (error.status === 404) notFound()` branch silently missed, fell through to the catch-all `throw error`, and the Lambda returned a raw 500. This explains why `/2025-christmas` (CLIENT_GALLERY → triggers `<ClientGalleryGate>` route which never went through this wrong branch... actually no, it threw for a different reason — see below) and `/portfolio` (404 backend → `notFound()` flow) both 500'd.

Local `next dev` doesn't reproduce this because turbopack-dev doesn't split chunks the same way as production build.

**Fix (in this session, not yet committed):**

- `app/lib/components/CollectionPageWrapper.tsx`: replace `instanceof ApiError` with a duck-typed `error.status` numeric read. Also re-throw any error whose `digest` starts with `NEXT_` or equals `DYNAMIC_SERVER_USAGE`, so framework-internal sentinels (notFound, redirect) bubble correctly.
- `app/{tag,people,location}/[slug]/page.tsx` and `app/metadata/page.tsx`: switch from `revalidate=3600` + `generateStaticParams` to `export const dynamic = 'force-dynamic'`, and **remove `generateStaticParams` entirely**. Pre-PR-#129 state — these pages were dynamic by default. The "perf" optimization was the wrong trade-off (see "Architectural Thesis" below).

Local prod build (`npm run build`) verified by user: 5-second build, all four pages now `ƒ Dynamic`, `/[slug]` still SSG with collection slugs (which works fine because `getAllCollections()` already had a graceful fallback).

---

## How Much of This Was a Revert

The user observed mid-session that "MOST of these changes should be reverting these files back to how they were BEFORE these changes were made, no?" — and was correct. Mapping:

| File | Pre-PR-#129 state | After my fix | Net diff |
|---|---|---|---|
| `app/tag/[slug]/page.tsx` | Implicitly dynamic, no `generateStaticParams` | Explicit `force-dynamic`, no `generateStaticParams` | **Functional revert** of `e4f77fe` and `f537487` |
| `app/people/[slug]/page.tsx` | Same | Same | **Functional revert** |
| `app/location/[slug]/page.tsx` | Same | Same | **Functional revert** |
| `app/metadata/page.tsx` | `export const dynamic = 'force-dynamic'` | `export const dynamic = 'force-dynamic'` | **Exact revert** of `8503fb8` |
| `app/lib/components/CollectionPageWrapper.tsx` | `error instanceof ApiError` | `typeof error.status === 'number'` duck-typing | **Genuinely new** — fixes the bundle-splitting bug, not a revert |
| `app/lib/api/core.ts` `getServerCookieHeader` | Function did not exist | Function exists with NEXT_PHASE skip + digest check | **Cannot revert** — PR #131 added it for a real bug (cookie forwarding for the gate); the cookies() call is needed at runtime, just not at build phase |
| `app/api/proxy/[...path]/route.ts` body forwarding | `req.body` (ReadableStream) | `new Uint8Array(await req.arrayBuffer())` | **Genuinely new** — fixes Amplify undici bug; `req.body` was also broken because it required `duplex: 'half'` which wasn't set |

So 4 of 7 changes are reverts of `e4f77fe` / `f537487` / `8503fb8`. The other 3 are real bug fixes for issues that PR #131 introduced (`afc0666`) or that were latent (the body forwarding & instanceof bugs).

---

## Architectural Thesis: Why This Site Should Lean Per-Request

This came up directly when the user said:

> "the tags/people/metadata is small enough data that we could have that as an initial backend request on the initial page request. After we have loaded the first page (basically lazy load future api requests for data that will be used elsewhere), but it Needn't be Initial."

That's the right frame. Worked through:

### The shape of this app

- **Audience:** small (single photographer's portfolio + occasional client galleries). No traffic spike that justifies aggressive ISR caching.
- **Data lifecycle:** admin-mutated. Tags get added/renamed, collections come and go, password protection toggles per-collection. Hourly ISR staleness windows actively hurt the admin UX (set a password → wait an hour to see it take effect on a public page).
- **Deployment:** AWS Amplify SSR Lambda + CloudFront in front of EC2 backend. Build container is *not* the same network as the runtime — fetches from build to backend cross unreliable boundaries.

### What ISR/SSG bought us, and what it cost

| Page | What ISR/SSG gives | What it costs |
|---|---|---|
| `/` (home `[slug]`) — currently SSG | First byte ~50ms instead of ~200ms for cached collections | Build-time fetch dependency (currently graceful via `getAllCollections` try/catch); collection list staleness up to 1y/1h |
| `/tag/[slug]` — was ISR, now Dynamic | First byte for popular tags would have been faster | Build fragility (the four-deploy disaster); tag list staleness; complete build fail on any one page render error |
| `/people/[slug]` — was ISR, now Dynamic | Same | Same |
| `/location/[slug]` — was ISR, now Dynamic | Same | Same |
| `/metadata` — was ISR (briefly), now Dynamic | None — admin-only page | Build-time fetch dependency on admin endpoint (which is fundamentally per-session) |

The cost/benefit tilts hard toward "render dynamically" for everything except the home page — and even there it's a close call.

### Recommendation (the simplification thesis)

**Goal: zero backend fetches during `next build`. Every page renders per-request.**

#### Step 1 — Already done in this branch

- Tag, people, location, metadata pages: `force-dynamic`, no `generateStaticParams`. ✅

#### Step 2 — Consider for follow-up

- **Make `app/[slug]/page.tsx` dynamic too.** Currently still SSG-prerendering visible non-CLIENT_GALLERY collection slugs at build. The `getAllCollections()` graceful fallback prevents *build crashes*, but it can silently produce a build with no static pages if the backend is unreachable — which is its own brittleness. Trade: collection pages render ~150ms slower on first byte vs. SSG. Probably worth it for build determinism.
  - If keeping SSG, at least add `dynamicParams = true` (default) and verify graceful behavior when the backend is briefly down mid-build.

- **Lazy-load shared metadata on the client.** Today, anything that needs the global `tags / people / locations` lists during initial page load fetches them server-side at render time. Per the user's framing: load the first page synchronously, then fetch this metadata on the client *after* hydration, populate menus / autocomplete / filter chips when ready. Concretely:
  - Audit where `getAllTags()` / `getAllPeople()` / `getAllLocations()` are called at the top of a server component (most likely SiteHeader / MenuDropdown / search). Those become async client fetches on mount.
  - The `metadata` page itself is already client-component-driven (`MetadataPageClient`), so this generalizes naturally.
  - Cache the responses in browser storage (sessionStorage or a TanStack Query / SWR cache) so repeated nav doesn't refetch.
  - Skeleton states in menus while metadata loads — visually fine for the audience, no SEO impact (search bots will see the page content; menus are nav not content).

- **Consider whether `getServerCookieHeader` is still needed at all.** PR #131's `afc0666` added it specifically to forward `gallery_access_<slug>` cookies on RSC re-fetches after `router.refresh()` in the gate flow. After today's wrapper changes (and considering CLIENT_GALLERY pages aren't pre-rendered), it might be possible to flip the gate to use a client-side fetch instead of relying on RSC re-fetch — which would eliminate the need to forward cookies server-side at all. **Open question — needs design pass.** If you do this, you can also delete the `NEXT_PHASE` skip and the digest-detection logic.

#### Step 3 — Architectural invariant going forward

Add to `CLAUDE.md` (or wherever the rules live): **Any change to `app/lib/api/core.ts`, `getServerCookieHeader`, `generateStaticParams`, `generateMetadata`, or `revalidate` must be verified by running `npm run build` locally before commit.** `tsc + eslint + jest` are insufficient — the prod build path is the only one that exercises prerender behavior, and that's where `cookies()`-during-build, fetch-during-build, and `instanceof`-across-chunks bugs all manifest.

---

## Open Questions / Risks

1. **Is the home page `app/[slug]/page.tsx` next to fall over?** It's still doing `generateStaticParams` + page prerender. Today's local prod build succeeded (per the user's terminal output: `● /[slug] /porto-film, /lisbon-film, /2026-seahawks-parade, ...`), so it's working *for now* — but it carries the same risk profile as the four pages we just reverted. If a future build hits a transient backend error mid-prerender, the entire build fails. Should this also become `force-dynamic`? Pure judgement call on the perf tradeoff.

2. **CLIENT_GALLERY runtime SSR.** With my wrapper duck-typing fix, `<ClientGalleryGate>` should now render correctly on prod. **This needs to be verified end-to-end after deploy** — neither I nor the user have observed a successful gate render in prod yet. Test plan after this branch deploys: `curl https://zacedens.com/2025-christmas` should return 200 with the gate HTML, and a POST to `/api/proxy/api/read/collections/2025-christmas/access` with the correct password should return `{hasAccess: true}` + `Set-Cookie: gallery_access_2025-christmas=...`.

3. **Brave Shields reactive lookups.** Even after the fix, Brave users will still see the obfuscated `procedural_actions`-style network requests in DevTools because Brave's adblock-rust engine queries on every DOM change containing certain class patterns. Those are harmless — Brave fires them on success too, they just become invisible because no error class appears. No action needed; documenting only so the next person looking at network logs doesn't go down the same rabbit hole I did.

4. **Amplify SSM secrets warning at build line 21** (`Failed to set up process.env.secrets`). Still unexplained. Builds succeed despite it, so the env vars must be configured as plain Amplify env vars (not Secrets / SSM-backed). Worth investigating in the Amplify console at some point — a misconfigured Secrets section could mask future missing env vars silently. Not blocking.

5. **`next build` slowness in my agent shell.** I ran into pipe-buffering issues running maven and `next build` from this Claude Code session — the user ran the same builds in 5 seconds in their own terminal. Sandbox / tooling artifact, not a real build problem. Documenting only so we know to skip the agent-shell build verification step in future sessions and lean on the user running it directly.

---

## Files Changed This Session (cumulative)

### Backend (`/Users/themancalledzac/Code/edens.zac.backend`, branch `0082-film-upload-fix`)
- `src/main/resources/application.properties` — new `app.gallery-access.cookie-secure` property
- `src/main/resources/application-dev.properties` — new file, dev override
- `src/main/java/.../CollectionControllerProd.java` — `@Value`-injected boolean
- `src/test/java/.../CollectionControllerProdTest.java` — `ReflectionTestUtils.setField` + new dev-profile test
- 549/549 tests pass; Spotless + Checkstyle clean

### Frontend (`/Users/themancalledzac/Code/edens.zac`, branch `0131-client-page-update-04` — uncommitted as of this writing)
- `app/api/proxy/[...path]/route.ts` — wrap body in `Uint8Array` (already on main as PR #133)
- `app/lib/api/core.ts` `getServerCookieHeader` — `NEXT_PHASE` skip + expanded regex + digest check (already on main as PR #134)
- `app/tag/[slug]/page.tsx` — drop `generateStaticParams` + `revalidate`, add `force-dynamic`
- `app/people/[slug]/page.tsx` — same
- `app/location/[slug]/page.tsx` — same
- `app/metadata/page.tsx` — add `force-dynamic`
- `app/lib/components/CollectionPageWrapper.tsx` — replace `instanceof ApiError` with duck-typed `error.status`; re-throw NEXT_* digest sentinels
- 1304/1304 tests pass; lint + tsc clean; local `npm run build` succeeds (verified by user)

### Pending follow-up (recommendations from this handoff)
- Audit `getAllTags / getAllPeople / getAllLocations` server-side call sites and convert to lazy client fetches
- Consider making `app/[slug]/page.tsx` dynamic too (deletes the last build-time backend dependency)
- Consider redesigning the gate's cookie flow to remove `getServerCookieHeader` entirely
- Add the `npm run build`-before-commit invariant to `CLAUDE.md`

---

## Lessons (for the agent's memory)

1. `tsc + eslint + jest` is insufficient verification for changes to `app/lib/api/core.ts`, page-level `generateStaticParams` / `generateMetadata` / `revalidate`, or anywhere that touches `cookies()` / `headers()`. The prod build is the only check that exercises Next.js's prerender semantics. Cost: 5 seconds. Run it.

2. When debugging an obfuscated network request, **resist the temptation to identify the third-party tool from the response shape**. The `procedural_actions / selectors / hide_selectors` JSON looked like Brave/DataDome/HUMAN/PerimeterX, and I burned ~20 minutes building that hypothesis when a single `curl` against the real endpoint would have shown a 502 from the BFF and pointed at the right layer immediately. **Always probe your own stack first; treat exotic identifications with suspicion until ruled in.**

3. "ISR is faster than SSR" is a microbenchmark. **For a small-traffic admin-mutated site, SSR is fine and ISR's hidden costs (build fragility, staleness windows, cache invalidation complexity) outweigh the perf benefit.** Default to dynamic; reach for ISR only when you have evidence a specific page is a bottleneck.

4. `instanceof` across module/chunk boundaries is unreliable in production bundles. For library-level error classes (`ApiError`, custom `Error` subclasses), prefer **duck-typing on a discriminator field** (`error.status`, `error.code`, `error.name === 'ApiError'`) over `instanceof`.
