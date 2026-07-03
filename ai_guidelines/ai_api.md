# API Patterns & Backend Integration

## Overview

The browser **never talks to the Spring Boot backend directly.** Every request goes through a
same-origin **Backend-for-Frontend (BFF) proxy** at `app/api/proxy/[...path]/route.ts`. The typed
client layer in `app/lib/api/` builds relative `/api/proxy/api/**` URLs (browser) or direct
`localhost:8080/api/**` URLs (server, dev) via `getApiBaseUrl` in `core.ts`, and surfaces errors as
`ApiError`.

## Endpoint families

There are three backend families, all reached through the proxy:

| Family    | Base            | Purpose                                                                                           |
| --------- | --------------- | ------------------------------------------------------------------------------------------------- |
| **Read**  | `/api/read/**`  | Public reads — collections, content, metadata, image search, downloads                            |
| **Admin** | `/api/admin/**` | Writes — collection & content create/update/delete, ratings, gallery access, tags/people, reorder |
| **Auth**  | `/api/auth/**`  | `login`, `logout`, `me`, invite acceptance, WebAuthn register/login                               |

> **Writes go to `/api/admin/**`, not `/api/write/**`.** `core.ts` still exports a `write`
> helper family (`fetchPostJsonApi`, `fetchPutJsonApi`, `fetchFormDataApi`, ...) that targets
> `/api/write/**`, but no `lib/api` module currently calls it — collection and content mutations all
> use the `fetchAdmin*` helpers. Prefer the admin helpers for new writes.

Representative real paths (all under the proxy):

- **Read:** `/api/read/collections`, `/api/read/collections/{slug}`,
  `/api/read/collections/{slug}/access`, `/api/read/collections/{slug}/download?format=web|original`,
  `/api/read/collections/location/{slug}`, `/api/read/content/tags`, `/api/read/content/cameras`,
  `/api/read/content/lenses`, `/api/read/content/locations`, `/api/read/content/film-metadata`,
  `/api/read/content/images/search`, `/api/read/content/images/{id}/download`,
  `/api/read/user/me/page`, `/api/read/user/saves`, `/api/read/user/follows`, `/api/read/user/selects`.
- **Admin:** `/api/admin/collections`, `/api/admin/collections/createCollection`,
  `/api/admin/collections/{slug}/update`, `/api/admin/collections/{id}/rating`,
  `/api/admin/collections/{id}/gallery-access`, `/api/admin/collections/{id}/people`,
  `/api/admin/collections/{collectionId}/reorder`, `/api/admin/collections/{parentId}/child`,
  `/api/admin/content/images`, `/api/admin/content/gifs/{id}`, `/api/admin/content/tags`,
  `/api/admin/content/people`, `/api/admin/metadata/cameras`, `/api/admin/tags/{id}/save-as-collection`.
- **Auth:** `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`,
  `/api/auth/invite/{token}`, `/api/auth/webauthn/{register,login}/{start,finish}`.

## The BFF proxy (`app/api/proxy/[...path]/route.ts`)

A single universal handler forwards GET/POST/PUT/PATCH/DELETE to the backend. It:

- **Injects `X-Internal-Secret`** (`process.env.INTERNAL_API_SECRET`) on every forwarded request and
  strips hop-by-hop / platform IP headers (`x-forwarded-for`, `cf-connecting-ip`, `x-vercel-ip-*`,
  ...), re-injecting a sanitized `X-Real-IP`.
- **Enforces an Origin allowlist on writes** (POST/PUT/PATCH/DELETE): the origin must be
  `NEXT_PUBLIC_APP_URL` (or a dev-LAN origin on ports 3000/3001), else `403`.
- **Caps payload size** — 16 KB for JSON writes, 25 MB for multipart uploads — checked against both
  the declared `Content-Length` and the actual buffered body (`413` on overflow).
- **Re-emits multiple `Set-Cookie` headers** via `getSetCookie()` so cookies with commas in
  `Expires` are not corrupted by header-joining. This is what makes cookie auth work through the proxy.

## `core.ts` fetch helpers

`app/lib/api/core.ts` is the shared fetch layer. Key pieces:

- `getApiBaseUrl(type)` — browser → `/api/proxy/api/{type}`; server (dev) → `http://localhost:8080/api/{type}`;
  server (prod) → `{NEXT_PUBLIC_APP_URL}/api/proxy/api/{type}`.
- `getServerCookieHeader()` — on the server, reads incoming cookies (via `next/headers`) and returns a
  `Cookie` header string so RSC re-fetches forward the `gallery_access_{slug}` and `ezac_session`
  cookies. Returns `null` in the browser (fetch attaches same-origin cookies automatically) and during
  the production build phase (avoids the `DYNAMIC_SERVER_USAGE` digest).
- `ApiError extends Error` (carries `status`) — the single error type all helpers throw.
- **Read:** `fetchReadApi<T>(endpoint, options?)` → `/api/read`. Returns `T | null` (204 → `null`).
- **Admin:** `fetchAdminGetApi`, `fetchAdminPostJsonApi`, `fetchAdminPutJsonApi`,
  `fetchAdminPatchJsonApi`, `fetchAdminFormDataApi`, `fetchAdminDeleteApi`, `fetchAdminDeleteJsonApi`
  → `/api/admin`.
- **Write (unused today):** `fetchPostJsonApi`, `fetchPutJsonApi`, `fetchPatchJsonApi`,
  `fetchFormDataApi` → `/api/write`.

