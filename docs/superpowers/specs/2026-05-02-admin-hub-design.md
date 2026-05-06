# Admin Hub Page — Local-Only Dev Console

**Status:** Approved design (revised 2026-05-04 after critical review)
**Date:** 2026-05-02
**Revised:** 2026-05-04 — fixed backend package/naming, test file scope, image URL column, force-dynamic, `/collection/create` route file
**Branch:** `0135-admin-page`
**Scope:** Cross-repo — spans `edens.zac` (frontend, this repo) and `edens.zac.backend` (backend, sibling repo)
**Companion spec:** A condensed companion will be filed at `edens.zac.backend/docs/superpowers/specs/2026-05-02-admin-hub-backend.md` (created during the implementation plan phase). Keep both in sync if revised.

## Problem

Admin tooling for the portfolio is scattered across many URLs (`/all-collections`, `/all-images`, `/comments`, `/metadata`, `/collection/manage`, `/collection/create`, `/collectionType/blogs`, `/collectionType/client-gallery`). There is no single landing surface, and on localhost the home page (`/`) is the public portfolio — not what the operator needs to see first when running the dev server.

## Goal

Build a single local-only "admin hub" page that:

1. Acts as the localhost landing page (`/` redirects to `/admin` when local).
2. Renders a parallax tile grid mirroring the home page aesthetic, with one tile per existing admin destination plus a placeholder for future "About Me" editing.
3. Provides an Action Box for imperative dev actions (initially: Clear Cache).
4. Sources tile cover images from the existing image pool via a new backend table (`admin_home_tile`), so covers are data-driven rather than shipped JPGs.
5. Exposes the regular home page at `/homePage` (local-only escape route).

## Non-goals

- About Me edit page (placeholder tile, disabled — separate spec).
- Inline cover-image editor UI in the admin hub (separate spec — "Edit Admin Cover Images").
- Remote/non-local admin access via `ADMIN_TOKEN` (existing helper supports this; future enablement is one proxy.ts edit).
- Additional Action Box items beyond Clear Cache (`Resync Memory Palace`, `Sync Sitemap`, etc.) — config pattern is built to extend.

## Decisions locked during brainstorming

| Topic | Choice | Why |
|---|---|---|
| Localhost redirect mechanism | proxy.ts middleware (Approach 1) | Matches existing `/cdn` local-only protection pattern; isolates dev-only behavior in one file; leaves `app/page.tsx` clean |
| Real-home escape route | Separate file `app/homePage/page.tsx`, also local-only | Stable URL, no query-param hacks, gated identically to `/admin` so prod is unaffected |
| Tile data source | Hardcoded label/href config + backend-sourced cover image URL | Labels/hrefs change with code; covers should be admin-editable later without a deploy |
| Cover image storage | New `admin_home_tile` table referencing `content_image(id)` via FK | Reuses existing image pool (CloudFront-served, already uploaded); avoids shipping new static JPGs |
| Cover edit UX (this work) | None — initial covers seeded via migration; future edits via SQL | Editor UI deserves its own design pass; user changes covers infrequently |
| Hub layout component | New `AdminHubGrid` (~80 LOC) using `useParallax` hook | Reusing `CollectionPage` would force non-collection hrefs into the production rendering pipeline |
| Action Box scope | Clear Cache button only | Other actions can be added via the same config pattern in follow-ups |
| Clear Cache implementation | Server Action: `revalidatePath('/', 'layout')` (nuclear) + client-side `collectionStorage.clearAll()` | Simpler than enumerating all parameterized tags (`collection-${slug}`, `collections-type-${type}`, etc.); semantics match "Clear Cache" intent (nuke everything) |
| About Me tile | Disabled placeholder | Real edit feature deferred to backlog spec |

## Architecture

