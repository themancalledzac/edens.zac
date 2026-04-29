# Client Gallery Security & Downloads — Frontend Handoff (2026-04-28)

> **Status**: Implementation complete on the branch, **all changes uncommitted**, all tests passing. Ready for commit + PR review.
> **Branch**: `0128-client-page-update`
> **Pairs with**: backend repo `edens.zac.backend` branch `0081-client-gallery-update` (see `docs/superpowers/plans/2026-04-28-client-gallery-security-handoff.md` there).
> **Master plan**: `~/.claude/plans/context-is-this-repo-indexed-squirrel.md`
> **Pre-design**: `docs/spikes/guest-auth-spike.md` (538 lines, 2026-03-29)
> **Repo plan**: `docs/superpowers/plans/2026-04-27-client-gallery-security-frontend.md`

---

## What this work delivered

Before this branch, the `ClientGalleryGate` was a UX-only password form. The backend returned an `accessToken` in the JSON body, but the frontend silently dropped it at the type boundary and gated visits via a `sessionStorage` flag. Subsequent collection fetches passed no token. In production this should have 403'd via `InternalSecretFilter` because the gate's `validateClientGalleryAccess` POST went around the BFF proxy — but no CLIENT_GALLERY in production had a `passwordHash` set, because the admin password-update path in the backend was commented out, so the bug never surfaced.

After this branch:

- The gate captures the auth state via an `httpOnly`+`Secure`+`SameSite=Strict` cookie that the **backend** sets on `POST /access`. The frontend never sees the token. Refresh, new tab, all work.
- The `/access` POST goes through the BFF proxy (`/api/proxy/api/read/...`) so it inherits `X-Internal-Secret` injection and the Origin allowlist. Same path the just-shipped contact form uses.
- The BFF proxy now forwards `Set-Cookie` response headers correctly (the original `new Headers()` constructor coalesces duplicate headers into a comma-joined string, which corrupts cookies whose `Expires=` attribute contains commas — fixed via `getSetCookie()` + per-cookie `append`).
- The collection manage page has a "Gallery Access" section for `CLIENT_GALLERY` collections: set + email password, set without email, clear password.
- The download placeholders (`ImageDownloadOverlay`, `ClientGalleryDownload`) are wired to real backend endpoints via simple `window.location.href` navigation. Cookie auth flows automatically.

### High-level architecture

```
Browser (logged-in client)
  POST /api/proxy/api/read/collections/{slug}/access  (Vercel BFF)
    → injects X-Internal-Secret + X-Real-IP
    → forwards Set-Cookie verbatim back to browser
  → EC2 :8080 Spring Boot
    → backend sets gallery_access_<slug> cookie via Set-Cookie header
  → 200 {hasAccess:true}, cookie now in jar

Browser (subsequent navigation to gallery)
  GET /{slug}  (Next.js page)
    → page reads collection via fetchReadApi (server-side)
    → cookie does NOT travel on this server-side fetch (limitation; see Critical Analysis)
    → ...so on first SSR after gate unlock, the gate calls router.refresh()
       to retrigger SSR with the cookie now attached to the browser request

Browser (admin)
  /(admin)/collection/manage/{id}  → ManageClient renders Gallery Access section
  → POST /api/proxy/api/admin/collections/{id}/send-password
  → admin token gate (proxy.ts middleware)
  → backend hashes + saves password, calls SES if email.enabled

Browser (download)
  Click image overlay → window.location.href = /api/proxy/api/read/content/images/{id}/download?format=web
  → BFF forwards (with cookie) → backend streams WebP from S3
  Click "Download All" → /api/proxy/api/read/collections/{slug}/download?format=web
  → backend streams ZipOutputStream of WebPs from S3
```

### Locked design decisions

- **Cookie-only auth.** No `accessToken` query-param fallback. The backend used to support one; we deleted that dead path on both sides because the frontend never used it.
- **Cookie name = `gallery_access_<sanitized-slug>`.** Slug is sanitized to `[a-zA-Z0-9_-]` only; non-matching chars become `_`. Single cookie per gallery means a user authorized to multiple galleries gets one cookie per gallery (not a single session token).
- **`sessionStorage` removed.** It was a UX shortcut that didn't survive tab close and didn't actually gate the backend. Cookies replace it cleanly.
- **24h cookie lifetime.** Hardcoded `Max-Age=86400` server-side. Not configurable from the frontend. Re-typing password once a day is the friction we accepted.
- **Hardcoded `/api/proxy/api/read/...` path** in `validateClientGalleryAccess` and the download URL builders. Explicit at the call site (mirrors the contact form pattern), not built via `buildApiUrl`. Trade-off: if BFF path changes, multiple files need touching.
- **`router.refresh()` after unlock.** Server Components read the collection during SSR; without a refresh, the page would show stripped content even after the cookie is set. `router.refresh()` triggers a real network re-fetch with cookies.
- **WebP only for downloads.** No JPEG, no original, no RAW, no multi-select for v1 (your choice). The URL builder already accepts `format` so adding `original` later is a backend-only change.
- **`window.location.href` for downloads, not `<a download>`.** Slight navigation flash but simpler. Browser handles the `Content-Disposition: attachment` and saves the file.
- **Toasts removed.** Both download placeholders had "Coming soon" toasts. Native browser download UI is enough feedback.
- **Admin password UI = single-form atomic action.** Set password and email it in one POST, because BCrypt is one-way and we can't retrieve the existing password to email it later. Resending = setting a new password.

