# Client Gallery Security & Downloads — Frontend Plan

> **Status**: Approved master plan exists at `~/.claude/plans/context-is-this-repo-indexed-squirrel.md`. This is the frontend execution checklist for `feature/contact-messages-spec` (or a new branch if cut).
> **Repo**: `edens.zac` (Next.js App Router, this repo)
> **Pairs with**: `edens.zac.backend/docs/superpowers/plans/2026-04-27-client-gallery-security-backend.md`

---

## Goals (frontend slice only)

1. Fix the partially-working `ClientGalleryGate` so authentication actually persists across page refreshes (currently broken — token never captured, sessionStorage flag is ignored by backend).
2. Route `POST /collections/{slug}/access` through the BFF proxy so it inherits `X-Internal-Secret` injection and Origin-allowlist enforcement (matching the contact-messages template that just shipped).
3. Add an admin "Set Password & Send to Client" UI on the collection manage page for `CLIENT_GALLERY` types.
4. Wire up the existing `ImageDownloadOverlay` and `ClientGalleryDownload` placeholders to real backend endpoints — WebP only.

This is **Stream A** (auth) and **Stream B** (downloads) on the frontend side. They can be implemented in parallel.

---

## Branch strategy

Recommend a new branch off `feature/contact-messages-spec` because:
- This is a separate feature
- Both touch the BFF proxy — easier to review separately

Suggested name: `feature/client-gallery-security`

---

## Stream A — Auth Hardening (frontend)

### A1. Fix `ClientGalleryGate.tsx`

**File**: `app/components/ClientGalleryGate/ClientGalleryGate.tsx`

**Current bugs to fix**:
- Line 41-44: `sessionStorage.getItem('client-gallery-access-{slug}')` returns 'granted' but the backend doesn't know — this is purely client-side optimistic state
- Line 60-81: probe call discards `accessToken` from response
- Line 102-110: success path discards `accessToken` from response
- Cookie-only flow means we don't need sessionStorage at all

**Changes**:
1. Remove `SESSION_KEY_PREFIX`, `getSessionKey()`, all sessionStorage code (~13 lines deleted)
2. On unlock (after a successful POST /access), the backend Set-Cookie has done the work. We need to **refetch the collection** because the initial server-rendered HTML stripped `content` (since no cookie was attached on the SSR fetch). Use `router.refresh()` from `next/navigation` to re-trigger the server component.
3. Handle `429 Too Many Requests` from rate limiter — show: "Too many attempts. Please wait 15 minutes and try again." Don't reset password input.
4. Handle `403` — proxy or origin denial — show generic "Unable to verify access. Please try again later."
5. For galleries without `isPasswordProtected`, no probe needed — just render children. The new admin flow always sets the flag at creation time.

**Pseudocode**:
```typescript
const [status, setStatus] = useState<GateStatus>(
  collection.isPasswordProtected ? 'locked' : 'unlocked'
);

const handleSubmit = async (e) => {
  e.preventDefault();
  setError(null);
  if (!password.trim()) { setError('Please enter a password.'); return; }
  setIsSubmitting(true);
  try {
    const result = await validateClientGalleryAccess(collection.slug, password);
    if (result.hasAccess) {
      // Cookie is set by backend. Refetch the collection so SSR includes content.
      router.refresh();
      setStatus('unlocked');
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  } catch (err) {
    if (err instanceof ApiError && err.status === 429) {
      setError('Too many attempts. Please wait 15 minutes and try again.');
    } else {
      setError('Unable to verify access. Please try again later.');
    }
  } finally {
    setIsSubmitting(false);
  }
};
```

### A2. Fix `validateClientGalleryAccess` in `app/lib/api/collections.ts`

**File**: `app/lib/api/collections.ts:165-191`

**Current bugs**:
- Return type drops `accessToken` (now moot since backend uses cookie, but the type still needs updating)
- Uses raw `fetch(buildApiUrl('read', ...))` directly, bypassing the BFF proxy
- In production this should 403 from `InternalSecretFilter` since no `X-Internal-Secret` is attached