```
Browser ──GET /──▶ Next.js proxy.ts (middleware)
                          │
                          ├── if local + path === '/' → 307 redirect to /admin
                          ├── if local + /admin* or /homePage → next()
                          └── if !local + /admin* or /homePage → redirect to /
                                  ▼
                          /admin → app/(admin)/admin/page.tsx (Server Component)
                                  │
                                  ├── fetch /api/admin/admin-home/tiles (Next proxy → Spring)
                                  │       Spring AdminHomeControllerDev
                                  │       └─ AdminHomeService → AdminHomeDao
                                  │           └─ admin_home_tile JOIN content_image
                                  │
                                  ├── merges API result with adminTiles.ts (label/href/disabled)
                                  ▼
                          renders <AdminActionBox /> + <AdminHubGrid tiles={merged} />
                                  │
                                  ├── AdminActionBox → Clear Cache server action
                                  │       revalidatePath('/', 'layout')   // nukes data + route cache
                                  │       (client) collectionStorage.clearAll()
                                  │
                                  └── AdminHubGrid → tiles use useParallax + Link to tile.href
```

## Routing & redirect (proxy.ts)

Three rule additions, placed at the **top** of the existing `proxy()` function (before the `/cdn` block since these are higher-priority paths). All gated by `isLocalEnvironment()`.

```ts
// /admin and /homePage: local-only — redirect to / in non-local
if (
  pathname === '/admin' ||
  pathname.startsWith('/admin/') ||
  pathname === '/homePage'
) {
  if (!isLocalEnvironment()) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

// On localhost, / → /admin (real home is reachable via /homePage)
if (isLocalEnvironment() && pathname === '/') {
  return NextResponse.redirect(new URL('/admin', request.url));
}
```

Matcher additions: `/`, `/admin`, `/admin/:path*`, `/homePage`.

**Loop verification:** non-local hits to `/admin` redirect to `/` (rule 1) — the local-only `/` → `/admin` rule (rule 2) doesn't fire because `!isLocalEnvironment()`. Local `/admin` passes through. Local `/` redirects to `/admin` once.

## Frontend file structure

```
app/(admin)/admin/
├── page.tsx                    # Server Component: fetches tiles, renders ActionBox + Grid
│                                 # Must export `const dynamic = 'force-dynamic'` (per-request fetch, dev-only)
├── adminTiles.ts               # Hardcoded tile config (label, href, disabled, tileKey)
├── AdminHubGrid.tsx            # Client Component: parallax tile grid using useParallax
├── AdminHubGrid.module.scss    # Tile + grid styles
├── AdminActionBox.tsx          # Client Component: action button row
├── AdminActionBox.module.scss
└── actions.ts                  # 'use server' module: clearCacheAction()

app/(admin)/collection/create/
└── page.tsx                    # Thin wrapper rendering ManageClient in create mode.
                                # The proxy has `/collection/create` allowlisted but no
                                # page route file currently exists — clicking the
                                # "Create Collection" tile would 404 without this.
                                # Implementation: render the same component tree as
                                # `/collection/manage` (which sets `isCreateMode = !slug`
                                # at ManageClient.tsx:126).

app/homePage/
└── page.tsx                    # One-line wrapper: <CollectionPageWrapper slug="home" />
                                # Must export `const dynamic = 'force-dynamic'` to
                                # match app/page.tsx behavior (avoids static-render
                                # of a per-request collection fetch).

app/lib/api/
└── adminHome.ts                # getAdminHomeTiles() fetcher + types

proxy.ts                        # Modified: new rules + matcher entries
```

### Tile data model

Hardcoded config (`adminTiles.ts`) — labels and hrefs are code-owned:

```ts
export type AdminTileConfig = {
  tileKey: string;        // matches admin_home_tile.tile_key
  label: string;
  href: string;
  disabled?: boolean;
};

export const ADMIN_TILES: AdminTileConfig[] = [
  { tileKey: 'home',             label: 'Home (Preview)',     href: '/homePage' },
  { tileKey: 'all-collections',  label: 'All Collections',    href: '/all-collections' },
  { tileKey: 'all-images',       label: 'All Images',         href: '/all-images' },
  { tileKey: 'metadata',         label: 'Metadata',           href: '/metadata' },
  { tileKey: 'comments',         label: 'Contact Messages',   href: '/comments' },
  { tileKey: 'blogs',            label: 'Blogs',              href: '/collectionType/blogs' },
  { tileKey: 'client-galleries', label: 'Client Galleries',   href: '/collectionType/client-gallery' },
  { tileKey: 'create',           label: 'Create Collection',  href: '/collection/create' },
  { tileKey: 'manage',           label: 'Manage Collections', href: '/collection/manage' },
  { tileKey: 'about',            label: 'About Me (soon)',    href: '#', disabled: true },
];
```

