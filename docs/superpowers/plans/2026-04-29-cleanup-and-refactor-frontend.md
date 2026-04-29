# Cleanup & Refactor — Frontend (2026-04-29)

> **Status**: Plan only. No code written yet.
> **Branch target**: this work folds into `0128-client-page-update` before that branch's PR opens (recommended), OR ships as a follow-up PR after merge. See §3 commit sequence.
> **Pairs with**: backend repo `edens.zac.backend` plan at `docs/superpowers/plans/2026-04-29-cleanup-and-refactor-backend.md`.
> **Meta-plan**: `~/.claude/plans/frontend-docs-superpowers-plans-2026-04-graceful-valley.md`.
> **Predecessors**:
> - `docs/superpowers/plans/2026-04-28-client-gallery-security-handoff.md` — the just-finished feature work this plan cleans up.
> - `docs/superpowers/plans/2026-04-27-contact-messages-handoff.md` — Comments / Contact Messages work, already merged.

## Context

The 0128 client-gallery-security branch is functionally complete and tested but a critical-review pass surfaced one critical issue (unsafe `as` cast on the gate response), four important issues, and a set of refactor opportunities that turn duplicated patterns into reusable components/hooks/tokens. The user has explicitly asked for a "Professional applications" baseline before more public features ship: reusable functions, reusable React components, reusable CSS variables.

**Goal of the plan**: ship the same Phase 1.5 feature with no silent failures, no stringly-typed responses, and no duplicated form patterns. Set up the patterns the next public feature will inherit.

---

## Wave A — bug fixes (block merge)

### FE-C1 — Replace the unsafe `as` cast on `validateClientGalleryAccess` (closes runtime-shape blind spot)

**Why**: `app/lib/api/collections.ts:205` does `return res.json() as Promise<{ hasAccess: boolean }>;`. If the backend ever returns `{hasAccess: "true"}` (string) or `{}`, the gate logic silently accepts it.

**Diff** at `app/lib/api/collections.ts:174–206`:

```typescript
// after the existing if (!res.ok) { ... } block:

  const data: unknown = await res.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    typeof (data as { hasAccess?: unknown }).hasAccess !== 'boolean'
  ) {
    throw new ApiError('Unexpected response shape from /access', res.status);
  }
  return { hasAccess: (data as { hasAccess: boolean }).hasAccess };
}
```

**Tests**: extend `tests/lib/api/collections.test.ts`:
- `validateClientGalleryAccess_throwsApiError_whenResponseShapeIsInvalid` — mock fetch to return `{}` and `{hasAccess: "true"}` and assert `ApiError` with the exact message.

### FE-I1 — `setGalleryPassword` throws on null `updateCollection` result

**Why**: `updateCollection(id, {id, password})` returns `null` on API failure; the caller in `ManageClient.tsx:482` treats that as success and the user sees "Password set." even when no row was updated.

**Diff** at `app/lib/api/collections.ts` (in the `setGalleryPassword` function — search for its signature and `updateCollection(id, ...)` call):

```typescript
// before:
export async function setGalleryPassword(id: number, password: string): Promise<void> {
  await updateCollection(id, { id, password });
}

// after:
export async function setGalleryPassword(id: number, password: string): Promise<void> {
  const result = await updateCollection(id, { id, password });
  if (result === null) {
    throw new Error('Failed to update password — see network tab for details.');
  }
}
```

(Match the existing signature/return type — adjust if the function currently returns the full `CollectionUpdateResponseDTO`.)

**Tests**: extend `tests/lib/api/collections.test.ts`:
- `setGalleryPassword_throws_whenUpdateCollectionReturnsNull` — mock `updateCollection` to resolve null, assert throw.

### FE-I2 — Branch `ClientGalleryGate` error rendering on status code

**Why**: `ClientGalleryGate.tsx:76–82` collapses 404 (slug typo), 403 (proxy origin block), and 5xx (server crash) into the same generic message. The API function already throws `ApiError` with the status — the gate just doesn't switch on it.

**Diff** at `app/components/ClientGalleryGate/ClientGalleryGate.tsx:76–82`:

```typescript
// before (paraphrased — preserve the existing ApiError instanceof check structure):
} catch (error_) {
  if (error_ instanceof ApiError && error_.status === 429) {
    setError('Too many attempts. Please wait 15 minutes and try again.');
  } else {
    setError('Unable to verify access. Please try again later.');
    setPassword('');
  }
}

// after:
} catch (error_) {
  if (error_ instanceof ApiError) {
    if (error_.status === 429) {
      setError('Too many attempts. Please wait 15 minutes and try again.');
    } else if (error_.status === 404) {
      setError('Gallery not found. Check the URL and try again.');
      setPassword('');
    } else if (error_.status === 403) {
      setError('Access denied. Please contact the gallery owner.');
      setPassword('');
    } else {
      setError('Unable to verify access. Please try again later.');
      setPassword('');
    }
  } else {
    setError('Network error. Please check your connection and try again.');
    setPassword('');
  }
}
```

**Tests**: extend `tests/components/ClientGalleryGate.test.tsx`:
- 4 new tests: `shows404Message`, `shows403Message`, `showsRateLimitMessage` (already exists, keep), `showsNetworkErrorMessageOnNonApiError`.

### FE-N6 — Proxy `Set-Cookie` regression test

**Why**: `app/api/proxy/[...path]/route.ts:157–165` has the `getSetCookie()` + `delete` + per-cookie `append` fix. No test asserts that an `Expires=` value with embedded commas survives the proxy.

**New file**: `tests/api/proxy/route.test.ts`