**Changes**:
1. Switch to the same pattern `app/lib/api/messages.ts` uses — call `/api/proxy/api/read/collections/{slug}/access` (the BFF route)
2. **Critical**: include `credentials: 'same-origin'` (or `'include'` if cross-origin in dev) so the browser sends/receives cookies through the proxy
3. Update return type to `{hasAccess: boolean}` (drop `accessToken` since it's now in the cookie)
4. Handle 429 by throwing `ApiError` with status 429 so the gate can detect it

**Reference**: read `app/lib/api/messages.ts` first — that's the canonical "frontend → BFF → backend public endpoint" pattern from the just-shipped contact-messages work.

### A3. BFF proxy path verification

**File**: `app/api/proxy/[...path]/route.ts`

**Action**: read the file, confirm:
- POST `/api/proxy/api/read/collections/{slug}/access` is permitted
- The proxy forwards `Set-Cookie` response headers back to the browser unchanged (this is critical — if the proxy strips cookies, the gate flow breaks)
- The 16KB body cap is fine (password POST is tiny)

If `Set-Cookie` forwarding is broken, fix it. The contact-messages flow doesn't use cookies, so it may not be tested yet.

### A4. Admin "Set Password & Send" UI

**Find**: search for the existing collection manage page
```bash
grep -rn "ManageClient\|CollectionType.CLIENT_GALLERY" app/\(admin\)/ app/admin/ 2>/dev/null
```

**File**: likely `app/(admin)/admin/collections/[slug]/ManageClient.tsx` or similar — confirm during exploration.

**Changes**: add a new section, only visible when `collection.type === 'CLIENT_GALLERY'`:

```tsx
{collection.type === 'CLIENT_GALLERY' && (
  <section>
    <h3>Gallery Access</h3>
    {collection.isPasswordProtected
      ? <p>Password is set. Sending a new password will replace the existing one.</p>
      : <p>No password set. This gallery is unprotected.</p>}
    <form onSubmit={handleSetAndSend}>
      <input name="password" type="text" minLength={8} required />
      <input name="email" type="email" required />
      <button type="submit">Set Password & Email Client</button>
      <button type="button" onClick={handleSetOnly}>Set Password Only (no email)</button>
      {collection.isPasswordProtected && (
        <button type="button" onClick={handleClear}>Clear Password</button>
      )}
    </form>
    {status && <p>{status}</p>}
  </section>
)}
```

The admin token gate (`hasValidAdminAuth`) already protects this whole admin route — no extra auth check needed at the component level.

### A5. New API client functions

**File**: `app/lib/api/collections.ts` (extend the admin section near `updateCollection`)

```typescript
/**
 * POST /api/admin/collections/{id}/send-password
 * Sets a new password on a CLIENT_GALLERY collection and emails it to the client.
 */
export async function sendGalleryPassword(
  id: number,
  password: string,
  email: string
): Promise<{ sent: boolean; reason?: string }> {
  return fetchAdminPostJsonApi(`/collections/${id}/send-password`, { password, email });
}

/**
 * Updates collection password without sending an email. Empty string clears.
 */
export async function setGalleryPassword(id: number, password: string): Promise<void> {
  // Use existing updateCollection with { password } in the partial body
  await updateCollection(id, { password });
}
```

### A6. Tests

**Files**:
- `tests/lib/api/collections.test.ts` (extend) — token-on-cookie flow, 429 handling, BFF routing
- `tests/components/ClientGalleryGate.test.tsx` (extend or create) — sessionStorage removal, router.refresh on unlock, 429 error display
- `tests/components/admin/ManageClient.test.tsx` (or wherever the manage page lives) — new admin form

Use existing test patterns from `tests/components/ContactForm.test.tsx` and `tests/lib/api/messages.test.ts` as templates.

---

## Stream B — Downloads (frontend)

### B1. Wire `ImageDownloadOverlay`

**File**: `app/components/ClientGalleryDownload/ImageDownloadOverlay.tsx`

Replace the placeholder toast (lines 28-33) with a real download trigger:

```typescript
const handleDownload = useCallback((e: MouseEvent) => {
  e.stopPropagation();
  // Browser will follow the redirect/stream from the proxy, which forwards
  // Content-Disposition: attachment so it saves rather than navigates.
  window.location.href = `/api/proxy/api/read/content/images/${imageId}/download?format=web`;
}, [imageId]);
```

Remove the toast UI + `useRef` + `useEffect` cleanup (no longer needed).

### B2. Wire `ClientGalleryDownload`

**File**: `app/components/ClientGalleryDownload/ClientGalleryDownload.tsx`

```typescript
const [preparing, setPreparing] = useState(false);

const handleDownloadAll = useCallback(() => {
  setPreparing(true);
  window.location.href = `/api/proxy/api/read/collections/${collectionSlug}/download?format=web`;
  // Reset preparing state after a short delay (the browser is now handling the download)
  setTimeout(() => setPreparing(false), 4000);
}, [collectionSlug]);

return (
  <div className={styles.downloadContainer}>
    <button type="button" onClick={handleDownloadAll} disabled={preparing} className={styles.downloadButton}>
      <DownloadIcon />
      {preparing ? 'Preparing ZIP…' : 'Download All'}
    </button>
  </div>
);
```

Drop the toast — the browser's native download UI is feedback enough.

### B3. (Optional) Centralized download URLs

**File**: `app/lib/api/downloads.ts` (new) — pure URL builder, no fetch:

```typescript
export const downloadImageUrl = (imageId: number, format: 'web' | 'original' = 'web'): string =>
  `/api/proxy/api/read/content/images/${imageId}/download?format=${format}`;

export const downloadCollectionUrl = (slug: string, format: 'web' = 'web'): string =>
  `/api/proxy/api/read/collections/${encodeURIComponent(slug)}/download?format=${format}`;
```

Use these in B1 and B2 for consistency. Skip if it feels over-engineered for two callsites.

### B4. Tests

**Files**:
- `tests/components/ImageDownloadOverlay.test.tsx` (new) — verify `window.location.href` is set to the expected URL on click
- `tests/components/ClientGalleryDownload.test.tsx` (new) — same plus the disabled state during "preparing"

Mock `window.location` with `Object.defineProperty(window, 'location', ...)` per Jest patterns.

---

## Build Order

Recommend Stream A first (auth must work before downloads can be gated), but A and B touch disjoint files so they can also run truly in parallel.

Suggested commit sequence:

1. `feat(gallery): route /access through BFF proxy and capture httpOnly cookie` — A1, A2, A3
2. `feat(admin): add Set Password & Send action for client galleries` — A4, A5
3. `feat(gallery): wire image and collection download buttons to backend endpoints` — B1, B2, B3
4. `test(gallery): cover gate cookie flow, admin password UI, downloads` — A6, B4

Each commit should pass `tsc --noEmit && eslint --fix` and the relevant test files.

---

## Verification

```bash
# After each commit:
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit
/opt/homebrew/bin/node node_modules/.bin/eslint --fix <changed-files>
/opt/homebrew/bin/node node_modules/.bin/prettier --write <changed-files>
/opt/homebrew/bin/node node_modules/.bin/jest <changed-test-files>

# Before opening PR:
/opt/homebrew/bin/node node_modules/.bin/jest
```

End-to-end (requires backend running too — see backend plan):

1. Start backend: `cd ../edens.zac.backend && docker compose up -d`
2. Start frontend: `npm run dev`
3. Admin: navigate to a CLIENT_GALLERY's manage page, click "Set Password & Send" with your own email
4. Open incognito → navigate to gallery slug → see gate
5. Wrong password 5x → expect 429 message
6. Correct password → see gallery
7. Refresh → still authorized (was broken before — sessionStorage didn't survive SSR)
8. Click image download icon → WebP downloads
9. Click "Download All" → ZIP downloads

---

## Files Touched (summary)

**Modified**:
- `app/components/ClientGalleryGate/ClientGalleryGate.tsx`
- `app/lib/api/collections.ts`
- `app/api/proxy/[...path]/route.ts` (verify Set-Cookie forwarding)
- `app/components/ClientGalleryDownload/ClientGalleryDownload.tsx`
- `app/components/ClientGalleryDownload/ImageDownloadOverlay.tsx`
- (admin manage page — exact path TBD)

**Added**:
- `app/lib/api/downloads.ts` (optional)
- `tests/lib/api/collections.test.ts` (extended)
- `tests/components/ClientGalleryGate.test.tsx`
- `tests/components/ClientGalleryDownload.test.tsx`
- `tests/components/ImageDownloadOverlay.test.tsx`
- `tests/components/admin/ManageClient.test.tsx` (or extended)

**Deleted**: none.

---

## Open Items / TBD

- **Admin manage page exact path** — confirm with `grep -rn "CollectionType.CLIENT_GALLERY" app/` during implementation
- **`Set-Cookie` forwarding through BFF** — verify `app/api/proxy/[...path]/route.ts` doesn't strip cookies. If it does, fix as part of A3.
- **Downloads disabled state for unprotected galleries** — for `CLIENT_GALLERY` collections without a password (rare/edge case), should the download buttons still appear? Default: yes, just no auth check on backend.