API response shape (from `getAdminHomeTiles()`):

```ts
export type AdminHomeTileApi = {
  tileKey: string;
  coverImageUrl: string | null;  // null if no cover assigned yet
  displayOrder: number;
};
```

The Server Component merges them into a render-ready list:

```ts
export type AdminTileMerged = AdminTileConfig & {
  coverImageUrl: string | null;
};
```

If the backend fetch fails or the cover is missing, the tile renders with a styled placeholder (CSS gradient, no Image element).

## Backend changes (`edens.zac.backend`)

### Flyway migration

`src/main/resources/db/migration/V19__admin_home_tiles.sql`:

```sql
-- V19__admin_home_tiles
-- Description: Backing table for the local admin hub page. Each row maps a
-- well-known tile_key (defined in the frontend adminTiles.ts) to a cover image
-- chosen from the existing content_image pool. Cover edits happen via SQL for v1;
-- a future spec adds an editor UI.

BEGIN;

CREATE TABLE admin_home_tile (
    id              BIGSERIAL PRIMARY KEY,
    tile_key        VARCHAR(64) NOT NULL UNIQUE,
    cover_image_id  BIGINT REFERENCES content_image(id) ON DELETE SET NULL,
    display_order   INT NOT NULL DEFAULT 0,
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_home_tile_order ON admin_home_tile(display_order);

INSERT INTO admin_home_tile (tile_key, display_order) VALUES
  ('home',             0),
  ('all-collections',  1),
  ('all-images',       2),
  ('metadata',         3),
  ('comments',         4),
  ('blogs',            5),
  ('client-galleries', 6),
  ('create',           7),
  ('manage',           8),
  ('about',            9);

COMMIT;
```

`cover_image_id` ships NULL for all rows; the operator picks initial covers via a one-time `UPDATE admin_home_tile SET cover_image_id = ? WHERE tile_key = ?` using IDs from the all-images page.

### Java layers

Following project conventions (`*ControllerDev` in `controller/dev/` + `@Profile("dev")`, `*Entity` POJOs in `entity/`, `*Repository` extending `BaseDao` in `dao/`, `NamedParameterJdbcTemplate`, `*Service` in `services/` with `@Service` + `@RequiredArgsConstructor`):

- **`AdminHomeTileEntity`** — `entity/AdminHomeTileEntity.java`. Fields: `id`, `tileKey`, `coverImageId`, `displayOrder`, `updatedAt`. Lombok `@Builder` + `@Data`.
- **`AdminHomeTileRepository`** — `dao/AdminHomeTileRepository.java`. **Class is named `*Repository`** (matches `CollectionRepository`, `MessageRepository`, `LocationRepository`, etc.) but extends `BaseDao` (NOT a Spring Data JPA repository, despite the name). Method: `List<AdminHomeTileWithCover> findAllWithCover()` — single JOIN query:
  ```sql
  SELECT t.tile_key, ci.image_url_web AS cover_image_url, t.display_order
  FROM admin_home_tile t
  LEFT JOIN content_image ci ON t.cover_image_id = ci.id
  ORDER BY t.display_order ASC
  ```
  `image_url_web` is the web-optimized URL (NOT NULL on content_image), matching how every other content surface renders covers.
- **`AdminHomeService`** — `services/AdminHomeService.java`. Annotated `@Service @RequiredArgsConstructor @Slf4j`. Single method `List<AdminHomeTileResponse> getTiles()` that calls the repository and maps to a response DTO.
- **`AdminHomeTileResponse`** record — `(String tileKey, String coverImageUrl, int displayOrder)`. `coverImageUrl` is null when no cover is set. Convention: nest inside `model/Records.java` (matches `Records.Tag`, `Records.Person`, etc.) — file location decision can defer to plan phase if a top-level record file is preferred.
- **`AdminHomeControllerDev`** — `controller/dev/AdminHomeControllerDev.java`. Annotated `@Slf4j @RequiredArgsConstructor @RestController @RequestMapping("/api/admin/admin-home") @Profile("dev")`. Class is **package-private** (matches `MetadataControllerDev`, `ContentControllerDev`). Single endpoint:
  - `GET /tiles` → `ResponseEntity<List<AdminHomeTileResponse>>` (200 with array; empty array if migration ran but no tiles seeded — defensive only).