---

## Files added (6)

| File | Purpose | Tests |
|---|---|---|
| `app/lib/api/downloads.ts` | URL builders for the two download endpoints. Pure functions, no fetch. | `tests/lib/api/downloads.test.ts` (9 tests) |
| `tests/lib/api/downloads.test.ts` | URL-builder tests including slug encoding, format selection, large IDs | — |
| `tests/components/ClientGalleryGate.test.tsx` | 10 tests: sessionStorage never touched, unprotected pass-through, password gating, 429 + 403 handling, network exception, in-flight state | — |
| `tests/components/ImageDownloadOverlay.test.tsx` | 4 tests: renders, sets `window.location.href`, different IDs, `e.stopPropagation` | — |
| `tests/components/ClientGalleryDownload.test.tsx` | 5 tests: renders idle, navigates on click, preparing state + disabled, returns to normal after 4s, slug encoding | — |
| `tests/(admin)/collection/manage/[[...slug]]/ManageClient.galleryAccess.test.tsx` | 9 tests: section visibility, set+send happy path, sub-8-char rejection, email-disabled rendering, set-only, clear path | — |

## Files modified (9)

| File | Change | Net |
|---|---|---|
| `app/lib/api/collections.ts` | `validateClientGalleryAccess` now POSTs to `/api/proxy/api/read/collections/{slug}/access` with `credentials: 'same-origin'`, returns `{hasAccess}`, throws `ApiError` on non-200. Added `sendGalleryPassword(id, password, email)` and `setGalleryPassword(id, password)`. | +74 / −13 |
| `app/components/ClientGalleryGate/ClientGalleryGate.tsx` | Full rewrite. Removed all sessionStorage code (`SESSION_KEY_PREFIX`, `getSessionKey`, the probe). Initial status derives from `collection.isPasswordProtected`. On unlock calls `router.refresh()`. Catches 429 (rate limit) and 403 (proxy/origin) with friendly messages. | +21 / −92 |
| `app/api/proxy/[...path]/route.ts` | Added explicit `Set-Cookie` forwarding via `backendRes.headers.getSetCookie()` → `resHeaders.delete('set-cookie')` + per-cookie `append`. Inline comment documents why the default `new Headers()` constructor breaks cookies with commas in `Expires=`. | +10 / −0 |
| `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx` | Added "Gallery Access" section visible only when `updateData.type === CLIENT_GALLERY`. Three handlers (send, set-only, clear), local state for password/email/status/saving, `router.refresh()` after each action. | +216 / −0 |
| `app/components/ClientGalleryDownload/ImageDownloadOverlay.tsx` | Replaced placeholder toast with `window.location.href = downloadImageUrl(imageId)`. Removed `useRef`/`useEffect`/`showToast` state. | +37 / −X |
| `app/components/ClientGalleryDownload/ClientGalleryDownload.tsx` | Replaced placeholder toast with `window.location.href = downloadCollectionUrl(slug)` + `preparing` state + 4s reset + disabled label. | +36 / −X |
| `app/components/ClientGalleryDownload/{ClientGalleryDownload,ImageDownloadOverlay}.module.scss` | Removed dead `.toast` / `.miniToast` rules + keyframes. Added `&:disabled` rule on the download button. | −46 |
| `tests/lib/api/collections.test.ts` | 12 new tests covering BFF routing, `{hasAccess}` shape, `ApiError` thrown for 429/404/403, send/set/clear API funcs. | +208 |

**Total: 9 modified + 6 added = 15 files. +578 / −162. 1285 frontend tests passing, `tsc --noEmit` clean.**

---

## Critical Analysis

This section is honest about what's weak, deferred, or worth a second look. The above sections describe what's done; this one explains where the seams are.

### 1. SSR + cookie timing edge case

When the user submits the gate form, the backend Set-Cookie response races against `router.refresh()`. If the cookie isn't in the browser jar yet when the refresh fires, the SSR fetch happens without the cookie and returns stripped content. The current code calls `router.refresh()` *after* the `validateClientGalleryAccess` promise resolves, which means the cookie should be set first — but this depends on the browser processing the Set-Cookie header before firing the next fetch. **In practice this works in Chrome, Firefox, and Safari**, but it's not formally guaranteed by the spec. If a user reports "wrong password" after entering the right one, this is the first place to look.

