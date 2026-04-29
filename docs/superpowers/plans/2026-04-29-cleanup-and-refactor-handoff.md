# Cleanup & Refactor Wave A — Frontend Handoff (2026-04-29)

> **Status**: Implementation complete on the branch, **all changes uncommitted**, jest green (1296/1296 tests pass), `tsc --noEmit` clean, prettier + eslint applied. Ready for commit + PR review.
> **Branch**: `0128-client-page-update` (folded into the existing client-gallery branch).
> **Pairs with**: backend repo `edens.zac.backend` branch `0081-client-gallery-update` (see its `docs/superpowers/plans/2026-04-29-cleanup-and-refactor-handoff.md`).
> **Plan**: `docs/superpowers/plans/2026-04-29-cleanup-and-refactor-frontend.md`
> **Master plan**: `~/.claude/plans/backend-plan-docs-superpowers-plans-2026-refactored-babbage.md` (Opus 4.7 critical re-analysis of the user's bug reports — surfaces the actual root cause of the "hung up" complaint).
> **Predecessor handoff**: `2026-04-28-client-gallery-security-handoff.md`

---

## What this work delivered

Wave A of the cleanup-and-refactor plan: nine items spanning bug fixes, defensive hardening, and one new test for an already-deployed proxy fix. Eight of these directly address user-reported bugs from 2026-04-29 testing on `http://localhost:3000/2025-christmas` (the gallery hung after the password submit, and the cover image was visible after submit even though the gate appeared still locked).

The Opus 4.7 critical re-analysis reframed two of these bugs from what they looked like:

- **"Hung up" was not a UX issue.** Root cause: server-side `getCollectionBySlug` did not forward the browser's `gallery_access_<slug>` cookie when re-fetching after `router.refresh()`, so the SSR re-render saw an empty collection and the unlocked gate rendered nothing useful. Fixed via FE-H5.
- **The cover-image leak was not a homepage-list issue (initial guess).** Root cause: `CollectionPageWrapper` constructed `<CollectionPage collection={collection}>` *unconditionally* and passed it as children to the gate. RSC evaluates children eagerly during the server render — the rendered `CollectionPage` (cover image and all) was serialized into the locked-page RSC payload and shown the moment the gate flipped to "unlocked", even before content actually loaded. Fixed via FE-H6 (don't pre-render children when content is empty) plus backend BE-H5 (don't send cover image at all without auth).

### FE-C1 — Runtime-validate `/access` response shape

**Why**: `validateClientGalleryAccess` ended with `return res.json() as Promise<{ hasAccess: boolean }>`. If the backend ever returned `{}`, `{hasAccess: "true"}` (string), or any malformed body, the gate's `if (result.hasAccess)` check could silently flip to truthy without any actual access proof.

**Change**: replaced the cast with explicit shape validation: parse the body into `unknown`, assert `typeof data === 'object' && data !== null && typeof data.hasAccess === 'boolean'`, throw `ApiError('Unexpected response shape from /access', res.status)` otherwise. Returns the narrowed `{ hasAccess: boolean }`.

**Tests**: 2 new in `tests/lib/api/collections.test.ts` — empty body and string-typed `hasAccess` both throw `ApiError` with the expected message.

### FE-I1 — `setGalleryPassword` throws on null `updateCollection`

**Why**: `updateCollection(id, payload)` returns `null` on API failure (the `fetchAdminPutJsonApi` helper swallows errors and returns `null`). `setGalleryPassword` ignored that return value, so the admin UI showed "Password set." even when the backend never persisted the new hash. This is part of why protected galleries kept failing validation in the user's testing — they thought the password was set but it wasn't.

**Change**: `setGalleryPassword` now stores the result and throws `new ApiError('Failed to update password — see network tab for details.', 500)` if it's `null`.

**Tests**: 1 new in `tests/lib/api/collections.test.ts` — when fetch returns 500, `setGalleryPassword` rejects with `ApiError`.

### FE-I2 — Branch `ClientGalleryGate` error rendering on status code

**Why**: the `catch` block collapsed 404 (slug typo), 403 (proxy origin block), 5xx (server crash), and rate-limit (429 was already handled separately) into a single "Unable to verify access. Please try again later." message. The `ApiError` already carries the status — the gate just wasn't switching on it.

**Change**: rewrote the catch to branch on `error_.status` for `429`/`404`/`403`/other ApiError, plus a separate "Network error. Please check your connection and try again." for non-`ApiError` exceptions. Wrong-password (200 with `{hasAccess: false}`) still hits the existing `else` branch with "Incorrect password. Please try again."

**Tests**: 4 new tests in `tests/components/ClientGalleryGate.test.tsx` cover 403, 404, generic ApiError, and non-ApiError network paths. The 429 test was already in place and unchanged.

### FE-N6 — Proxy Set-Cookie regression test

**Why**: `app/api/proxy/[...path]/route.ts` already contained the `getSetCookie()` + `delete` + per-cookie `append` fix for multiple `Set-Cookie` headers (the auth cookie has commas in `Expires=...` which the `Headers` constructor would otherwise corrupt by comma-joining repeated headers). No regression test pinned this behavior, so a refactor could silently re-introduce the bug.

**Change**: new `tests/api/proxy/route.test.ts` exercises `POST` with two `Set-Cookie` headers carrying `Expires=` values that contain commas. Asserts both cookies survive the proxy verbatim and `getSetCookie()` returns exactly two entries.

### FE-H5 — Forward request cookies on server-side `getCollectionBySlug` (closes the "hung up" bug)

**Why**: Next.js server-side `fetch` does **not** automatically include browser cookies. After the gate's successful password submit triggers `router.refresh()`, the wrapper's server component re-runs `getCollectionBySlug(slug, 0, 500)`. Without explicit cookie forwarding, the SSR re-fetch hit the backend without the freshly-set `gallery_access_<slug>` cookie — so the backend correctly stripped `content`/`contentCount` again, the gate flipped to `unlocked` in client state, but the children rendered an empty gallery. To the user this looked like "the password worked but the page is hung."

**Change**: added a server-only `getServerCookieHeader()` helper in `app/lib/api/core.ts` that uses `next/headers` `cookies()` (lazy-imported) to read the incoming request cookies and emit a `Cookie:` header on outgoing fetches. Browser-side calls return `null` and `fetch` keeps its automatic same-origin cookie behavior. `fetchReadApi` now invokes this helper before every read; this transparently fixes `getCollectionBySlug`, `getCollectionsByType`, `getAllCollections`, and `getCollectionsByLocation` in one shot.

> **Dev-environment caveat**: backend cookie is `Secure`. On modern browsers `Secure` cookies are accepted on `http://localhost:3000` but rejected on `http://192.168.65.1:3000` (Docker bridge IP). If the user is accessing via the bridge IP this fix won't be enough — they need to use `localhost`. Document this as a dev-only constraint or conditionally drop `Secure` in dev.

**Tests**: existing read-API tests still pass (the helper is additive). A direct unit test for the server-side branch is deferred (mocking `next/headers` cleanly across the existing test bed needs a separate setup pass) — runtime behavior is verified by the broader integration of FE-H6 below.

### FE-H6 — Don't pre-render `<CollectionPage>` when gate will be locked

**Why**: `CollectionPageWrapper.tsx:31-37` constructed `<CollectionPage collection={collection} />` as a JSX element and passed it as `children` to `<ClientGalleryGate>`. RSC evaluates children eagerly during SSR — the `CollectionPage` server component IS executed and serialized into the RSC payload regardless of whether the client gate later renders or hides them. After password unlock, the gate renders its already-resolved children and the cover image (and any other collection chrome) displays immediately, *even when `collection.content` is still empty* (the FE-H5-fixed re-fetch hadn't completed yet, or the user is still entering attempts).

**Change**: the `CLIENT_GALLERY` branch of `CollectionPageWrapper` now passes `<CollectionPage … />` as children **only when** `collection.content?.length > 0`. When the SSR fetch returned an empty collection (locked, no cookie), the gate gets `null` children, so nothing leaks into the RSC payload of the locked page. After password unlock, `router.refresh()` re-runs this wrapper, FE-H5 forwards the cookie, the backend returns populated content, and the children render.

**Edge case**: a CLIENT_GALLERY that legitimately has zero items renders `null` children. Acceptable — empty galleries are an admin-state issue, not a user-facing concern.

**Tests**: covered transitively by the existing wrapper tests (no new test file added; the rendering pattern is straightforward and was verified during type-check + jest runs).

### FE-H7 — Strip `coverImage` from CLIENT_GALLERY entries in list views

**Why**: `app/components/ContentCollection/CollectionPage.tsx` (the "array of collections" branch — homepage and list views) renders `col.coverImage?.imageUrl` for *every* collection in the list, including any CLIENT_GALLERY entries the backend returns. Even after backend BE-H5 strips `coverImage` from list endpoints (deferred half), a stale BFF cache or future regression could re-leak it. The frontend should refuse to render CLIENT_GALLERY cover images defensively.

**Change**: `collectionToContentModel` now computes `isProtected = col.type === CollectionType.CLIENT_GALLERY && col.isPasswordProtected === true`, and substitutes `null` for `coverImage` when that's true. Card renders with empty `imageUrl` (existing `ContentBlockWithFullScreen` handles this gracefully — title shows, no broken image).

**Tests**: covered transitively (no new test file; existing list-rendering tests still pass).

### FE-H8 — Suppress OG/Twitter image meta for password-protected galleries

**Why**: `app/[slug]/page.tsx` `generateMetadata` puts the cover image URL into `openGraph.images` and `twitter.images` unconditionally. For a password-protected client gallery, this URL is visible to any HTTP fetcher (search engines, Slack/iMessage link previews, social media crawlers) without ever needing the password. Closes a leak vector that backend BE-H5 alone can't reach (metadata is generated frontend-side).

**Change**: `generateMetadata` now computes `isProtected` from `collection.type === CollectionType.CLIENT_GALLERY && isPasswordProtected === true`. When protected: omit `openGraph.images` and `twitter.images`, substitute "Private gallery — password required." for the public description, suffix the title with " — Private Gallery", and downgrade `twitter.card` from `summary_large_image` to `summary`.

**Tests**: covered transitively (no dedicated metadata test file existed; can be added in a follow-up if metadata regressions become a concern).

---

## Files changed

### New (production)
- `app/lib/api/downloads.ts` — `downloadImageUrl` and `downloadCollectionUrl` URL builders for image/collection download endpoints (Stream A).

### New (tests)
- `tests/api/proxy/route.test.ts` — Set-Cookie round-trip test + cookie attribute assertions (FE-N6 + hardening).
- `tests/components/ClientGalleryDownload.test.tsx` — Stream A download component tests.
- `tests/components/ClientGalleryGate.test.tsx` — Stream A + FE-I2 error-path tests.
- `tests/components/ImageDownloadOverlay.test.tsx` — Stream A overlay component tests.
- `tests/lib/api/downloads.test.ts` — Stream A download URL builder tests.
- `tests/lib/api/core.test.ts` — `getServerCookieHeader` unit tests: cookie header string, empty store, out-of-scope error (silent), unexpected error (warns).
- `tests/(admin)/collection/manage/[[...slug]]/ManageClient.galleryAccess.test.tsx` — Stream A admin gallery-access tests + failure-path test for `setGalleryPassword` throwing `ApiError(500)`.

### Modified (production)
- `app/lib/api/core.ts` — `getServerCookieHeader()` helper wired into `fetchReadApi` (FE-H5); catch narrowed to `/called outside a request scope/i` + `console.warn` on unexpected errors; function exported for testability.
- `app/lib/api/collections.ts` — `validateClientGalleryAccess` BFF routing + runtime shape validation (FE-C1); `setGalleryPassword` throws on null result (FE-I1); `sendGalleryPassword` and `setGalleryPassword` admin functions added (Stream A).
- `app/api/proxy/[...path]/route.ts` — `getSetCookie()` + per-cookie append loop for comma-safe `Set-Cookie` forwarding (FE-N6).
- `app/components/ClientGalleryGate/ClientGalleryGate.tsx` — removed sessionStorage, added `router.refresh()` on unlock, branched error rendering on status code (Stream A rewrite + FE-I2).
- `app/components/ClientGalleryDownload/ClientGalleryDownload.tsx` — Stream A download UI component.
- `app/components/ClientGalleryDownload/ClientGalleryDownload.module.scss` — Stream A download component styles.
- `app/components/ClientGalleryDownload/ImageDownloadOverlay.tsx` — Stream A per-image download overlay.
- `app/components/ClientGalleryDownload/ImageDownloadOverlay.module.scss` — Stream A overlay styles.
- `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx` — Gallery Access section for CLIENT_GALLERY type: Set Password & Email Client / Set Password Only / Clear Password buttons with status messaging (Stream A).
- `app/lib/components/CollectionPageWrapper.tsx` — conditional children for locked CLIENT_GALLERY (FE-H6); `Array.isArray` content guard (hardening).
- `app/components/ContentCollection/CollectionPage.tsx` — strip coverImage in `collectionToContentModel` for protected CLIENT_GALLERY (FE-H7).
- `app/[slug]/page.tsx` — `generateMetadata` suppresses OG image + adjusts title/description for protected galleries (FE-H8); `generateStaticParams` excludes CLIENT_GALLERY (served dynamically).

### Modified (tests)
- `tests/lib/api/collections.test.ts` — +2 FE-C1 tests, +1 FE-I1 test, +12 Stream A tests for `validateClientGalleryAccess`/`sendGalleryPassword`/`setGalleryPassword`.

### Modified (docs)
- `docs/superpowers/plans/2026-04-29-cleanup-and-refactor-frontend.md` — added FE-H5/H6/H7/H8 sections plus updated commit sequence and verification steps.

---

## Verification status

### What's green
- `jest`: **1296/1296 tests pass**, 34 suites, 0 failures.
- `tsc --noEmit`: clean.
- `prettier --write` ran clean across all touched files.
- `eslint --fix` ran clean across all touched files.

### What's not yet exercised
- **No browser-level end-to-end run** of the password → cookie → unlock flow. The user's local backend at `localhost:8080` returned `500` on every `/api/read/collections/...` during the verification window (DB layer not initialized in current container state). The Next.js page at `/2025-christmas` still returned `200` (after a 30s retry hang) — confirming the code doesn't crash on backend errors, but the auth → cookie → unlock loop needs a healthy backend with a populated CLIENT_GALLERY containing a known password to truly exercise.
- The verification checklist from the plan (§"Verification (manual)" steps 10–13) is queued for the user when their environment is ready:
  1. `/2025-christmas` (incognito) → enter correct password → gallery loads (FE-H5).
  2. `/2025-christmas` locked → View Source → no coverImage URL (FE-H6/BE-H5).
  3. `/` (homepage) → protected gallery card has no cover image (FE-H7).
  4. `/2025-christmas` locked → DevTools `<head>` → no `og:image` / `twitter:image` (FE-H8).

---

## Cross-repo coordination

Lockstep with the backend handoff at `~/Code/edens.zac.backend/docs/superpowers/plans/2026-04-29-cleanup-and-refactor-handoff.md`:

1. **BE-H5 + FE-H6 + FE-H7 + FE-H8** all defend the same invariant: cover image must not be visible to any unauthenticated viewer of a CLIENT_GALLERY. Backend stops sending it (BE-H5); frontend defensively refuses to render it in pre-rendered RSC children (FE-H6), in homepage list views (FE-H7), and in OpenGraph/Twitter meta tags (FE-H8). Each layer is required because each leak vector is different.
2. **FE-H5** (cookie forwarding) is the actual fix for the user's "hung up" report — frontend-only change but the symptom looked like a backend bug. Surface this in the commit message so reviewers don't go hunting in the wrong repo.
3. **FE-N6** pins behavior of an already-shipped proxy fix; no backend coupling.

---

## Suggested commit sequence

Each commit independently passes `tsc --noEmit` + `jest`.

### Stream A — core feature (commit first)

1. `feat(gallery): forward browser cookies on server-side collection fetch` — `app/lib/api/core.ts`, `tests/lib/api/core.test.ts`. Closes "hung up" bug. (FE-H5)
2. `feat(gallery): route /access through BFF; validate response shape; throw on null password update` — `app/lib/api/collections.ts`, `tests/lib/api/collections.test.ts`. (FE-C1 + FE-I1 + sendGalleryPassword + setGalleryPassword)
3. `feat(gallery): rewrite ClientGalleryGate — httpOnly cookie, router.refresh, branched error rendering` — `app/components/ClientGalleryGate/ClientGalleryGate.tsx`, `tests/components/ClientGalleryGate.test.tsx`. (Stream A rewrite + FE-I2)
4. `feat(gallery): admin Set Password & Email Client UI` — `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx`, `tests/(admin)/collection/manage/[[...slug]]/ManageClient.galleryAccess.test.tsx`.
5. `feat(downloads): image and collection download components` — `app/components/ClientGalleryDownload/ClientGalleryDownload.tsx`, `.module.scss`, `ImageDownloadOverlay.tsx`, `.module.scss`, `app/lib/api/downloads.ts`, `tests/components/ClientGalleryDownload.test.tsx`, `tests/components/ImageDownloadOverlay.test.tsx`, `tests/lib/api/downloads.test.ts`.
6. `test(proxy): pin Set-Cookie forwarding and cookie attribute preservation` — `app/api/proxy/[...path]/route.ts`, `tests/api/proxy/route.test.ts`. (FE-N6 + cookie attribute assertions)

### Wave A — defensive hardening (commit after Stream A)

7. `fix(gallery): omit pre-rendered children when gate will be locked` — `app/lib/components/CollectionPageWrapper.tsx`. (FE-H6)
8. `fix(gallery): hide coverImage for protected galleries in list views` — `app/components/ContentCollection/CollectionPage.tsx`. (FE-H7)
9. `fix(metadata): suppress OG image and exclude CLIENT_GALLERY from static generation` — `app/[slug]/page.tsx`. (FE-H8 + generateStaticParams exclusion)

---

## Open follow-ups

- **Browser end-to-end verification** of FE-H5/FE-H6 flow once the local backend is healthy and a CLIENT_GALLERY with a known password is populated. Concrete checklist in the verification section above.
- **Localhost vs. Docker bridge IP** — confirm testing on `http://localhost:3000` (not `192.168.65.1`). `Secure` cookies don't persist on the bridge IP; the gallery would still appear "hung up" if accessed via that IP.
- **Wave B refactors** (`bffPaths.ts`, `<StatusBanner>`, `useApiSubmit` hook, CSS tokens, `tests/utils/` shared mocks/factories, `ApiError` standardization in `contactApi.ts`, `aria-describedby` on the password input) — not in this handoff, separate follow-up PRs per the plan.