```typescript
import { POST } from '@/app/api/proxy/[...path]/route';

describe('Vercel BFF proxy /api/proxy/[...path]', () => {
  beforeEach(() => {
    process.env.INTERNAL_API_SECRET = 'test-secret';
    process.env.BACKEND_BASE_URL = 'http://backend.test';
  });

  it('forwards multiple Set-Cookie headers verbatim, preserving Expires commas', async () => {
    const cookieA =
      'gallery_access_foo=tokenA; HttpOnly; Secure; SameSite=Strict; ' +
      'Path=/; Expires=Wed, 01 Jan 2025 00:00:00 GMT';
    const cookieB =
      'gallery_access_bar=tokenB; HttpOnly; Secure; SameSite=Strict; ' +
      'Path=/; Expires=Thu, 02 Jan 2025 00:00:00 GMT';

    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response('{"hasAccess":true}', {
        status: 200,
        headers: new Headers([
          ['content-type', 'application/json'],
          ['set-cookie', cookieA],
          ['set-cookie', cookieB],
        ]),
      })
    );

    const req = new Request('https://app.test/api/proxy/api/read/collections/foo/access', {
      method: 'POST',
      body: JSON.stringify({ password: 'x' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req as never, { params: { path: ['api', 'read', 'collections', 'foo', 'access'] } } as never);

    const setCookies = res.headers.getSetCookie();
    expect(setCookies).toContain(cookieA);
    expect(setCookies).toContain(cookieB);
    expect(setCookies).toHaveLength(2);

    mockFetch.mockRestore();
  });
});
```

Adjust the import path of `POST` if the route exports differently. If the route handler doesn't export `POST`, fall back to a fetch-style integration via `next/server` — but the simpler unit shape above is preferred.

### FE-H5 — Forward request cookies on server-side `getCollectionBySlug` (closes "hung up" Bug)

**Why**: User reported that on `http://localhost:3000/2025-christmas`, after submitting the gallery password the frontend "just sits without doing anything." Root cause is NOT the wrong-password path — it's that after `router.refresh()` in `ClientGalleryGate.tsx:69`, the wrapper server component re-runs and calls `getCollectionBySlug(slug, 0, 500)`. **Server-side `fetch` in Next.js does NOT automatically include browser cookies** — the helper must read `cookies()` from `next/headers` and add a `Cookie` header to the outgoing request. Without this, the SSR re-fetch hits the backend with no `gallery_access_<slug>` cookie, the backend correctly strips `content`, and the now-unlocked gate renders an empty gallery. To the user this looks like "the password worked but the page is hung."

The full root-cause writeup is at `~/.claude/plans/backend-plan-docs-superpowers-plans-2026-refactored-babbage.md` (Opus 4.7 critical review).

**Investigation step (do FIRST)**: read `app/lib/api/collections.ts` to find `getCollectionBySlug` and trace it to its underlying fetch helper (`fetchPublicGetApi` or equivalent in `app/lib/api/core.ts` / `app/lib/api/fetchHelpers.ts`). Confirm whether it currently forwards browser cookies when running server-side. If yes, document why Bug 1 still happens and pivot to the alternate hypothesis (Set-Cookie not actually being committed to the browser before `router.refresh()` fires — see "Fallback investigation" below).

**Likely diff** (in the read helper, sketch):

```typescript
import { cookies } from 'next/headers';

async function buildHeaders(extra: HeadersInit = {}): Promise<Headers> {
  const headers = new Headers(extra);
  // Server-side: forward browser cookies so the backend sees the
  // gallery_access_<slug> auth cookie on RSC re-fetches after password unlock.
  if (typeof window === 'undefined') {
    const cookieStore = await cookies();
    const all = cookieStore.getAll();
    if (all.length > 0) {
      headers.set('Cookie', all.map(c => `${c.name}=${c.value}`).join('; '));
    }
  }
  return headers;
}
```

Wire `buildHeaders` into the GET call inside `getCollectionBySlug` (and any other server-callable read function the gallery flow touches — `getCollectionsByType`, `getAllCollections`, `getCollectionMeta`).

**Fallback investigation** (if cookies ARE already forwarded): the user is on `localhost:3000` per their clarification. The backend cookie is set with `Secure` (`CollectionControllerProd.java:207`). On modern browsers `Secure` cookies are accepted on `http://localhost`, but if the user is accessing via the Docker bridge IP (`192.168.65.1` per the WARN log) instead of `localhost`, `Secure` cookies are silently dropped and never persisted. Verify the actual URL bar in the user's browser. If they're on the Docker IP, document this as a dev-environment-only note and require localhost for client gallery testing, OR conditionally drop `Secure` in the dev profile.

**Tests** in `tests/lib/api/collections.test.ts`:
- `getCollectionBySlug_serverSide_forwardsBrowserCookies` — mock `next/headers.cookies()` to return `[{name: 'gallery_access_foo', value: 'token123'}]`, assert outgoing fetch carries `Cookie: gallery_access_foo=token123`.
- `getCollectionBySlug_clientSide_doesNotInjectCookies` — assert no Cookie header is added when running in a browser-like environment (`window` defined).

### FE-H6 — Don't pre-render `<CollectionPage>` as gate children (closes RSC-payload coverImage leak)

**Why**: `app/lib/components/CollectionPageWrapper.tsx:31-37` constructs `<CollectionPage collection={collection} chunkSize={chunkSize} />` as a JSX element and passes it as `children` to `<ClientGalleryGate>`. RSC evaluates children eagerly during the server render — the `CollectionPage` server component IS executed, its output (including any rendering of `collection.coverImage`) IS serialized into the RSC payload, and is shipped to the browser regardless of whether the client gate later renders or hides them. After password unlock, `setStatus('unlocked')` causes the gate to render its already-resolved children — and the cover image displays immediately, even if `collection.content` is still empty (Bug 1 conditions).

Pairs with backend BE-H5 (the API stops sending `coverImage`); this item is the frontend defense — even if a list endpoint or stale cache leaks `coverImage`, we refuse to pre-render children for a locked gallery.

**Diff** at `app/lib/components/CollectionPageWrapper.tsx:31-39`:

```tsx
if (collection.type === CollectionType.CLIENT_GALLERY) {
  // Render CollectionPage children only when the SSR fetch returned actual
  // gallery content. When the collection is locked (no cookie or invalid
  // cookie), backend strips content -> empty -> we render no children, so
  // nothing leaks into the RSC payload of the locked page.
  const hasContent = (collection.content?.length ?? 0) > 0;
  return (
    <ClientGalleryGate collection={collection}>
      {hasContent ? <CollectionPage collection={collection} chunkSize={chunkSize} /> : null}
    </ClientGalleryGate>
  );
}
```

After unlock, `router.refresh()` re-runs this wrapper. With FE-H5 in place, the SSR re-fetch carries the cookie, backend returns populated `content`, and the children get rendered.

**Edge case**: a CLIENT_GALLERY that legitimately has zero content items renders `null` children — acceptable (empty galleries are an admin-state issue, not a user-facing concern).

**Tests** in a new `tests/lib/components/CollectionPageWrapper.test.tsx`:
- `clientGallery_locked_rendersGateWithoutChildren` — mock `getCollectionBySlug` to return a CLIENT_GALLERY with `isPasswordProtected: true, content: []`; assert rendered HTML contains the gate UI but no `<CollectionPage>` markers (no `data-testid` or class from `CollectionPageClient`, no `<img>` with the coverImage URL).
- `clientGallery_unlocked_rendersGateWithChildren` — same collection but `content: [<one image>]`; assert children render.

### FE-H7 — Strip `coverImage` from CLIENT_GALLERY entries in list views (defense in depth)

**Why**: `app/components/ContentCollection/CollectionPage.tsx:33` (the array branch — used for the homepage and any "list of collections" view) renders `col.coverImage?.imageUrl` for every collection in the list, including any CLIENT_GALLERY entries the backend may return. Even after BE-H5 strips `coverImage` from list endpoints server-side, a stale BFF cache or a future regression could re-leak it. The frontend should refuse to render CLIENT_GALLERY cover images defensively.

**Diff** at `app/components/ContentCollection/CollectionPage.tsx:19-46` (in `collectionToContentModel`):

```tsx
function collectionToContentModel(col: CollectionModel): ContentParallaxImageModel {
  // Defense-in-depth: never render a coverImage for a password-protected
  // CLIENT_GALLERY in list views. Backend BE-H5 strips it at the API,
  // but a stale cache or future regression could re-expose it.
  const isProtected =
    col.type === CollectionType.CLIENT_GALLERY && col.isPasswordProtected === true;
  const safeCoverImage = isProtected ? null : col.coverImage;
  const { imageWidth, imageHeight } = clampParallaxDimensions(
    safeCoverImage?.imageWidth,
    safeCoverImage?.imageHeight
  );
  return {
    contentType: 'IMAGE',
    enableParallax: true,
    id: col.id,
    title: col.title,
    slug: col.slug,
    collectionType: col.type,
    description: col.description ?? null,
    imageUrl: safeCoverImage?.imageUrl ?? '',
    overlayText: col.title || col.slug || '',
    imageWidth,
    imageHeight,
    width: imageWidth,
    height: imageHeight,
    orderIndex: 0,
    visible: col.visible ?? true,
    createdAt: col.createdAt,
    updatedAt: col.updatedAt,
    collectionDate: col.collectionDate,
    locations: [],
  };
}
```

Render path consequences: `ContentBlockWithFullScreen` will receive an entry with `imageUrl: ''`. Verify whether that gracefully renders a placeholder card or throws. If it throws, add a `<div className={styles.protectedCard}>` placeholder branch in the array-of-collections JSX path (lines 89-97) that shows just the title for protected entries.

**Tests** in `tests/components/ContentCollection/CollectionPage.test.tsx`:
- `collectionToContentModel_clientGallery_protected_returnsEmptyImageUrl` — input is `{type: 'CLIENT_GALLERY', isPasswordProtected: true, coverImage: {...}}`, assert `imageUrl === ''`.
- `collectionToContentModel_clientGallery_unprotected_passesCoverImageThrough` — input is `{type: 'CLIENT_GALLERY', isPasswordProtected: false, coverImage: {...}}`, assert `imageUrl === col.coverImage.imageUrl`.
- `collectionToContentModel_otherType_passesCoverImageThrough` — input is `{type: 'PORTFOLIO', coverImage: {...}}`, assert `imageUrl === col.coverImage.imageUrl`.

### FE-H8 — Suppress OG/Twitter image meta for password-protected galleries

**Why**: `app/[slug]/page.tsx:31` puts the cover image URL into `openGraph.images` and `twitter.images` unconditionally. For a password-protected client gallery, this meta-tag URL is visible to any HTTP fetcher (search engines, Slack/iMessage link previews, social media crawlers) without ever needing the password.

**Diff** at `app/[slug]/page.tsx:27-48`:

```tsx
try {
  const collection = await getCollectionBySlug(slug, 0, 500);
  const title = collection.title;
  const description = collection.description ?? `${title} — photography by Zac Eden`;
  // Suppress OG image for protected client galleries — the cover image
  // is private until the per-gallery password is verified.
  const isProtected =
    collection.type === CollectionType.CLIENT_GALLERY && collection.isPasswordProtected === true;
  const images =
    !isProtected && collection.coverImage?.imageUrl
      ? [{ url: collection.coverImage.imageUrl }]
      : [];
  return {
    title: isProtected ? `${title} — Private Gallery` : title,
    description: isProtected ? 'Private gallery — password required.' : description,
    openGraph: {
      title,
      description: isProtected ? 'Private gallery.' : description,
      images,
      type: 'website',
    },
    twitter: {
      card: images.length > 0 ? 'summary_large_image' : 'summary',
      title,
      description: isProtected ? 'Private gallery.' : description,
      images: images.map(img => img.url),
    },
  };
} catch {
  return { title: 'Not Found' };
}
```