**Backend convention reference doc**: see `edens.zac.backend/docs/handoffs/2026-05-04-admin-hub-backend-conventions.md` (companion file written for this spec) for the full rationale, including why the spec's earlier draft used the wrong package + DAO name.

## Action Box: Clear Cache server action

The codebase uses parameterized cache tags (`collection-${slug}`, `collections-type-${type}`, `collections-location-${slug}`) plus a fixed set of metadata tags. Enumerating the parameterized ones requires knowing every slug. The pragmatic "Clear Cache" implementation uses `revalidatePath('/', 'layout')` which nukes both the data cache and the full route cache for every page under the root layout — this is a superset of all per-tag revalidations and matches the user-facing "Clear Cache" intent.

`actions.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';

export async function clearCacheAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
```

Client side (`AdminActionBox.tsx`):
- Button with loading state.
- On click: invokes `clearCacheAction()`, awaits result.
- On success: also calls `collectionStorage.clearAll()` to drop sessionStorage on the current tab; renders a transient success message.
- On failure: renders the error message.

**Reference:** the existing `revalidateCollectionCache(slug)` and `revalidateMetadataCache()` helpers in `app/(admin)/collection/manage/[[...slug]]/manageUtils.ts` (lines 243 and 268) are the per-context revalidation patterns; this action is intentionally broader.

## Testing strategy

**Unit / integration (frontend):**
- `tests/proxy.test.ts` — **create new file**. The middleware `proxy.ts` currently has zero direct test coverage (`tests/api/proxy/route.test.ts` covers the BFF route handler, NOT the middleware). New tests must cover BOTH the new rules and a regression net for the existing rules: local `/` → `/admin` (307); local `/admin`, `/admin/foo`, `/homePage` passthrough; non-local `/admin`, `/admin/foo`, `/homePage` → `/`; non-local `/` passthrough; existing `/cdn`, `/catalog`, `/comments` rules still pass; non-matching paths fall through to `NextResponse.next()`.
- `tests/app/(admin)/admin/page.test.tsx` — render server component with mocked `getAdminHomeTiles()`. Assert all 10 tile labels render with correct hrefs; disabled tile has no link element; tiles with null `coverImageUrl` render placeholder.
- `tests/app/(admin)/admin/AdminActionBox.test.tsx` — Clear Cache click invokes the server action mock + `collectionStorage.clearAll`; success toast renders; failure path renders error.
- `tests/app/(admin)/admin/AdminHubGrid.test.tsx` — given a tile array, renders the right number of `<Link>` elements with correct hrefs; uses `useParallax` ref.
- `tests/app/(admin)/admin/adminTiles.test.ts` — every tile has unique `tileKey`; every `tileKey` matches a row in the migration's INSERT statement (string-match the migration file).
- `tests/app/homePage/page.test.tsx` — renders `CollectionPageWrapper` with `slug="home"`.
- `tests/app/lib/api/adminHome.test.ts` — `getAdminHomeTiles()` fetches the right URL, parses the response, throws ApiError on non-2xx.