A more defensive design would be:
- Backend includes `{hasAccess: true, slug}` in the JSON body alongside the Set-Cookie
- Frontend explicitly waits for cookie write to commit (no clean API for this) or uses `setTimeout` of ~50ms before `router.refresh()`
- Or: the gate fetches the gallery JSON directly via `fetch` (with `credentials: 'same-origin'`) and updates client state, instead of relying on SSR

We didn't pursue this because it works in practice, but it's a known fragility.

### 2. The download UX is browser-driven and a little janky

`window.location.href = ...` causes the browser to navigate to the download URL. Since the response carries `Content-Disposition: attachment`, the browser saves the file instead of rendering, but there's a brief navigation flash. A cleaner UX would be:

```typescript
const a = document.createElement('a');
a.href = url;
a.download = '';  // hint to download
a.click();
```

Or use `fetch` + `Blob` + `URL.createObjectURL` for full control (with progress UI for "Download All"). For v1 we accepted the flash because it works. **For "Download All" specifically, the user gets a "Preparing ZIP…" label for 4 seconds — but that's a fixed timer, not actual progress.** If the ZIP takes 30s to build server-side, the label is gone but the download hasn't started. Worth replacing with a real fetch + progress indicator if galleries get large.

### 3. The admin "Set Password & Email" UI handles plaintext password client-side

The admin form takes a plaintext password and POSTs it to `/api/admin/collections/{id}/send-password`. That plaintext exists:
- In the input field's React state
- In the JSON request body (HTTPS-encrypted in flight)
- In the backend until it's BCrypt-hashed and the email is sent
- In the email itself, sitting in the recipient's mailbox indefinitely

This is the cost of "email the password to the client" — once mailed, the password lives on the recipient's mail provider's servers. It's the design, not a bug. Admin should know to use a unique password per gallery (no reuse across clients) and to rotate after the gallery is no longer needed. Worth documenting in the operational doc.

### 4. Download buttons render unconditionally on CLIENT_GALLERY

The download icons render on every image in a CLIENT_GALLERY, regardless of whether the gallery is password-protected. For unprotected galleries this is fine (the backend allows downloads when `passwordHash == null`). But there's no UI affordance saying "downloads disabled for non-clients" if a gallery type ever wants to forbid downloads. Trivially extensible later — currently CLIENT_GALLERY is the only type rendering these components.

### 5. Hard-coded BFF paths in three places

- `app/lib/api/collections.ts:validateClientGalleryAccess` — hardcodes `/api/proxy/api/read/collections/{slug}/access`
- `app/lib/api/downloads.ts:downloadImageUrl` — hardcodes `/api/proxy/api/read/content/images/{id}/download`
- `app/lib/api/downloads.ts:downloadCollectionUrl` — hardcodes `/api/proxy/api/read/collections/{slug}/download`

If the proxy ever moves (say, to `/bff/...`), all three need updating. The contact form does the same. A single `BFF_PUBLIC_BASE = '/api/proxy/api/read'` constant would centralize this — minor cleanup, not blocking.

### 6. The admin manage-page test mocks 5+ hooks

`tests/(admin)/collection/manage/[[...slug]]/ManageClient.galleryAccess.test.tsx` mocks `useCollectionData`, `useImageMetadataEditor`, `useContentReordering`, `useCoverImageSelection`, `useImageClickHandler`, plus `Storage.prototype`. That's brittle — internal hook restructuring will break the test even if the Gallery Access section logic is unchanged. Two alternatives:
- Extract the Gallery Access section into its own component (`<GalleryAccessSection collection={...}>`) — testable in isolation, no mocks
- Use Testing Library's `userEvent` integration tests with a real (or close-to-real) page setup

The component extraction is the cleaner path. ManageClient.tsx is 1281+ lines pre-change; pulling out a 200-line concern would be a net win for readability anyway.

### 7. `email-disabled` reason is a string in the status banner

When SES is off, the admin gets `"Password set. Email skipped (email-disabled)."` in the status banner. That's correct but easy to gloss over. Better UX would be a yellow warning callout. Current implementation is functional but minimal.

### 8. No e2e browser test was run

All verification was unit + integration. The full happy path — Gate → Submit → Cookie → router.refresh → Content visible → Download → ZIP saved — has not been clicked through in a real browser. The work in §1 (SSR/cookie timing) is the highest-risk piece. **Action**: someone should drive this in incognito Chrome/Firefox before merging the PR.

### 9. The proxy `Set-Cookie` fix has no test