Add the `CollectionType` import at the top of the file if not already present.

**Tests** in `tests/[slug]/page.test.tsx` (or wherever the metadata test lives — create one if absent):
- `generateMetadata_protectedClientGallery_omitsCoverImage` — mock `getCollectionBySlug` to return `{type: 'CLIENT_GALLERY', isPasswordProtected: true, coverImage: {imageUrl: 'x'}}`, assert returned metadata has `openGraph.images === []` and `twitter.images === []`.
- `generateMetadata_unprotectedCollection_includesCoverImage` — mock to return `{type: 'PORTFOLIO', coverImage: {imageUrl: 'x'}}`, assert metadata includes the image URL.

### FE-Comments-1 (stretch) — Add admin pages to the proxy matcher

**Why**: from the contact-messages handoff (still owed): `/comments`, `/all-collections`, `/all-images`, `/collection/manage/*` are NOT in the matcher in `proxy.ts`. The admin-token check doesn't fire for those page routes. One-line fix, high payoff.

**Diff** at `app/proxy.ts` (or wherever the `config.matcher` lives — likely `middleware.ts`): extend the matcher pattern to include the four admin page roots. Pattern looks roughly like:

```ts
export const config = {
  matcher: [
    '/cdn/:path*',
    '/api/admin/:path*',
    '/comments',
    '/all-collections',
    '/all-images',
    '/collection/manage/:path*',
  ],
};
```