```typescript
// Read (server component or client): returns T | null, throws ApiError on non-OK
import { fetchReadApi } from '@/app/lib/api/core';
const collection = await fetchReadApi<CollectionModel>(`/collections/${slug}`, {
  next: { revalidate: 3600, tags: [`collection-${slug}`] },
});
if (!collection) notFound();

// Admin write:
import { fetchAdminPutJsonApi } from '@/app/lib/api/core';
await fetchAdminPutJsonApi<CollectionUpdateResponseDTO>(`/collections/${slug}/update`, payload);
```

## Cookie auth

Auth is cookie-session based (see `app/lib/api/auth.ts`):

- **`ezac_session`** — the session cookie set on login and cleared on logout. Set by the backend, it
  reaches the browser because the proxy re-emits `Set-Cookie`.
- **`gallery_access_{slug}`** — per-client-gallery access cookie; forwarded on server re-fetches by
  `getServerCookieHeader` so RSC renders see gallery access after `router.refresh()`.
- **`me()`** (`/api/auth/me`) resolves the current principal: returns the parsed `MeResponse` on 200,
  **`null` on 401** (logged out is data, not an error), and throws `ApiError` otherwise. There is a
  server variant (`meServer`) used by RSC pages that resolves the absolute backend URL and forwards
  the session cookie explicitly.

Auth calls are raw `fetch` to `/api/proxy/api/auth/...` with `credentials: 'same-origin'` and
`cache: 'no-store'`, throwing `ApiError` on non-OK (except `me()`'s 401 → `null`).

## The `lib/api` module map (~11 modules)

| Module           | Responsibility                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| `core.ts`        | Shared fetch helpers, `ApiError`, base-URL + server-cookie logic                                         |
| `collections.ts` | Collection reads (by slug, location, access probe) + admin collection writes                             |
| `content.ts`     | Content reads (tags, cameras, lenses, locations, film metadata, **image search**) + admin content writes |
| `auth.ts`        | `login`, `logout`, `me`/`meServer`, invite acceptance, WebAuthn flows                                    |
| `user.ts`        | Signed-in user's page/data (`/api/read/user/me/page`)                                                    |
| `users.ts`       | Admin user management + identity-merge preview/apply                                                     |
| `personal.ts`    | Per-user saves ("selects") and follows                                                                   |
| `selects.ts`     | The saved-images ("selects") surface data                                                                |
| `adminHome.ts`   | Home-management surface data                                                                             |
| `downloads.ts`   | Pure builders for BFF-routed image / collection ZIP download URLs                                        |
| `messages.ts`    | Contact-message reads (admin comments page)                                                              |

## Data fetching (RSC)

```typescript
// app/[slug]/page.tsx — Server Component
import { fetchCollectionBySlug } from '@/app/lib/api/collections';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = await fetchCollectionBySlug(slug); // throws ApiError or returns model | null
  if (!collection) notFound();
  return <CollectionPage collection={collection} />;
}
```

## Caching strategy

- **Time-based:** `next: { revalidate: 3600 }` on read fetches.
- **Tag-based on-demand:** tag fetches (`tags: ['collection-<slug>', 'collections']`) and invalidate
  from a route handler with `revalidateTag(...)`.
- **`force-dynamic`:** admin/metadata pages that call `fetchAdminGetApi` set `export const dynamic =
'force-dynamic'` — the proxy/backend is not reliably reachable during a fresh Amplify deploy, so
  those pages must render per-request rather than at build time.

## Error handling

All helpers throw `ApiError` (with `.status`) on non-OK responses. Catch at the boundary:

```typescript
import { ApiError } from '@/app/lib/api/core';

try {
  const data = await fetchReadApi<T>(endpoint);
  if (!data) return <StatusPage kind="not-found" />;
} catch (error) {
  if (error instanceof ApiError && error.status === 404) notFound();
  // log + degrade
}
```

HTTP conventions: **200** success · **204** → `null` · **401/403** auth/authorization ·
**404** → `notFound()` · **413** payload too large (proxy cap) · **500/502** backend/gateway error.

## Domain types (source of truth: `app/types/`)

```typescript
// app/types/Collection.ts
export enum CollectionType {
  BLOG = 'BLOG',
  PORTFOLIO = 'PORTFOLIO',
  ART_GALLERY = 'ART_GALLERY',
  CLIENT_GALLERY = 'CLIENT_GALLERY',
  HOME = 'HOME',
  PARENT = 'PARENT',
  MISC = 'MISC',
}

// app/types/Content.ts
export type ContentType = 'IMAGE' | 'TEXT' | 'GIF' | 'COLLECTION' | 'PANEL';
```

- Wire image fields are **`imageUrl`** (base/web) and **`imageUrlRaw`** (full-res). There is no
  `imageUrlWeb`. GIF blocks use `gifUrl` / `gifUrlWeb`.
- `AnyContentModel` unions `ContentImageModel | ContentParallaxImageModel | ContentTextModel |
ContentGifModel | ContentCollectionModel | ContentPanelModel`.

## Backend contract notes

- Endpoints: `/api/read/**`, `/api/admin/**`, `/api/auth/**`. Database is **PostgreSQL** (on EC2).
- The only frontend-blocking backend gap today is **`POST /collections/{id}/auto-tag`** (collection
  auto-tagging). Image search, public locations/lenses reads, and collection ZIP download have all
  shipped as read endpoints.

## Best practices

1. Route through the typed `lib/api` helpers — never hand-roll a backend URL in a component.
2. All API responses must match the types in `app/types/`; no `any`.
3. Reads use cache tags; mutations `revalidateTag` the affected tags.
4. Prefer Server Components for data fetching — minimize `'use client'`.
5. Use `notFound()` for 404s in page routes; catch `ApiError` at the boundary.