**Unit / integration (backend):**
- `AdminHomeTileRepositoryTest` — `@JdbcTest` slice. Seed a `content_image` row (must populate `image_url_web` since it's NOT NULL) + 1 `admin_home_tile` row with `cover_image_id` set; assert `findAllWithCover()` returns the expected projection with the `image_url_web` value as `coverImageUrl`. Add a NULL-cover case (tile row with `cover_image_id` IS NULL → `coverImageUrl` is null).
- `AdminHomeServiceTest` — Mockito unit test mapping repository results to response DTOs.
- `AdminHomeControllerDevTest` — `@WebMvcTest` with `@ActiveProfiles("dev")`. Verifies GET `/api/admin/admin-home/tiles` returns 200 with the expected JSON shape, AND that the endpoint is **not** registered when `@ActiveProfiles("prod")` (defensive — confirms `@Profile("dev")` gating).

## Manual verification checklist

1. **Local `/` redirect:** `npm run dev`, visit `localhost:3000/` → URL changes to `/admin`, hub renders with parallax tiles.
2. **Tile navigation:** click each enabled tile, confirm it lands on the correct existing page; click About Me tile, confirm no navigation occurs (disabled).
3. **Home preview:** visit `localhost:3000/homePage` → home collection renders identically to the previous home page behavior.
4. **Cover images:** after running migration + seeding a few `cover_image_id` values via SQL, reload `/admin` → those tiles show the chosen images; tiles without covers show the placeholder.
5. **Clear Cache:** click button → success toast appears; navigate to a collection that was previously cached → fresh fetch occurs (verify via Network tab that the request hits the backend, not an in-memory cache).
6. **Prod gating:** build with `NODE_ENV=production NEXT_PUBLIC_ENV=production`, start, visit `/admin`, `/admin/foo`, `/homePage` → all redirect to `/`; visit `/` → home renders normally (no admin redirect).
7. **Type-check + lint clean:** `tsc --noEmit`, `eslint --fix`, `stylelint --fix` on changed files; backend `mvn verify` passes.

## Out of scope / Backlog

These are tracked as separate follow-up tickets — not implemented in this work:

1. **About Me edit page** — full design via the "Approach C" pattern from brainstorming: store the bio as a special `about` collection of TextBlock content, edited through the existing `/collection/manage/about` page. Tile placeholder ships disabled in this work; the backlog ticket should reference this design doc.
2. **Edit Admin Cover Images (editor UI)** — inline cover-picker in the admin hub. Adds `PUT /api/admin/admin-home/tiles/{tileKey}` and an `AdminTileImagePicker` modal listing all images. Set covers without touching SQL.
3. **Additional Action Box items** — `Resync Memory Palace`, `Regenerate Sitemap`, granular cache-tag clears (e.g. just `'collections'`). Pattern is already extensible via a similar config array.
4. **Non-local admin access** — gating `/admin` behind `ADMIN_TOKEN` like `/comments` already is. Trivial proxy.ts edit when needed.
5. **Dynamic per-tile cover sourcing** — e.g. Client Galleries tile shows the most recent gallery's cover image automatically. Static seed for v1; smarter sourcing later.

## Spec coverage checklist

Mapping each spec section back to the original feature request:

| Original requirement | Spec section |
|---|---|
| Local only | Routing & redirect (proxy.ts gating) |
| One stop page for all admin items | Frontend file structure + Tile data model |
| Looks like home page (parallax containers, same general layout) | `AdminHubGrid` using `useParallax` |
| Localhost `/` → admin page | proxy.ts rule 2 |
| `localhost:3000/homePage` for regular home | `app/homePage/page.tsx` + proxy.ts rule 1 |
| Home Page (regular) link | Tile `home` → `/homePage` |
| All Images Page link | Tile `all-images` → `/all-images` |
| Metadata page link | Tile `metadata` → `/metadata` |
| Contact Messages page link | Tile `comments` → `/comments` |
| About Me page (potential) | Tile `about` (disabled placeholder) + Backlog ticket #1 |
| Blog page link | Tile `blogs` → `/collectionType/blogs` |
| Client gallery home (no password) | Tile `client-galleries` → `/collectionType/client-gallery` |
| Text box with Create Collection / Clear Cache | Action Box (Clear Cache) + tile `create` for Create Collection |
| Multiple backend API calls or new dev-only API | New `GET /api/admin/admin-home/tiles` endpoint (dev-profile-gated) |
| `if dev` redirect logic | proxy.ts rules 1 & 2 |

**Plan-task → spec-section mapping** (for the writing-plans phase):

| Implementation task | Spec section |
|---|---|
| Add proxy.ts rules + matcher entries | Routing & redirect |
| Create `app/homePage/page.tsx` | Frontend file structure |
| Create `adminTiles.ts` config | Tile data model |
| Build `AdminHubGrid` component + SCSS | Frontend file structure |
| Build `AdminActionBox` + Clear Cache server action | Action Box |
| Create `app/lib/api/adminHome.ts` client + types | Tile data model (API shape) |
| Wire `app/(admin)/admin/page.tsx` Server Component | Architecture / Frontend file structure |
| Backend: V19 migration + seed | Backend changes |
| Backend: Entity + DAO + Service + Controller | Backend changes |
| Tests (frontend + backend) | Testing strategy |
| Manual verification | Manual verification checklist |