`app/api/proxy/[...path]/route.ts` is uncovered by tests in this repo (per the agent's report). The fix is small and isolated, but a test that posts to a mock backend returning a `Set-Cookie` header and asserts the proxy forwards it intact would prevent regressions. Worth a follow-up.

### 10. Phase 2 features deferred

Per the master plan, these are explicitly out of scope:
- Per-user accounts (`gallery_user`, `gallery_user_access`, `gallery_invitation`)
- Magic-link invitation flow
- "My Galleries" client dashboard
- Audit log of who accessed which gallery when
- Per-user revoke (right now, password is shared — revoke = change password = email new one to everyone)
- CloudFront signed URLs (Phase 3) — the underlying image URLs in the gallery JSON are still public CloudFront URLs. Once a logged-in client copies an image URL, anyone with that URL can fetch it indefinitely.

These were intentional cuts. The Phase 1.5 work here is forward-compatible: when Phase 2 ships, the JWT cookie becomes the primary path and per-gallery passwords stay as a fallback (per spec §7.5).

---

## How to test locally

1. **Start backend** (in `~/Code/edens.zac.backend`):
   ```bash
   docker compose build backend && docker compose up
   ```
   Watch logs for `Started Application`. If the bean wiring fails, the backend handoff doc explains the multi-constructor `@Autowired` fix that was applied.

2. **Start frontend** (in `~/Code/edens.zac`):
   ```bash
   npm run dev
   ```

3. **Set a password on a CLIENT_GALLERY:**
   - Visit `/(admin)/collection/manage/{id}` for an existing CLIENT_GALLERY (or create one)
   - Scroll to "Gallery Access" section
   - Enter password (8+ chars) + your own email
   - Click "Set Password & Email Client"
   - Confirm status banner shows "Password set" — if SES is off (`EMAIL_ENABLED=false` is the dev default), banner notes "email-disabled"

4. **Test the gate** (incognito window):
   - Navigate to `/{slug}` for the gallery
   - Confirm gate appears with collection title
   - Enter wrong password 5x → 6th attempt should show "Too many attempts. Please wait 15 minutes and try again."
   - Restart backend (or wait 15 min) → enter correct password → gallery loads
   - **Refresh page** → gallery still loads (this was broken before — sessionStorage didn't survive SSR)
   - DevTools → Application → Cookies → confirm `gallery_access_<slug>` cookie has `HttpOnly`, `Secure`, `SameSite=Strict`, 24h expiry

5. **Test downloads:**
   - Hover over an image → click the download icon → WebP saves to disk
   - Click "Download All" → button shows "Preparing ZIP…" → ZIP downloads
   - In DevTools network tab, confirm the request URL is `/api/proxy/api/read/...` (not direct EC2)

6. **Test admin token gating:**
   - In a fresh browser without admin cookie, try POSTing to `/api/proxy/api/admin/collections/{id}/send-password` directly (curl)
   - Should be blocked by the admin-token middleware in `proxy.ts`

7. **Run all tests:**
   ```bash
   /opt/homebrew/bin/node node_modules/.bin/tsc --noEmit
   /opt/homebrew/bin/node node_modules/.bin/jest
   ```
   Expected: 1285 tests pass, 33 suites, 0 failures.

---

## Suggested commit sequence (per master plan Build Order)

1. `feat(gallery): route /access through BFF proxy and capture httpOnly cookie`
   Files: `app/lib/api/collections.ts`, `app/components/ClientGalleryGate/ClientGalleryGate.tsx`, `app/api/proxy/[...path]/route.ts`, `tests/lib/api/collections.test.ts`, `tests/components/ClientGalleryGate.test.tsx`

2. `feat(admin): add Set Password & Send action for client galleries`
   Files: `app/lib/api/collections.ts` (admin functions), `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx`, `tests/(admin)/collection/manage/[[...slug]]/ManageClient.galleryAccess.test.tsx`

3. `feat(gallery): wire image and collection download buttons to backend endpoints`
   Files: `app/lib/api/downloads.ts`, `app/components/ClientGalleryDownload/{ClientGalleryDownload,ImageDownloadOverlay}.{tsx,module.scss}`, `tests/components/{ImageDownloadOverlay,ClientGalleryDownload}.test.tsx`, `tests/lib/api/downloads.test.ts`

Three commits keep the diff reviewable. Each passes `tsc --noEmit` + `jest` independently.

---

## Follow-up tickets to file

1. **Extract `<GalleryAccessSection>` component** out of `ManageClient.tsx` to make the test less brittle (issue #6 above)
2. **Add proxy Set-Cookie regression test** (issue #9)
3. **Replace download UX with `<a download>` + progress** for "Download All" (issue #2)
4. **Centralize BFF base path** as a constant (issue #5)
5. **Improve email-disabled UX** to a warning callout (issue #7)
6. **E2E browser test** in incognito for the full happy path (issue #8)
7. **Phase 2 spike**: per-user invitation flow when the next client requires per-user revoke or audit logging