(Confirm the existing matcher's syntax before editing — Next.js middleware matchers are regex-flavored.)

**Tests**: extend the existing `tests/middleware.test.ts` (or whatever covers `proxy.ts` today) to assert each new route triggers admin-auth.

**Decision**: include in Wave A only if this is approved per the meta-plan's open question 3. Otherwise defer to its own follow-up PR.

---

## Wave B — refactor wave (no new features)

These extractions remove existing duplication AND give the next public feature a baseline to inherit. Sequence matters — earlier items unblock later items.

### R3 — `app/lib/api/bffPaths.ts` (mechanical sweep)

**Why**: `/api/proxy/api/read/...`, `/api/proxy/api/admin/...`, and `/api/proxy/api/public/...` are hard-coded in `collections.ts:180`, `downloads.ts:14–18`, and `app/utils/contactApi.ts`. Renaming the BFF prefix today touches every caller.

**New file**: `app/lib/api/bffPaths.ts`

```typescript
/**
 * Single source of truth for the Vercel BFF proxy URL prefixes. Every public-facing fetch from
 * the browser goes through `/api/proxy/api/*`; this file is where the mapping is locked in.
 *
 * Backend routes (verified against `~/Code/edens.zac.backend`):
 *   `/api/public/*`  → unauthenticated (rate-limited at filter chain)
 *   `/api/read/*`    → public-read endpoints (collections, content)
 *   `/api/admin/*`   → admin endpoints (gated by InternalSecretFilter + admin-token middleware)
 */
export const BFF_BASE = '/api/proxy/api';
export const BFF_PUBLIC = `${BFF_BASE}/public`;
export const BFF_READ = `${BFF_BASE}/read`;
export const BFF_ADMIN = `${BFF_BASE}/admin`;
```

**Migrations**:
- `app/lib/api/collections.ts:180` — `${BFF_READ}/collections/${encodeURIComponent(slug)}/access`
- `app/lib/api/downloads.ts` — `${BFF_READ}/content/images/${id}/download?format=web` and `${BFF_READ}/collections/${encodeURIComponent(slug)}/download?format=web`
- `app/utils/contactApi.ts` — `${BFF_PUBLIC}/messages` (or wherever the contact message POST lives today)

**Tests**: existing tests should still pass; no new tests needed.

### R4 — Extract `<GalleryAccessSection>` from `ManageClient.tsx`

**Why**: closes handoff §6 (5+ hook mocks) and FE-I3 (inline styles). Pulling ~96 lines out of a 1500-line component lets the new component render with its own minimal test.

**New files**:
- `app/(admin)/collection/manage/[[...slug]]/components/GalleryAccessSection.tsx`
- `app/(admin)/collection/manage/[[...slug]]/components/GalleryAccessSection.module.scss`

**Component shape** (typed; copy the existing 3 handlers and state into the new file):

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { sendGalleryPassword, setGalleryPassword } from '@/app/lib/api/collections';
import { ApiError } from '@/app/lib/api/core';
import type { CollectionModel } from '@/app/types/Collection';

import styles from './GalleryAccessSection.module.scss';

type Props = { collection: CollectionModel };

const PASSWORD_MIN = 8; // mirrors backend @ValidPassword (see backend plan)

export function GalleryAccessSection({ collection }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<{ kind: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // … 3 handlers (handleSendPassword, handleSetOnlyPassword, handleClearPassword)
  // …  consolidated through useApiSubmit (see R2) once that lands

  return (
    <section className={styles.section} aria-labelledby="gallery-access-heading">
      <h3 id="gallery-access-heading" className={styles.heading}>Gallery Access</h3>
      <div className={styles.inputGroup}>
        <input … />
        <input … />
      </div>
      <div className={styles.buttonRow}>
        <button onClick={handleSendPassword} disabled={saving}>Set Password & Email Client</button>
        <button onClick={handleSetOnlyPassword} disabled={saving}>Set Password Only</button>
        <button onClick={handleClearPassword} disabled={saving}>Clear Password</button>
      </div>
      {status && <StatusBanner status={status.kind} message={status.message} />}
    </section>
  );
}
```

(The `<StatusBanner>` reference depends on R1 below; if R1 lands first the import slots in cleanly. If extracting R4 ahead of R1, render the status inline temporarily and swap when R1 lands.)

**SCSS** (`GalleryAccessSection.module.scss`): replace the inline `style={{ marginBottom, marginTop, gap, display: 'flex', flexWrap }}` bag with named classes:

```scss
@use '@/app/styles/tokens' as *;

.section {
  margin-bottom: var(--space-4);
}

.heading {
  font-size: 1.1rem;
  margin-bottom: var(--space-2);
}

.inputGroup {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.buttonRow {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
```

(Confirm `app/styles/tokens` exists or what the project's SCSS-token import path is — fall back to plain `var(--space-2)` if no `@use` aliasing convention is in place.)

**Migration in ManageClient.tsx**:
- Delete the `~96 lines` of Gallery Access section (currently `lines 1203–1288` per the agent's read).
- Replace with a single `<GalleryAccessSection collection={updateData} />` line in the same render position.
- Delete the related state hooks (`gallery*` state in `ManageClient`).
- Delete the related handlers (`handleSendPassword`, `handleSetOnlyPassword`, `handleClearPassword`).

**Tests**:
- Move `tests/(admin)/collection/manage/[[...slug]]/ManageClient.galleryAccess.test.tsx` → `tests/(admin)/collection/manage/[[...slug]]/GalleryAccessSection.test.tsx`. Drop the 5+ hook mocks, render `<GalleryAccessSection>` directly with a `makeCollection({...})` factory (R5 ships this).
- Existing `ManageClient.tsx` tests should still pass unchanged (the section is gone, only the wrapper remains).

### R1 — `<StatusBanner>` component

**Why**: closes 3 inline implementations (`ContactForm.tsx:45–54`, `ClientGalleryGate.tsx:115`, the new `GalleryAccessSection`).

**New files**:
- `app/components/StatusBanner/StatusBanner.tsx`
- `app/components/StatusBanner/StatusBanner.module.scss`

```typescript
import styles from './StatusBanner.module.scss';

export type StatusKind = 'success' | 'error' | 'info' | 'warning';

type Props = {
  status: StatusKind;
  message: string;
  role?: 'status' | 'alert';
};

export function StatusBanner({ status, message, role }: Props) {
  return (
    <div
      role={role ?? (status === 'error' ? 'alert' : 'status')}
      className={`${styles.banner} ${styles[`banner_${status}`]}`}
    >
      {message}
    </div>
  );
}
```

```scss
@use '@/app/styles/tokens' as *;

.banner {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-2, 4px);
  font-size: 0.95rem;
  line-height: 1.4;
}

.banner_success { background: var(--color-success); color: #fff; }
.banner_error   { background: var(--color-error-bg); color: var(--color-error-text);
                  border: 1px solid var(--color-error-border); }
.banner_info    { background: #f4f4f4; color: var(--color-fg); }
.banner_warning { background: #fff8e1; color: #5d4037; border: 1px solid #ffd54f; }
```

(Use the closest existing tokens; `--color-error-bg`, `--color-error-text`, `--color-error-border` already live in `globals.css` per mempalace. `--color-success` exists. `--radius-2` may not — confirm via `globals.css` and fall back to a literal `4px` with a `// TODO: token` comment if absent.)

**Adoption**:
- `ContactForm.tsx:45–54` — replace the inline `.statusBanner`/`.statusBannerSuccess`/`.statusBannerError` markup with `<StatusBanner status={isSuccess ? 'success' : 'error'} message={...} />`. Delete the corresponding rules from `ContactForm.module.scss`.
- `ClientGalleryGate.tsx:115` — replace the `<p className={styles.gateError}>{error}</p>` with `<StatusBanner status="error" message={error} role="alert" />`.
- `GalleryAccessSection.tsx` (R4) — already wired.

**Tests**:
- `tests/components/StatusBanner.test.tsx` — assert renders with each status, role defaults to `alert` for error and `status` otherwise, message rendered.
- Existing `ContactForm` and `ClientGalleryGate` tests update to query the new banner role (still `getByRole('alert')` for errors).

### R2 — `useApiSubmit` hook

**Why**: 4 form-submit duplications today (ContactForm, ClientGalleryGate, the 3 GalleryAccessSection handlers — plus future forms). Each repeats: set submitting, call API, branch on `ApiError.status`, set status banner, finally clear submitting.

**New file**: `app/hooks/useApiSubmit.ts`

```typescript
'use client';

import { useState } from 'react';

import { ApiError } from '@/app/lib/api/core';
import type { StatusKind } from '@/app/components/StatusBanner/StatusBanner';

type Status = { kind: StatusKind; message: string } | null;

type Options<TResult> = {
  /** Override the default per-status messages. */
  errorMessages?: Partial<Record<number | 'network' | 'default', string>>;
  /** Called when the API resolves successfully. */
  onSuccess?: (result: TResult) => void | Promise<void>;
  /** Optional success-banner message factory; receives the API result. */
  successMessage?: (result: TResult) => string;
};

const DEFAULT_MESSAGES = {
  429: 'Too many attempts. Please wait 15 minutes and try again.',
  404: 'Not found. Check the URL and try again.',
  403: 'Access denied.',
  network: 'Network error. Please check your connection and try again.',
  default: 'Something went wrong. Please try again later.',
} as const;

export function useApiSubmit<TResult>(
  fn: () => Promise<TResult>,
  options: Options<TResult> = {}
) {
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function submit() {
    setSubmitting(true);
    setStatus(null);
    try {
      const result = await fn();
      const successMsg = options.successMessage?.(result);
      if (successMsg) setStatus({ kind: 'success', message: successMsg });
      await options.onSuccess?.(result);
      return { ok: true as const, result };
    } catch (error) {
      const message =
        error instanceof ApiError
          ? options.errorMessages?.[error.status] ??
            DEFAULT_MESSAGES[error.status as keyof typeof DEFAULT_MESSAGES] ??
            options.errorMessages?.default ??
            DEFAULT_MESSAGES.default
          : options.errorMessages?.network ?? DEFAULT_MESSAGES.network;
      setStatus({ kind: 'error', message });
      return { ok: false as const, error };
    } finally {
      setSubmitting(false);
    }
  }

  function clearStatus() {
    setStatus(null);
  }

  return { submit, submitting, status, clearStatus };
}
```

**Adoption**:
- `ClientGalleryGate.tsx` — the entire `handleSubmit` body collapses to a `useApiSubmit` call wired to `validateClientGalleryAccess(slug, password)` with custom 429 message. The `error.status` branching from FE-I2 moves into the `errorMessages` overrides.
- `GalleryAccessSection.tsx` (R4) — three submits, each its own `useApiSubmit` (or one parameterized one).
- `ContactForm.tsx` — once R9 (below) refactors `submitContactMessage` to throw `ApiError`, the form switches to `useApiSubmit`.

**Tests**: `tests/hooks/useApiSubmit.test.ts` — 6 tests:
- happy path returns `{ok: true}` and sets success status if `successMessage` provided
- ApiError 429 maps to default 429 message
- ApiError 404 maps to default 404 message
- ApiError of unknown status maps to default fallback
- non-ApiError maps to network message
- option `errorMessages[429]` override wins

### R8 — CSS tokens

**Why**: Hardcoded `rgb(0, 0, 0, 0.7)` / `rgb(0, 0, 0, 0.9)` in `ImageDownloadOverlay.module.scss:26,34`. Hardcoded `0.2s ease`, `0.3s ease` transition timings sprinkled across SCSS modules.

`globals.css` already has plenty of overlay tokens but only **light** ones (`--color-overlay-light-*`) and a single dark `--color-badge-bg: rgb(0, 0, 0, 0.9)` — not a generic dark scale.

**Diff** in `app/styles/globals.css` (or wherever `:root { ... }` lives — confirm path):

```css
:root {
  /* …existing tokens… */

  /* Dark overlay scale (mirror of --color-overlay-light-*) */
  --color-overlay-dark-30: rgb(0, 0, 0, 0.3);
  --color-overlay-dark-50: rgb(0, 0, 0, 0.5);  /* duplicates --color-cover-overlay; alias kept for naming */
  --color-overlay-dark-70: rgb(0, 0, 0, 0.7);
  --color-overlay-dark-90: rgb(0, 0, 0, 0.9);  /* duplicates --color-badge-bg */

  /* Animation timing scale */
  --duration-fast: 0.15s;
  --duration-base: 0.25s;
  --duration-slow: 0.4s;
  --easing-default: ease;
}
```

**Adoption**:
- `app/components/ClientGalleryDownload/ImageDownloadOverlay.module.scss:26` — `background-color: var(--color-overlay-dark-70);`
- `app/components/ClientGalleryDownload/ImageDownloadOverlay.module.scss:34` — `background-color: var(--color-overlay-dark-90);`
- `app/components/ClientGalleryDownload/ClientGalleryDownload.module.scss` — replace `transition: background-color 0.2s ease;` with `transition: background-color var(--duration-base) var(--easing-default);`
- `app/components/ContactForm/ContactForm.module.scss:78` — same transition update.

### R5 — `tests/utils/` shared mocks + factories

**Why**: every new test file re-mocks `next/navigation`, `fetch`, `ApiError`. `makeCollection({...})` is hand-rolled in two places.

**New files**:

```
tests/utils/
  mockNextNavigation.ts
  mockApiError.ts
  factories/
    collection.ts
    contactMessage.ts
```

`tests/utils/mockNextNavigation.ts`:
```typescript
export const mockRouter = {
  refresh: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  forward: jest.fn(),
};

export function mockNextNavigation() {
  jest.mock('next/navigation', () => ({
    useRouter: () => mockRouter,
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
  }));
}

export function resetNextNavigationMocks() {
  Object.values(mockRouter).forEach(fn => (fn as jest.Mock).mockReset?.());
}
```

`tests/utils/mockApiError.ts`:
```typescript
import { ApiError } from '@/app/lib/api/core';

export function makeApiError(status: number, message = `Test API error ${status}`): ApiError {
  return new ApiError(message, status);
}
```

`tests/utils/factories/collection.ts`:
```typescript
import { CollectionType } from '@/app/types/Collection';
import type { CollectionModel } from '@/app/types/Collection';

export function makeCollection(overrides: Partial<CollectionModel> = {}): CollectionModel {
  return {
    id: 1,
    slug: 'test-gallery',
    title: 'Test Gallery',
    type: CollectionType.CLIENT_GALLERY,
    isPasswordProtected: false,
    content: [],
    contentCount: 0,
    // …other required fields with stable defaults
    ...overrides,
  };
}
```

**Adoption**: every new and existing test that locally mocks `next/navigation`/declares `makeCollection` switches to the shared helper. Bulk grep + replace.

### R9 — Standardize on `ApiError` in `contactApi.ts`

**Why**: `app/utils/contactApi.ts` returns a discriminated union `{ok: true, …} | {ok: false, code, message}`. Every other API client throws `ApiError`. Two error-handling shapes long-term is a tax.

**Diff** at `app/utils/contactApi.ts` (refactor `submitContactMessage` so the result is a happy-path `{id, createdAt}` and any failure throws `ApiError`):

```typescript
// before (paraphrased):
export type ContactResult =
  | { ok: true; id: number; createdAt: string }
  | { ok: false; code: 'rate-limit' | 'validation' | 'network'; message: string };

export async function submitContactMessage(input: ContactInput): Promise<ContactResult> {
  const res = await fetch(`/api/proxy/api/public/messages`, { … });
  if (res.status === 429) return { ok: false, code: 'rate-limit', message: '…' };
  if (!res.ok)            return { ok: false, code: 'validation', message: '…' };
  return { ok: true, …(await res.json()) };
}

// after:
import { BFF_PUBLIC } from '@/app/lib/api/bffPaths';
import { ApiError } from '@/app/lib/api/core';

export type ContactSuccess = { id: number; createdAt: string };

export async function submitContactMessage(input: ContactInput): Promise<ContactSuccess> {
  const res = await fetch(`${BFF_PUBLIC}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new ApiError(detail || `API error: ${res.status}`, res.status);
  }
  return (await res.json()) as ContactSuccess;
}
```

**Adoption**: `ContactForm.tsx`'s `handleSubmit` switches from inspecting `result.ok` to a `useApiSubmit` invocation:

```typescript
const { submit, submitting, status } = useApiSubmit(
  () => submitContactMessage(formData),
  {
    errorMessages: { 429: "Whoa — too many messages from your network. Please wait." },
    successMessage: () => 'Thanks! Your message has been sent.',
    onSuccess: () => setFormData(EMPTY),
  }
);
```

**Tests**: rewrite `tests/utils/contactApi.test.ts` (or wherever it lives) to assert it throws `ApiError` on 429/4xx/5xx and returns the success shape on 201. Update `tests/components/ContactForm.test.tsx` to mock `submitContactMessage` to throw rather than to return `{ok: false}`.

### FE-N5 — Narrow `SendGalleryPasswordResponse.reason`

**Diff** at `app/lib/api/collections.ts:242–245`:

```typescript
// before:
export interface SendGalleryPasswordResponse {
  sent: boolean;
  reason?: string;
}

// after:
export type SendGalleryPasswordReason = 'email-disabled' | 'ses-error' | 'unknown';

export interface SendGalleryPasswordResponse {
  sent: boolean;
  reason?: SendGalleryPasswordReason;
}
```

If the backend record in `EmailService.SendResult` becomes an enum (per backend plan §"Cross-repo coordination" recommendation), the strings `"email-disabled"` / `"ses-error"` are guaranteed by the JSON serializer.

### FE-N3 — `aria-describedby` on the password input in `GalleryAccessSection`

**Diff** at the password input in the new `GalleryAccessSection.tsx`:

```typescript
<label htmlFor="gallery-password">Password</label>
<input
  id="gallery-password"
  type="password"
  aria-describedby="gallery-password-help"
  …
/>
<small id="gallery-password-help">At least 8 characters.</small>
```

---

## Wave C — deferred

| ID | Concern | Reason for deferral |
|---|---|---|
| FE-Comments-2 | Stale spec/plan docs reference deleted MAIL/CONTACT env vars. | Doc archival chore; one PR. |
| FE-Comments-3 | Mark-as-read / delete / search on admin Comments page. | Phase 2 of Comments; user has not requested. |
| Phase 2 client-gallery | Per-user invitations, audit log, CloudFront signed URLs. | Out of scope per the master plan. |
| Download UX upgrade | `<a download>` + real progress for "Download All" (handoff §2). | Wait for first client gallery > 50 images. |
| E2E browser test | Full incognito happy-path test (handoff §8). | Manual exercise covers it for v1. |

---

## Cross-repo coordination

The backend plan (`~/Code/edens.zac.backend/docs/superpowers/plans/2026-04-29-cleanup-and-refactor-backend.md`) covers the matching backend cleanup. Items where the two must align:

1. **Password length policy** — backend introduces `@ValidPassword`. Frontend mirrors via `PASSWORD_MIN = 8` constant in `GalleryAccessSection.tsx`. Add a comment: `// mirrors backend @ValidPassword in src/main/java/.../validation/ValidPassword.java`.
2. **`/api/proxy/api/{public,read,admin}` URL contract** — `bffPaths.ts` (R3) locks the prefixes in. Backend route mappings must remain stable.
3. **`SendGalleryPasswordResponse.reason`** — frontend narrows to `'email-disabled' | 'ses-error' | 'unknown'`. Backend should mirror this with an enum (per the backend plan's recommendation). Either land together or keep `'unknown'` as the safety valve until backend narrows.
4. **Backend handoff doc V5→V17 patch** (BE-N2) — cross-checked here for awareness, no frontend change needed.
5. **Cover-image leak invariant** (BE-H5 ↔ FE-H6/H7/H8) — backend stops sending `coverImage` for protected galleries without a valid cookie; frontend defensively refuses to render it (in pre-rendered RSC children, in list views, and in OG meta tags). Each layer is required because each leak vector is different. Either land BE-H5 first (it's a strict tightening — no client breaks) and frontend defenses follow, or ship together. **Note**: FE-H5 (cookie forwarding for the "hung up" bug) is a frontend-only change but its symptom looks like a backend bug — surface this in commit messages / PR description so reviewers understand.

---

## Verification

After Wave A (and after Wave B if landed together):

```bash
cd ~/Code/edens.zac

# Format + lint pipeline (per CLAUDE.md project conventions)
/opt/homebrew/bin/node node_modules/.bin/prettier --write <touched files>
/opt/homebrew/bin/node node_modules/.bin/eslint --fix <touched files>
/opt/homebrew/bin/node node_modules/.bin/stylelint --fix <touched SCSS files>
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit
/opt/homebrew/bin/node node_modules/.bin/jest

# Dev server (user keeps port 3000; preview server on 3001 if needed)
npm run dev
```

Browser checks (incognito, port 3001):
1. `/(admin)/collection/manage/{id}` → set + email password → confirm `<StatusBanner status="success">` renders.
2. Visit `/{slug}` (incognito) → enter wrong password 5×; on the 6th attempt verify the banner is the rate-limit copy (R2 path).
3. Type a non-existent slug → confirm "Gallery not found" message (FE-I2).
4. Restart backend → enter correct password → page reloads with content visible.
5. DevTools → Application → Cookies → confirm `gallery_access_<slug>` has `HttpOnly`, `Secure`, `SameSite=Strict`, 24h expiry.
6. Hover image → click download icon → WebP saves.
7. Click "Download All" → ZIP saves.
8. Hard-refresh the gallery page → still authenticated.
9. (If FE-Comments-1 included) Try `/comments` without admin token → blocked.
10. **FE-H5** ("hung up" regression): incognito → enter the correct password on `/2025-christmas` → confirm gallery content loads (not blank). DevTools → Network: confirm the SSR re-fetch after `router.refresh()` carries the `Cookie: gallery_access_2025-christmas=...` header.
11. **FE-H6** (locked-page coverImage absent from RSC): incognito → load `/2025-christmas` (locked) → View Source → search for the coverImage URL — should be absent.
12. **FE-H7** (homepage list strip): incognito → visit `/` → find the protected gallery's card — no cover image (placeholder/title-only).
13. **FE-H8** (OG suppression): incognito → load `/2025-christmas` (locked) → DevTools → Elements → `<head>` → confirm `og:image` and `twitter:image` are absent.

---

## Suggested commit sequence

If folded into the existing `0128-client-page-update` branch (recommended):

1. `fix(gallery): runtime-validate /access response shape`
   - Files: `app/lib/api/collections.ts`, `tests/lib/api/collections.test.ts`.
2. `fix(gallery): throw on null updateCollection result in setGalleryPassword`
   - Files: `app/lib/api/collections.ts`, `tests/lib/api/collections.test.ts`.
3. `fix(gallery): branch error rendering on status code in ClientGalleryGate`
   - Files: `app/components/ClientGalleryGate/ClientGalleryGate.tsx`, `tests/components/ClientGalleryGate.test.tsx`.
4. `test(proxy): regression test for Set-Cookie forwarding with Expires commas`
   - Files: `tests/api/proxy/route.test.ts` (new).
5. `fix(gallery): forward browser cookies on server-side collection fetch`
   - Files: `app/lib/api/collections.ts` (and/or the underlying `app/lib/api/core.ts` helper), `tests/lib/api/collections.test.ts`.
   - Closes Bug 1 ("hung up") — FE-H5.
6. `fix(gallery): omit pre-rendered children when gate will be locked`
   - Files: `app/lib/components/CollectionPageWrapper.tsx`, new `tests/lib/components/CollectionPageWrapper.test.tsx`.
   - FE-H6 — closes RSC-payload coverImage leak.
7. `fix(gallery): hide coverImage for protected galleries in list views`
   - Files: `app/components/ContentCollection/CollectionPage.tsx`, `tests/components/ContentCollection/CollectionPage.test.tsx`.
   - FE-H7 — defense-in-depth.
8. `fix(metadata): omit OG image for password-protected galleries`
   - Files: `app/[slug]/page.tsx`, new `tests/[slug]/page.test.tsx` if absent.
   - FE-H8 — closes OG/Twitter meta leak.
9. (optional) `fix(middleware): add admin page routes to admin-auth matcher`
   - Files: `app/proxy.ts` (or `middleware.ts`), `tests/middleware.test.ts`.

Then, separate PRs for Wave B refactors:
6. `refactor(api): centralize BFF proxy paths in bffPaths.ts` — touches collections, downloads, contactApi.
7. `refactor(admin): extract <GalleryAccessSection> from ManageClient` — moves the section + test.
8. `feat(ui): introduce <StatusBanner> component` — adopt in 3 call sites.
9. `feat(hooks): introduce useApiSubmit` — adopt in 3 form-submitting components.
10. `style(tokens): add dark-overlay and duration scales` — globals + 3 SCSS modules.
11. `test: lift shared mocks/factories into tests/utils/` — bulk simplification.
12. `refactor(contact): standardize ContactForm on ApiError + useApiSubmit` — completes R9 + adopts the new hook.
13. `chore(types): narrow SendGalleryPasswordResponse.reason` — tiny cleanup.
14. `a11y: aria-describedby on gallery password input` — single attribute.

Each commit must pass `tsc --noEmit` + `jest` independently.

---

## Files referenced

- New: `app/lib/api/bffPaths.ts`, `app/components/StatusBanner/{StatusBanner.tsx,StatusBanner.module.scss}`, `app/hooks/useApiSubmit.ts`, `app/(admin)/collection/manage/[[...slug]]/components/{GalleryAccessSection.tsx,GalleryAccessSection.module.scss}`, `tests/utils/{mockNextNavigation,mockApiError}.ts`, `tests/utils/factories/{collection,contactMessage}.ts`, `tests/api/proxy/route.test.ts`, `tests/lib/components/CollectionPageWrapper.test.tsx` (FE-H6), `tests/components/ContentCollection/CollectionPage.test.tsx` (FE-H7), `tests/[slug]/page.test.tsx` (FE-H8 if absent)
- Modified (Wave A): `app/lib/api/collections.ts` (+ FE-H5 cookie forwarding), `app/components/ClientGalleryGate/ClientGalleryGate.tsx`, `app/lib/components/CollectionPageWrapper.tsx` (FE-H6), `app/components/ContentCollection/CollectionPage.tsx` (FE-H7), `app/[slug]/page.tsx` (FE-H8), `app/lib/api/core.ts` (or equivalent fetch-helper for FE-H5), `app/proxy.ts` (if FE-Comments-1 included)
- Modified (Wave B): `app/lib/api/downloads.ts`, `app/utils/contactApi.ts`, `app/components/ContactForm/{ContactForm.tsx,ContactForm.module.scss}`, `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx`, `app/components/ClientGalleryDownload/{ClientGalleryDownload,ImageDownloadOverlay}.module.scss`, `app/styles/globals.css` (or wherever `:root {}` lives)
- Tests touched: `tests/lib/api/collections.test.ts`, `tests/components/ClientGalleryGate.test.tsx`, `tests/components/ContactForm.test.tsx`, the moved `GalleryAccessSection.test.tsx`, the new `StatusBanner.test.tsx`, `useApiSubmit.test.ts`, `proxy/route.test.ts`
